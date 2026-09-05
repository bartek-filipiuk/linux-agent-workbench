<claude-mem-context>

</claude-mem-context>

## Mapa terenu (2026-09-04)

### Architektura
- `packages/protocol` — Zod schemas + framed Unix-socket protocol (u32 len, u8 kind: 0 JSON, 1 PTY out, 2 keys, 3 browser JPEG frame). `FramedConnection` in `src/node/connection.ts`.
- `services/agentd` — the daemon (Electron utilityProcess). `ipc.ts` (`Daemon`) routes main-process messages; `orchestrator/run-controller.ts` runs the model loop; `policy/*` decides what a tool call may do; `session/*` owns the podman containers; `egress/*` is the HTTP proxy the containers use for all network traffic; `maintenance/*` is startup cleanup (idle containers); `storage/store.ts` is SQLite (node:sqlite, WAL).
- `services/terminal-worker` — node-pty + tmux inside `law-terminal-<session>`; bash gate (`images/terminal/gate.c`, a static binary → `gate.sock` → agentd `gate.check`).
- `services/browser-worker` — Playwright Chromium inside `law-browser-<session>`; screencast frames, DOM-walk observation, ref-based actions.
- `apps/desktop` — Electron 44 + React 19 + xterm.js; `main/index.ts` spawns agentd and forwards IPC, `renderer/*` is the UI.
- `images/<name>/` — Containerfile + `image.json` (pinned image id). `scripts/build-image.sh <name>` builds, prunes, checks disk.

### Przepływy krytyczne
- Run: renderer `run.start {goal, profile, maxTurns}` → `Daemon` (profile → prompt rules, model, compactEvery) → `RunController` (context compaction every N turns) → `OpenAIResponsesAdapter` → tool call → policies (`LeasePolicy`, `CommandGate`, `NestedPromptPolicy`, `BrowserActionPolicy`) → executor (`tools/terminal-tools.ts` | `tools/browser-tools.ts`) → worker socket → result back to the model; events to `Store` and the UI.
- Approval: policy → `ApprovalManager.request` (TTL 120 s) → `approval.request` to the UI → `ApprovalCard` (y/n, once/session/deny) → `approval.decide`.
- Handoff: a policy returns `LEASE_DENIED` with `handoff`, or the model calls `request_human` → run state `handoff`, both leases go to the human, no observations reach the model until "Give control back".
- Browser observe: `BrowserSession.walkFrames` (main frame, then every iframe, refs `e<n>` bound to `revision`) → `observationHints` (login_form, captcha, two_factor) appended by `browserExecutor`.
- Shell gate: bash DEBUG trap → `/opt/law/gate` (static C, ~2 ms round trip) → worker → agentd `classify` (auto/log/approval/deny) → `ApprovalManager`; the gate waits `LAW_GATE_TIMEOUT_MS` (605 s), longer than any approval TTL.
- Egress: tool → `127.0.0.1:3128` (forwarder in the worker) → `/run/law/egress.sock` → `EgressProxy` in agentd (`SessionEgress` per session) → host DNS + private-range check → upstream; decisions in `egress_log`.

### Konwencje
- Tests next to the package in `test/*.test.ts` (vitest 4); fixtures in `fixtures/`; container tests in `tests/container/` run only with `LAW_CONTAINER_TESTS=1`.
- Errors cross the socket as `ProtocolError(code)`; codes live in `packages/protocol/src/errors.ts`.
- Policies implement `Policy.authorize(call, ctx) → PolicyDecision`; new rules go into `policy/rules.ts` (shell) or `policy/browser-policy.ts` (browser) with a `Rule { id, category, summary, noSession? }`.
- Approval categories are the `ApprovalCategory` enum in `packages/protocol/src/run.ts`; labels in `apps/desktop/src/renderer/labels.ts`.
- Commits in English, no AI footer.

### Pułapki
- Node 24 is required (node:sqlite); nvm default is 20. Run tools with `PATH=~/.nvm/versions/node/v24.20.0/bin:$PATH`.
- Worker code runs from the image: after changing `services/*-worker`, run `scripts/build-image.sh <terminal|browser>`; the app recreates the container when the pinned id differs.
- A killed browser container leaves `SingletonLock` in the profile volume; the worker removes it on start.
- Headless shell gets 403 from x.com and friends: the container runs full Chromium (`LAW_BROWSER_CHANNEL=chromium`) with a stock UA.
- reCAPTCHA and similar widgets live in cross-origin iframes; observation walks frames, bounds are page coordinates.
- Containers run with `--network none`; a tool that ignores `HTTPS_PROXY` has no network at all. ssh works only through the shipped `ProxyCommand`.
- Never type into the user's live Claude Code session in the sandbox terminal.
- The OpenAI key lives in the OS keyring (`settings.json` → `openaiKeyEncrypted` via safeStorage); `.env` keeps only model and prices after the first start.

### Jak dodać feature
- New model tool: spec + executor in `services/agentd/src/tools/`, `previewOf` label, a policy if it has side effects, a test with a fake manager.
- New approval rule: `Rule` in the right policy file, a test in `services/agentd/test/*-policy.test.ts`, a label if the category is new.
- New UI state: `apps/desktop/src/renderer/App.tsx` owns state; panels are `TerminalPanel`, `BrowserPanel`, `RunDrawer`.

### Weryfikacja
- `PATH=~/.nvm/versions/node/v24.20.0/bin:$PATH pnpm -r build` — all packages compile.
- `PATH=~/.nvm/versions/node/v24.20.0/bin:$PATH npx vitest run` — expected: all files pass, container tests skipped.
- `LAW_CONTAINER_TESTS=1 npx vitest run tests/container` — needs both images built.
- `pnpm dev` — starts Electron; agentd logs are prefixed `[agentd]`.
- Benchmark (desktop app closed): `node scripts/bench.mjs --model <id> --runs 3` runs `scripts/bench-goals/search-summary.txt` headlessly and validates the artefact; `node scripts/bench-report.mjs 6 --prices IN,OUT` prints wall/model/tool/human time, turns, cached share and cost. Clear the sandbox screen between runs (the harness does); a stale `wc` line on screen lets a model skip the work and still "answer".
