# Test catalog and measurement protocol

This catalogs retained experiments, not newly executed tests. Detailed per-attempt results and failure messages are in [ALL-RESULTS.md](ALL-RESULTS.md); canonical input files, counts, hashes and costs are in [inventory.json](inventory.json).

## Experiment stages

| Stage | Cases | Question / interpretation |
| --- | ---: | --- |
| H1, Classic vs optional Hybrid, Sol | 80 | Does optional Jev delegation help? 40/40 completed each; little overall gain |
| H2, Classic/Sol, First/Sol, First/Luna | 72 | Does explicit delegation and a different planner help? 24/24 each; mixes planner and strategy effects |
| H3, Classic/Luna vs First/Luna | 48 | Same-model comparison: 23/24 vs 24/24 |
| H4, local First/Luna, First/Gemini, Classic/Gemini | 72 | Primary-provider/model comparison; inspect per-record model rather than runner defaults |
| H5, first live Flights comparison | 9 | Three configurations × three repeats; distinct from native PoC |
| Earlier diagnostics and pilots | 40 | Provider errors, fixes and two deliberate interruptions; not a final ranking |
| Native PoC final | 102 | 8 local tasks × 3 engines × 3 repeats, plus Flights × 3 × 10 |
| Native PoC diagnostics | 24 | 16 pilots, 7 Stop checks, 1 visible-window smoke |
| Auto selected final comparison | 119 | 11 local/changed-data tasks × 3 engines × 3 repeats, Flights × 4 × 5 |
| Other retained Auto runner records | 40 | 18 records from interrupted original block, 19 pilots, 1 credit check, 1 visible-window smoke, 1 intentional Stop |

Total: **606 runner records**. Separately: **78 Auto routing cases**, **8 direct Jev driver cases**, **24 desktop checks**. Unit suites and repeated full-suite runs are not additional benchmark trials.

## Task definitions and success criteria

| Task | Required observable result | Used in |
| --- | --- | --- |
| Search | Search for `blue notebook`; leave expected product result visible | H1–H4, PoC, Auto |
| Filters | Books category, In stock enabled, then Apply; applied result confirms both | H1–H4, PoC, Auto |
| Autocomplete | Select the actual Paris, France suggestion, not just type Paris | H1–H4, PoC, Auto |
| Contact form | Name Ada, Research department, preview only; no sending | H1–H4 |
| Navigation | Open Documentation, then Installation guide | H1–H4 |
| Tabs | Open reference in new tab and leave its article visible | H1–H4, PoC, Auto |
| Scroll | Find bottom-page More details control and reveal two-year warranty | H1–H4 |
| Disclosure | Expand Shipping and expose three-business-day shipping time | H1–H4 |
| Wizard 6 / 10 | Save all ordered city segments, traveler Ada, Train; stop at final review. Verify each saved record, not just the success heading | PoC, Auto |
| Hotel comparison | Cheapest eligible three-night hotel, breakfast plus free cancellation; save Bello and total EUR 327; no booking | PoC, Auto |
| Hosting research | Visit Atlas, Boreal, Cedar; require ≥20 users, SSO, EU residency; include setup fees and 12 monthly payments; save Boreal, EUR 744 | PoC, Auto |
| Wizard 4, changed data | Oslo, Riga, Tallinn, Helsinki in order, traveler Lea, Train; all records saved | Auto held-out |
| Hotel, changed data | Four nights with changed prices; save Doria, EUR 392 | Auto held-out |
| Autocomplete, changed data | Select Rome, Italy suggestion | Auto held-out |
| Google Flights | One-way Zurich → London, September 20, 2026, one adult, economy; real matching result rows; no selection or booking | H5, PoC, Auto |

Full fixture definitions are in [early fixtures](../../scripts/jev-fixtures.mjs), [Auto tasks](../../experiments/browser-auto/tasks.mjs), [Flights setup/verifier](../../scripts/jev-flights.mjs), and [PoC tasks](../benchmarks/browser-poc/tasks.mjs). The six-stage city order is Basel, Bern, Lucerne, Lausanne, Lugano, Chur; the ten-stage version adds St Gallen, Winterthur, Baden, Thun. These benchmarks do not permit guessed encoded Flights search URLs.

Final PoC and Auto success requires both agent completion and a passing independent verifier. Historical earlier `success` fields retain their original criteria. In the direct-driver test, a correctly opened new tab can count as a functional success despite `needs_help`; the final native PoC deliberately does not count that as autonomous completion. Negative verifier checks reject empty/unsaved fields, incorrect segments, wrong totals and skipped research pages.

## Conditions and clocks

Native PoC and Auto comparisons use Chrome for Testing 151.0.7922.34, Node 24.20.0, Python 3.12.12, viewport 1120×780, en-US and Europe/Zurich. Gemini was `google/gemini-3.8-flash / low` through OpenRouter with upstream `google-ai-studio`; Jev was `jev-1.13.0`. Earlier H-series environment/viewport details remain in their own JSON. Engine order rotates and trials run sequentially.

`taskMs` includes agent work, retries, recovery and final independent verification. `setupMs` is separate and includes browser/driver startup, initial navigation, Flights consent handling and first observation. Final screenshot and cleanup are outside the task clock. Starting Electron/Podman is not part of those runner timings. Provider time is adapter wall time, not pure inference or TTFT. Additive average timing components must not be summed with medians. Success-only medians retain failures in the completion denominator; unmeasured values remain missing.

Earlier PoC Flights repeats 1–5 use fresh profiles; 6–10 reuse the profile from repeat 5, with a fresh Chrome process and reset task fields. This does not isolate cache alone. Latest Auto comparison uses fresh profiles. The live page and provider latency can change over time.

PoC common limits: 240 seconds and $1 reported usage per attempt. Native limits differ: Ultrafast 60 actions, Browser Use 60 steps with up to 5 actions each, app 80 turns / 240 tool calls. Browser Use uses `flash_mode` for mechanical work, planning for reasoning and vision on demand; its additional model judge is disabled in favor of the shared verifier. These are configured comparisons, not equal computational budgets or measurements of every available optimization.

## Frozen Auto sample and interruptions

Production source was frozen at `0ea227b271dbc71b5dc7d503a4a4438e3141c361`; baseline First at `77846cb0d97af218dd8a2832dab9f488c703b210`. Both app variants use the same corrected OpenRouter schema adapter. First's controller/tools/worker remain from baseline. Native source pins and file hashes are in [sources.json](../benchmarks/browser-poc/sources.json); [resumption provenance](../benchmarks/jev-auto/validation/resume-provenance.json) verifies those pins.

The selected 119 attempts are the first six completed task groups (54) from `final-local.json`, the complete restarted research/tabs block (18) from `final-recovery.json`, all 27 changed-data attempts, and all 20 Flights attempts. The interrupted original research/tabs block contains 4 successes and 14 credit failures; **all 18** remain archived and excluded as a block. It is not a success-only retry filter. This selection was declared before resumption. Raw final files contain 137 records. [Summarization code](../../experiments/browser-auto/summarize.py) implements the rule.

## Routing and argument checks

Earlier routing pilots: 12/16 → 15/16 → 16/16, then 6/6 held-out categories. These tested the first tool's expected route; they were not full browser tasks. Two malformed JSON-string batch arguments in each of three pilots were later discovered and retained; routing category alone had not caught them. The object-schema adapter was fixed before the frozen comparison.

Post-fix routing: 13/16 in the original check, including one valid but unexpected planned observation for a new-tab task and two HTTP 429 cases with no model answer. The separate held-out check passed 6/6; targeted retries of only the two rate-limited cases passed 2/2. All 20 returned tool calls in those three files had valid argument schemas. Keep the first result and retry distinct. Actual comparison trace audit found 193/194 valid task/batch calls; one wrong wait field was rejected and corrected, with recovery time included.

There is no separately timed router API call. The main planner chooses the tool during normal inference; its first-call time includes planning. We have not isolated routing overhead through an ablation. Route logs record fast/planned switches, not an external process handoff.

## Functional, security and UI verification

| Evidence | Recorded outcome / boundary |
| --- | --- |
| Latest full suite | 452 pass, 12 skipped; typecheck and build pass |
| Container integration | 4 pass with rebuilt worker image |
| Final desktop smoke | 4/4: Auto navigation, Stop, Classic after Stop, restored follow-up context; 1400×900 and 1024×768 layout |
| Desktop history | Earlier 14 checks plus Auto 10 checks; Auto includes 2 pre-schema-fix failures |
| Visible-window Auto | Search passed in 3.927 seconds |
| Intentional Auto Stop | Browser closed in 129.888 ms; full cleanup 139.134 ms; not a completed task |
| UI Stop | 27 ms measured UI response, a different clock from process closure |
| Batch regression tests | Changed/replaced targets and context, wrong field effects, partial mutation, per-child denial, Stop/takeover |
| Jev/worker regression tests | Cycles despite refreshed refs, covered controls, no replay of uncertain mutations, provider cancellation/backoff |
| PoC offline checks | 31 upstream contract tests; verifier suite with negative cases; source pins checked |
| Secret checks | Earlier 702-file check; final handoff 1081 files/exports, including decompressed evidence, no actual-key matches; no owned processes left |

The earlier suite counts 404, 407, 421 and 432 are successive versions, not additive unique test counts. A terminal idle-detection timing failure under concurrent load was retained; the later full run passed. Image building produced a working image and passed container tests, but the final global Podman storage check returned exit 3 because existing storage exceeded the configured ceiling. This is not a clean-machine installation result.

These checks do not constitute an independent penetration test. Prompt injection, hostile child processes, logged-in complex sites, uploads, canvas, frames, production reliability and cross-platform packaging are not comprehensively validated. [Security boundaries](../../SECURITY.md) and [release work](../RELEASE-READINESS.md) remain explicit.
