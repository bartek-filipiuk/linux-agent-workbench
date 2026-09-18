# One application: release readiness

Reviewed September 18, 2026. This is a concrete handoff for the current source; it does not declare a production-ready or packaged release. Repository: [bartek-filipiuk/linux-agent-workbench](https://github.com/bartek-filipiuk/linux-agent-workbench). Read-only GitHub inspection confirmed that it is public, its default branch is `main`, and its license metadata is empty. Remote `main` was `72eaed24131d548d70da992a589edf7dbca33b6c` at review time.

## What is already one application

`experiment/jev-auto` contains the existing desktop/daemon/workers plus OpenRouter, Jev Hybrid, First and Auto. Before this documentation consolidation it was 22 commits ahead of main, with main as its merge base. It already includes the `experiment/jev-browser` baseline. **There is no need to merge both experiment branches independently or copy one application into another.** Keep older branches/tags as measurement references.

The canonical release candidate should come from `experiment/jev-auto` through one reviewed integration PR into the existing repository. Preserve Classic for users without Jev credentials and keep Auto explicitly experimental initially. Keep historical Hybrid/First as advanced comparison modes until there is evidence to remove them. A later UI simplification is optional and must not erase reproducibility.

Native Browser Use and Jev Ultrafast are research references, not application runtime dependencies. Their retained source/results live in the research archive. Shipping the application does not require their Python environment, vendored checkouts or a second window. `pnpm dev`, `dev:jev` and `dev:auto` launch the same app with different instance settings; the normal release needs one standard profile.

## Required before calling the source release open source

| Work | Current evidence | Completion criterion |
| --- | --- | --- |
| Select and add a license | No root `LICENSE`; repository/license metadata empty | Owner chooses terms; add full license, consistent package metadata and contribution wording. Review provenance and third-party notices; do not assign a license to upstream code implicitly |
| Integrate the completed branch | Remote main does not contain Jev/OpenRouter/Auto; all are together on `experiment/jev-auto` | Review the cumulative diff, repeat checks on the actual candidate, merge one PR and tag that exact revision |
| Verify source installation without developer state | Local app/container/UI tests passed; no recorded clean-user install | Clean clone with no sibling checkouts, no maintainer settings/node_modules/images; build both images, configure own keys, exercise Classic and Auto, Stop, restart and follow-up |
| Review publication payload and history | Existing targeted secret audits passed; this pass consolidates public evidence | Scan the exact candidate and reachable history, including compressed evidence; inspect screenshots/logs and dependency/provenance notices. Keep private settings, databases, profiles, raw account totals and credentials excluded |
| Run CI on candidate | A pinned GitHub Actions workflow already exists | Typecheck, tests, build, UI fixture check and dependency audit green for the integration commit; record separately which real-container/live tests were run |

License choice is the only owner decision in this list that cannot be inferred from working code. Public visibility is not a license grant. This documentation pass does not choose a license, push changes, merge a PR or publish a release.

## Repository/code work for a reproducible research release

The results are now readable in one checkout, with [all results](research/ALL-RESULTS.md), an English [research guide](research/README.md), source JSON/archives, CSV and a cost ledger. Offline regeneration uses relative paths and does not require credentials. New live benchmark execution still needs the following engineering work:

1. **Remove machine-specific imports from the benchmark harness.** `experiments/browser-auto/run.mjs`, `tasks.mjs` and `decisions.mjs` contain `/home/bartek/linux-agent-jev` and `/home/bartek/linux-agent-browser-poc`. Introduce validated CLI/environment paths and explicit pinned reference setup. Keep the baseline immutable; do not silently replace it with the candidate app just to make imports work.
2. **Provide a pinned reference bootstrap.** Materialize baseline `77846cb`, native upstream revisions from the archived `sources.json`, their lockfile/environment and a compatible Chromium. Verify source hashes before running. Keep vendors, virtualenvs and output private/ignored. The archived PoC scripts preserve provenance but are not a portable installer.
3. **Make live-task parameters explicit.** Flights currently uses September 20, 2026. A future-date option and matching verifier must be recorded in every new run. Changing it begins a new series; archived results remain byte-for-byte unchanged.
4. **Separate default offline CI from paid execution.** Add portable fixture/routing-schema checks to routine CI where appropriate. Live provider tests remain explicit and budgeted; no requirement for contributor API keys in ordinary CI. Record clean-machine/container outcomes rather than treating the existing local image as distributable.

This work is required before advertising one-command public benchmark reproduction. It is not evidence that the desktop runtime depends on those absolute paths. Production `apps/`, `services/` and `packages/` use the shared in-repository code.

## Product hardening and packaging, separate from source publication

| Priority | Item | Scope / acceptance |
| --- | --- | --- |
| High usability | Unified provider/key setup | OpenRouter and TypeSafe currently require private host configuration. A Settings flow should show billing mode, key storage, connection errors and explicit model selection without exposing credentials to the renderer |
| Reliability | Wider Auto evaluation | Logged-in sites, dynamic forms, frames, uploads, long-running tasks and realistic error cases; report success/latency/cost before changing defaults or claiming broad reliability |
| Security hardening | Existing known boundaries | Review shell descendants, worker protocol, shared profiles and optional remote approvals; see SECURITY.md. Do not present rootless containers as full isolation against all hostile code |
| Build portability | Images and storage | Image IDs are machine-specific; clean builds must generate local IDs. Review the global 14 GB storage-ceiling behavior that returned exit 3 on this developer host despite a working image |
| Binary distribution | Installer/release pipeline | Current scripts compile/develop the app; no verified installer, signing, updater or distribution matrix. Add these only when publishing binaries |
| Maintenance | Supported versions and release policy | State supported Linux environment and external runtime versions; review browser/container OS packages in addition to npm dependencies |

An honest first milestone is a **Linux source release with experimental Auto**, installation instructions and recorded limitations. A polished installer and wider production guarantees are subsequent milestones. No Browser Use rewrite is a prerequisite.

## Proposed integration sequence

1. Keep the frozen measurements and this documentation intact; choose license terms.
2. Prepare a release branch from the completed Auto branch. Fix portable benchmark setup there if research reproduction is part of the release promise.
3. Run a clean-user installation and the documented offline checks; rebuild workers before container/UI tests. Correct any observed failures, then rerun the affected checks.
4. Audit the exact candidate files/history; review license/dependency notices and docs. Review the cumulative PR against the current remote main, not only the most recent Auto commit.
5. Merge the single integration PR, tag the validated revision and publish source-release notes distinguishing tested behavior from experimental limits. Preserve baseline revisions and evidence.

Any runtime changes after the benchmark freeze need their own validation. Do not relabel historical measurements as results from a new release commit. Documentation-only consolidation does not justify spending API credits on the same comparisons again.
