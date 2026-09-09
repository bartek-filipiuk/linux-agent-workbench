# Implementation status

Product direction and future features live in [ROADMAP.md](ROADMAP.md). This file records completed work and current release prerequisites; it does not promise delivery dates.

## Implemented

- [x] Codex App Server with dedicated ChatGPT subscription sign-in as the default operator.
- [x] Explicit OpenAI Responses API alternative, with no automatic paid fallback.
- [x] Account-specific model and supported reasoning-effort selection.
- [x] Sandboxed terminal and browser, full manual browser login, tabs/popups and preview recovery.
- [x] Task history, renderer reload hydration, output inspection and tracked Git snapshot restoration.
- [x] Larger growing/expanded goal editor, saved drafts/preferences, stable numeric inputs and explained working styles.
- [x] Unlimited step/tool option, independent time cap and same-live-session continuation at a limit.
- [x] Approval/control protections, stale-action invalidation and manual-login resume blocking.
- [x] Preview visibility gating, terminal/frame backpressure, bounded activity UI and asynchronous diagnostics.
- [x] English user/configuration/contribution/security documentation and provider roadmap.
- [x] Publication review fixes: IPv6/local-address filtering, proxy input handling, renderer IPC/navigation validation, diagnostic redaction and ownership-scoped image pruning.
- [x] English source/example/test cleanup while retaining Unicode coverage through escaped fixtures.
- [x] GitHub repository setup with issue/PR templates, private vulnerability reporting, secret scanning and push protection.

## Before public release

- [ ] Select and add a license; source availability alone is not an open-source license.
- [x] Enable and verify a private vulnerability-reporting channel through the GitHub API.
- [ ] Run a clean-machine installation and both container suites; verify the release's OS/browser/CLI dependencies.
- [x] Review publication content and reachable repository history with selected credential patterns; repeat before future pushes.
- [ ] Add CI and define supported release/update policy.

See [CONTRIBUTING.md](CONTRIBUTING.md#before-publishing) for the publication checklist and [security-review.md](docs/security-review.md) for review evidence and limitations.

## Known follow-up work

- [ ] Provider/account configuration in Settings and supported additional subscription/API adapters.
- [ ] Safe in-memory OAuth transition URLs without persisting token-bearing URLs.
- [ ] Per-workspace/account isolation of browser and nested-agent profiles.
- [ ] Stronger remote-approval authentication and hostile-input resource testing.
- [ ] Accurate model-specific cached-input pricing estimates.
- [ ] Explicit durable continuation after full restart, only after safe provider/state recovery is implemented.

No new provider or Settings feature is part of this publication-preparation change.
