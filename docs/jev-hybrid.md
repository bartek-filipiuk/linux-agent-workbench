# Jev Hybrid experiment

Baseline: `72eaed2` on main. Development: `experiment/jev-browser`, separate worktree.

## Implementation plan

1. Isolate Electron settings, database, sockets, Codex home, container identities, maintenance labels and browser profile with `LAW_INSTANCE=jev`. Keep the default instance backward compatible.
2. Add a host-only TypeSafe client with fixed HTTPS endpoint, no redirects, bounded requests, strict answer validation and cancellation. Store the key outside the repository and agent workspace; never expose it to the renderer or containers.
3. Enrich DOM observations with bounded page text, supported operations, select options and checked/expanded states. Guard selected controls against semantic changes before input.
4. Add `browser_task`: the existing planner supplies an outcome and field values; Jev chooses operations and observed targets. All child tools pass through RunController policy, logging, budgets and cancellation. Unknown action outcomes return to the planner without replay.
5. Preserve existing UI; add Classic / Jev Hybrid beside working style, configuration availability, per-run identity and separate model measurements. Persist the choice across conversation continuation.
6. Verify failure paths (stale targets, approvals, takeover, Stop, budget pause, invalid replies, timeouts, key redaction), run normal project checks, build the browser image, and perform live model/browser and desktop smoke tests.
7. Ship a reproducible alternating comparison harness with independent success checks, timing breakdown, all attempts and no speed claims without results.

## Boundaries

Jev decides; the primary model plans, writes, uses the terminal and handles fallback. No screenshot, CSS, JavaScript or arbitrary shell command is accepted from Jev. Page text is untrusted evidence. Password, OTP and file inputs are excluded. An auxiliary risk prediction cannot grant approval. The existing policy remains authoritative; its label-based classification is not a complete guarantee against malicious sites.

Completion from Jev is a proposal: the planner must independently verify using browser_read/observe before claiming success. Benchmark success is determined by fixture state, never the model's DONE response. Experimental confidence thresholds are heuristics, not calibrated correctness probabilities.

Interrupted parent tool calls are retained in the existing continuation checkpoint and receive an unknown-outcome result on restart. Child actions are journaled individually; neither parent nor child mutations are automatically replayed. Human takeover and budget pauses invalidate pending decisions.

## Sources

- https://docs.typesafe.ai/api
- https://docs.typesafe.ai/concepts/state
- https://github.com/browser-use/jev-ultrafast/blob/main/jev_ultrafast/model.py
- https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md

## Run this version

From the experimental worktree, with Node 24 and pnpm 10:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm images:build:jev
pnpm dev:jev
```

Keep the existing main checkout for the original version. `dev:jev` sets `LAW_INSTANCE=jev`; it does not change XDG roots or Podman storage. In New task choose **Jev Hybrid** under **Browser engine**, and use your existing primary model selection. Classic remains selectable for comparison. The task log shows each child action; progress shows Jev decisions, model time, estimated cost and returns to the planner. Each Jev request counts as a step, and each child tool counts toward the tool limit. Hybrid tasks have a $10 API spending limit, including Jev; subscription usage remains unpriced. Limits are checked between operations, so one request may cross a limit.

On the development machine the worktree is `/home/bartek/linux-agent-jev`, the key and subscription login are configured, and the browser image is already built. Run `nvm use && pnpm dev:jev` there. The original checkout is `/home/bartek/linux-agent`.

Private configuration: `~/.config/linux-agent-workbench-jev/.env` (0600), outside every agent workspace:

```dotenv
LAW_PROVIDER=codex
TYPESAFE_API_KEY=<your TypeSafe key>
TYPESAFE_MODEL=jev-1.13.0
TYPESAFE_PRICE_INPUT_PER_MTOK=0.042
```

On a supported OS keyring the app encrypts the TypeSafe key in settings and removes its plaintext `.env` line. Otherwise it stays in the private configuration. Only availability reaches the renderer. The price is a configurable estimate, not invoice data. No paid OpenAI fallback is introduced. Sign in to Codex in this isolated instance if no subscription login is present.

Instance data:

| Resource | Jev instance |
|---|---|
| Electron settings | `~/.config/linux-agent-workbench-jev/` |
| Database, Codex home, downloads | `<XDG_DATA_HOME>/linux-agent-workbench-jev/` |
| Sockets | `<XDG_RUNTIME_DIR>/linux-agent-workbench-jev/` |
| Browser profile | `law-browser-profile-jev` volume |
| Container ownership | `law.app=jev`, separate workspace-derived IDs |
| Browser image tags | `localhost/law-browser-jev:*` |

Named builds do not prune original LAW images. A branch/worktree alone does not isolate application state. Avoid opening the same writable project in two agents at once: isolated containers can still edit the same host workspace if you select it in both.

## Comparison

[Measured results, 2026-09-17](benchmarks/jev-2026-09-17.md): 80/80 successful fixture attempts, but no general speed advantage (median paired ratio 1.01×). Hybrid had zero Jev decisions in 28/40 attempts. Full metrics and traces are included; this remains an experiment.

```sh
pnpm build
node scripts/check-jev-fixtures.mjs
node scripts/bench-jev.mjs --runs 5 --output /tmp/jev-comparison.json
node scripts/bench-jev-report.mjs /tmp/jev-comparison.json
```

Options: `--scenario search|filters|autocomplete|form|navigation|tabs|scroll|disclosure`, `--model`, `--effort`, `--codex-home`, `--config`. The benchmark uses the same primary subscription model in both modes. It reads the TypeSafe key from the environment/private config, or uses an anonymous pipe from Electron to read the OS keyring; keys never appear in reports. Headless environments without a desktop keyring can supply `TYPESAFE_API_KEY`.

The harness verifies all eight fixtures deterministically before spending model quota. Each attempt uses a fresh Chromium profile and a fixed viewport. The task names the exact starting URL, and browser requests are restricted to the fixture server in both modes. Order alternates across repeats. Timings start after browser startup and initial navigation (reported as `setupMs`) and end after an independent rendered-content check. Every attempt is retained, including timeouts, denied actions and fallbacks. SIGINT/TERM stops the current run and saves partial results. This is a comparison of Classic and Hybrid on the experimental code; it is not a measurement against unmodified main. Host Chromium measurements exclude Podman and Electron startup. Container and desktop integration are checked separately. Tiny fixture samples do not establish general web reliability or calibrated confidence.

The planner can choose ordinary tools and receives control again when Jev is uncertain, unavailable or unsupported. A Hybrid run with zero Jev decisions is counted as such, not presented as Jev acceleration. Full desktop automation, screenshot-only interfaces, arbitrary generated text inside Jev, and recursive shadow-root traversal are outside this initial browser driver; existing model tools remain available for these cases.

## Verification commands

```sh
pnpm typecheck
pnpm test
pnpm build
LAW_INSTANCE=jev LAW_CONTAINER_TESTS=1 pnpm exec vitest run tests/container/browser-container.test.ts
```

The storage guard measures the entire host Podman store. If its 14 GB ceiling is exceeded after a successful image build, the image may still have been created and pinned; inspect the reported image and existing storage before rebuilding. Do not prune the baseline merely to make an experiment's storage check pass.

Verified on 2026-09-17: typecheck and build passed; the normal suite passed 404 tests (12 skipped), and all four browser-container integration tests passed against the pinned experimental image. UI checks covered engine selection, persistence, missing-key blocking, live metrics and 1400/1024 px layouts. A real Electron → daemon → container → Codex/TypeSafe task completed and reached the expected IANA page. Stop, takeover, delayed approval, failed mutation, stale targets and invalid provider replies have regression coverage.

The image build completed and its container tests passed, but the build command returned exit 3 at its final global storage check. After removing the superseded experimental image, the host store measured 22.34 GB, including retained remapped layers and existing images. The original images were preserved. This does not prevent launching the already built app.

### Additional verification, 2026-09-17

An explicit driver check dispatched each fixture goal directly to `browser_task`, using the real TypeSafe API, real browser and RunController policies, with no primary-model fallback. Jev reached the independently checked result in **7/8** scenarios. Navigation stopped after the first link with `uncertain_operation`; the Installation guide was not opened. Tabs reached the expected article but also returned low confidence to the planner. These are recorded limitations, not successful self-verification by Jev. One attempt per case does not establish a reliability rate. [Full driver results](benchmarks/jev-driver-2026-09-17.json).

To reproduce this additional check (uses the configured TypeSafe key and incurs API usage):

```sh
pnpm build
node scripts/check-jev-driver.mjs /tmp/jev-driver-check.json
```

The desktop check repeated a live Hybrid task through Electron, daemon and browser container; it reached the expected IANA page with two Jev decisions. Stopping a subsequent task reached `stopped` in 227 ms. Starting a new Classic task afterwards completed successfully with no Jev statistics and no renderer errors. The test waits for a new run ID before inspecting its outcome; reading the previous run's terminal state is insufficient. [Desktop results](benchmarks/jev-desktop-2026-09-17.json).

Additional regression cases cover cancelling oversized response streams, rejecting oversized context before any provider call, and returning to the planner after repeated actions make no progress. The final regression suite passed **407 tests** (12 skipped). The UI smoke check again passed engine selection, preference persistence, missing-key blocking and compact layouts.
