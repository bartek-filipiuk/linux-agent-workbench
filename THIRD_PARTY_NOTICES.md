# Third-party notices and provenance

Linux Agent Workbench's original source and documentation are licensed under [MIT](LICENSE). This does not replace the licenses of dependencies, downloaded upstream projects, website content, logos or recorded third-party page screenshots.

## Browser research references

The benchmark uses two separately downloaded, pinned projects:

| Project | Revision used in the historical comparison | License notice |
| --- | --- | --- |
| [Jev Ultrafast](https://github.com/browser-use/jev-ultrafast) | `452c1ad2dd628008f1d5608f28158d76e49e6cc0` | [MIT, copyright 2026 Browser Use](docs/licenses/jev-ultrafast-MIT.txt) |
| [Browser Use](https://github.com/browser-use/browser-use) | `d8110c5ff87ccba887aaa726cdb780f2f84bef8d` | [MIT, copyright 2024 Gregor Zunic](docs/licenses/browser-use-MIT.txt) |

The native project trees and Python environment are not committed or shipped as desktop runtime dependencies. The benchmark bootstrap downloads them into an ignored cache and keeps their license files. The local benchmark adapters, fixtures and retained measurements are project-authored research material. The import manifest records the separate local PoC revision, original file hashes and documentation transformations. The upstream source-file pins are retained in [sources.json](docs/benchmarks/browser-poc/sources.json).

The app's Jev HTTP client and guarded orchestration are in this repository; it does not embed the native Ultrafast agent or Browser Use runtime. The research design draws on their published behavior and benchmarks, with pinned attribution in the reports. Nothing here grants rights to providers' names, trademarks or services, or represents their endorsement.

## Package and platform dependencies

[Installed pnpm dependency license metadata](docs/dependency-licenses.json) was recorded on September 18, 2026 using `pnpm licenses list --json`. It includes MIT, Apache-2.0, BSD, ISC, MPL-2.0 and CC-BY-4.0 entries. In particular, Lightning CSS packages retain MPL-2.0 and caniuse-lite data retains CC-BY-4.0. Preserve applicable source/license/attribution notices when distributing those dependencies; the project's MIT license does not relicense them.

The inventory is scoped to the installed Linux pnpm workspace. It does not certify every platform's optional packages, the Python benchmark environment, container OS packages, Chromium or external Codex CLI. The lockfiles and downloaded packages remain the source for dependency-specific license texts. Electron, Playwright, React, xterm and other components retain their upstream notices.

This release publishes source. A future binary/container distribution must collect its actual bundled dependencies and notices, review source-distribution obligations and preserve the notices supplied by Chromium/Electron and the base OS. A source-level dependency inventory alone is not a binary distribution audit.
