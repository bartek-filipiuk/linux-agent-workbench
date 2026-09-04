# T2 — Browser stage: what has to be built

Status: breakdown for planning, 2026-09-04. Each milestone below gets its own bite-sized plan
(`docs/superpowers/plans/…-t2-mN-*.md`) when it starts. Parent: spec §3.4, §4.2, §5.4, §6.2, §9,
§10.4 and the architecture document §3.2, §9.

## Principle

The browser is a second surface of the same run, not a second agent. Same `RunController`, same
system prompt (extended by one paragraph), same tool registry (five `browser_*` tools next to the
`terminal_*` ones), same lease/approval/handoff machinery. The browser worker is a second rootless
container that never sees the workspace except `/downloads`, never sees the LLM key, and shares
nothing with the terminal container but the run.

## Milestones

### B1 — Spike: screencast to canvas and input forwarding (the UX risk)

- `services/browser-worker`: Playwright + pinned Chromium, `launchPersistentContext(profileDir)`,
  `page.screencast.start({ onFrame })` → JPEG frames as kind-3 raw frames over the existing
  `FramedConnection`.
- agentd forwards frames to Electron main → renderer canvas; adaptive rate (8–15 fps while input is
  active, 1–2 fps idle), drop stale frames.
- Renderer: `BrowserPanel` next to `TerminalPanel` (split, each maximisable), mouse/keyboard events
  mapped from canvas to viewport and sent as kind-4 raw input frames when the human owns the browser
  lease.
- Exit: the user types into a login form on a local fixture page through the canvas; latency feels
  usable; the profile survives a container restart.

### B2 — Browser worker image and runtime

- `images/browser/Containerfile`: Playwright's own image tag pinned by digest, non-root user, seccomp
  from Playwright docs, no `SYS_ADMIN`.
- `PodmanRuntime` spec for the browser container: `law-browser-<sessionId>`, volumes
  `law-browser-profile-<profile>` (0700), `/downloads` per session, workspace read-only only when a
  run needs upload/download, `--network` per profile policy.
- `BrowserSessionManager` mirroring `TerminalSessionManager`; Daemon starts both containers for a
  workspace, each with its own status, socket dir and lease surface.
- Container tests: no keys in env, profile persists, downloads land only in `/downloads`.

### B3 — Observation and actions

- `browser.observe` → `BrowserObservation { revision, activePageId, url, title, viewport, screenshot: ImageRef,
  elements[{ ref, role, name, text, enabled, editable, bounds }], pages[] }` from Playwright's ARIA
  snapshot + a JPEG screenshot stored in the artifact store (content-addressed file, DB row).
- `browser.act` with the discriminated union from the spec (`navigate`, `click`, `type`, `press`,
  `select`, `mouse`, `switchPage`, `closePage`, `upload`, `wait`); `ref` + `revision` must match or
  the worker replies `STALE_OBSERVATION` and the model must observe again.
- `browser.wait` (network idle / selector / text, like `terminal_wait`), `browser.downloads`, `browser.trace`.
- URL normalisation with `new URL()`, scheme allowlist `http(s)` for model-initiated navigation.
- Tests: fixtures site (form, popup, download, upload, SPA, iframe, stale DOM) served from
  `fixtures/websites` inside the browser container.

### B4 — Tools, prompt, policy

- `TERMINAL_TOOLS` + `BROWSER_TOOLS` in one registry; the OpenAI adapter sends both. The observation
  for the model carries the screenshot as an image input only when the screen changed or the model
  asks; text/ARIA otherwise (cost control).
- System prompt paragraph: when to use which surface; page content is data; logins are handoffs.
- Policy: `browser.act` classification — reads are `auto`; `type` into inputs with `password`/OTP
  semantics is `deny` (human types secrets); `press ENTER`/`click` on submit-like elements in forms
  that send, post, pay, delete → `approval` with categories `send`/`publish`/`purchase`/`delete`
  (element name/role + URL heuristics, same `ApprovalManager` and card).
- Domain policy per profile: `open` (private/metadata ranges blocked), `ask` (first visit of a
  domain → approval), `allowlist`; enforced in the worker via Playwright request routing for now,
  egress proxy later (hardening).
- Lease per surface: `terminal` and `browser` independent; the drawer shows both owners.

### B5 — Takeover and logins (X and friends)

- "Take control" on the browser panel: agent lease dropped, screencast to the model paused, human
  input forwarded on a channel flagged `sensitive`; keystrokes never logged; screenshots not stored
  while the human holds the lease.
- Handoff triggers from the model: `request_human` with reason, plus automatic handoff when the
  observation contains a password field focused or a CAPTCHA/2FA heuristic.
- Manual acceptance: log in to X once in takeover, give control back, goal "open my X notifications
  and summarise the last five"; a second goal that would post must stop at an approval card.

### B6 — Hardening for both surfaces

- Egress gateway container (HTTP/HTTPS CONNECT by hostname, private ranges blocked, no MITM) shared
  by both workers; `open` still goes through it.
- `safeStorage` for the OpenAI key, screenshot retention policy, orphan container cleanup,
  diagnostics bundle without secrets, `.deb`/AppImage.

## Estimate

B1 + B2 ≈ 2 sessions, B3 + B4 ≈ 2 sessions, B5 ≈ 1 session with the user present for logins,
B6 ≈ 1–2 sessions. The user's clicking: one login per service, takeover latency judgement in B1,
approval cards in B5.
