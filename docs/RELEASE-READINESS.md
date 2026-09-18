# Source-release readiness

Updated September 18, 2026. This is one source-build Linux application in the existing [linux-agent-workbench repository](https://github.com/bartek-filipiuk/linux-agent-workbench). Classic, Hybrid, First and Auto share the desktop, daemon, workers, session, permissions and Stop. The public integration retains the original benchmark commits in Git history; the First baseline must remain reachable for reproduction.

## Requested release work

| Item | Status and evidence |
| --- | --- |
| License and provenance | MIT license at the repository root and in workspace package metadata; contribution terms and third-party notices included. Native upstream license texts and installed pnpm license metadata are retained |
| One integrated application | Complete Jev/OpenRouter/Auto lineage prepared as one integration into main, preserving earlier commits with a merge commit. The repository's PR/check history records the final hosted CI and merge state |
| Clean user/machine installation | **Pending, assigned to the owner.** No clean-install pass is claimed. Use the [checklist](CLEAN-INSTALL-CHECK.md) |
| Portable benchmark runner | Active scripts use repository-relative paths and explicit environment overrides. Bootstrap builds the immutable pinned baseline and native environment; checks source/build hashes; Flights requires an explicit future date shared by prompt/verifier |
| English publication material | README highlights the measured gains with sample sizes, counterexamples and clock limits. Current guides, complete historical archive and chart labels are in English. Original multilingual prompts/page text remain unchanged in raw evidence |
| Offline CI | Typecheck, build, full suite, benchmark contract tests, deterministic browser fixtures, rendered UI checks, report regeneration, documentation links and dependency audit; model calls are not part of routine CI |

The integration branch was `release/jev-auto-source`, based on the completed `experiment/jev-auto` branch at `16b1130`. There is no need to separately merge the older Jev branch or ship the native PoC as another desktop application. MIT was selected as the default permissive project license; third-party code and content retain their own terms.

## Validation performed for this change

- Frozen application suite: **452 passing, 12 skipped**; typecheck/build passed on the developer environment.
- Portable harness: **5 offline contract tests** covering invalid dates, requested date/year verification, portable paths, refusal to reset a wrong baseline, and invalid CLI budgets/options.
- Native source bootstrap: fresh cache created from pinned sources and lockfiles; source/build verification passed; **31 upstream offline tests** passed.
- Changed-data browser fixtures passed positive and negative checks; rendered follow-up/recovery UI fixture passed.
- All four engines completed a one-repeat local search smoke through the new portable runner. This is a runner integration check, not a replacement performance comparison. [Recorded smoke](validation/source-release/portable-smoke.json).
- Dependency audit reported no known vulnerabilities at this point in time. License metadata and scoped credential/history checks have separate scope; none is a comprehensive security certification.

[Local validation record](validation/source-release/checks.json) and logs retain outcomes. Hosted CI remains authoritative for the commit being merged; inspect the repository's Checks rather than assuming a local pass is a hosted pass. The smoke's recorded source hashes and dirty flag identify its working-tree state. Documentation/CLI validation changes do not retroactively change the frozen benchmark or its reported timings.

The four additional smoke attempts cost about $0.011 in returned usage and Jev estimates; their exact cost is in the validation record. They are **outside** the historical 606-record archive and its $11.05 ledger. No new comparative speed claim is based on these four attempts.

## Run and reproduce

- [Application setup and routing](APPLICATION.md)
- [Pinned benchmark bootstrap and live-run options](BENCHMARKS.md)
- [All historical measurements and costs](research/README.md)
- [Owner-run clean installation checklist](CLEAN-INSTALL-CHECK.md)
- [Security boundaries](../SECURITY.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)

The default standard profile still uses the source-build Electron configuration directory; experimental instance scripts remain optional. Setup does not silently migrate credentials or profiles. The app retains Classic as the fresh-install default and Auto as experimental.

## Remaining product work

A unified provider/key setup in Settings would remove manual private `.env` editing. Broader evaluation is still needed for logged-in sites, complex dynamic interfaces, frames, uploads and long-running tasks. Shared-profile, shell-descendant and optional remote-approval limitations remain documented in SECURITY.md. Container/browser OS dependencies need their own review beyond pnpm audit.

There is no verified installer, signing/update pipeline or cross-platform distribution matrix. A future binary release needs a license/notice inventory of its actual bundled dependencies. The existing storage ceiling also needs consideration on hosts sharing Podman storage with other projects. These are distinct from publishing a working Linux source release.

Until the owner returns the clean-install checklist, that item stays pending. Do not relabel developer-machine tests, CI or the isolated benchmark bootstrap as a clean desktop installation pass.
