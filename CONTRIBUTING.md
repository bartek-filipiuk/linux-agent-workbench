# Contributing

All source comments, UI text, documentation, examples, issue descriptions and commit messages should be in English. Unicode regression tests remain important; use explicit escaped Unicode fixtures where a non-English character is the point of the test.

The source is hosted on [GitHub](https://github.com/bartek-filipiuk/linux-agent-workbench). License selection remains pending; do not imply contributor terms that have not been selected. Discuss proposed contributions in an issue first. Use [private vulnerability reporting](https://github.com/bartek-filipiuk/linux-agent-workbench/security/advisories/new) for security-sensitive reports.

## Development setup

Use Node 24 and pnpm 10.24.0. Clone the repository, run `nvm install`, `nvm use`, and `pnpm install --frozen-lockfile`. Rootless Podman is needed for the full app and opt-in container tests. Native dependency builds need a compiler toolchain and Python 3.

For local browser-worker tests, install the Chromium revision associated with the pinned Playwright dependency:

```bash
pnpm --filter @law/browser-worker exec playwright install chromium
```

Install any missing system libraries using your distribution's package manager or Playwright's documented Linux dependency setup. Host tests and container images have separate browser installations.

```bash
pnpm typecheck
pnpm test
pnpm build
```

Tests use fake providers unless a command explicitly names a Codex smoke/benchmark operation. Do not run quota-consuming tests or act through a maintainer's logged-in browser as part of routine tests. Opt-in integration checks:

```bash
pnpm images:build
pnpm images:build:browser
pnpm test:container
```

Container tests require an appropriate local Linux/Podman environment. They are skipped by default. If the test runner cannot write under `XDG_RUNTIME_DIR`, run in an appropriate user environment; never use a production socket directory as a test fixture.

Worker changes require rebuilding the corresponding image before live verification. Daemon/renderer changes alone do not require an image rebuild. Building this source tree is not the same as producing an installer.

## Code structure

See [Architecture](linux-agent-workbench-architecture.md). Keep new tools behind the protocol schemas, policies and executors. Provider adapters return tool requests; they must not execute host operations on their own. Backend checks must enforce any security-sensitive restriction shown in the UI.

For a bug fix, include a regression test demonstrating the incorrect behavior and the corrected boundary. Test real failure modes such as stale run IDs, malformed input, missed address forms, socket disconnects and cancellation; avoid tests that only restate implementation details. Prefer synthetic accounts, paths and content.

Preserve the distinction between a running task, a live budget pause and a historical result. Do not silently switch provider, account or billing mode, or claim continued context after a full restart.

## Pull requests

Describe the concrete issue, resulting behavior, relevant checks and any remaining limitation. For visual changes, attach screenshots with synthetic task/account data. For security changes, follow [SECURITY.md](SECURITY.md) before disclosing exploit details publicly.

Do not commit `.env`, credential files, runtime databases, private diagnostics, local screenshots or live browser profiles. `.impeccable/` is local review evidence and intentionally excluded. Generated image IDs in `images/*/image.json` are machine-specific; document intentional image updates and do not assume another developer has those IDs.

Do not add integrations merely by copying credentials from another application. Propose provider mechanisms and authentication lifecycle first, following [ROADMAP.md](ROADMAP.md).

## Before publishing

- [ ] Select the repository license, add its full text and review contributor/provenance requirements.
- [x] Enable GitHub private vulnerability reporting and verify the setting through its API. No test vulnerability report was submitted.
- [x] Review publication files and reachable repository history with selected credential patterns; review staged filenames before pushing. Repeat for each publication. Ignore rules do not remove older commits.
- [ ] Run the documented setup on a clean Linux user/machine with both worker images.
- [x] Run typecheck, tests, build and dependency audit; separately record skipped container tests in [the security review](docs/security-review.md).
- [ ] Review container OS/browser dependencies and the external Codex CLI version; npm audit does not cover them all.
- [ ] Review shared credential/profile limitations, optional remote approvals and shell-gate limitations before choosing release positioning.
- [ ] Add CI, choose a supported release policy and verify distribution/signing when binary releases are introduced.

GitHub issues and pull requests are enabled, with English templates. Secret scanning and push protection are enabled. These settings supplement local review; they do not prove that the repository contains no secrets. Source publication is separate from a packaged release or an open-source license grant.
