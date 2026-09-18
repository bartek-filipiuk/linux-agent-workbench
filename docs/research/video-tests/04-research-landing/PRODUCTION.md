# After Dark: research → Claude Code → an HTML landing page

A real Linux Agent Workbench desktop test recorded on September 18, 2026. Gemini read four official pages, wrote a research brief, and invoked Claude Code with the explicit `claude-sonnet-5` model in the sandbox terminal. Claude authored the HTML, CSS, JavaScript and original SVG illustrations. The supervising assistant reviewed and recorded the resulting local page in Chromium.

**Outcome: a working page after assisted corrections, not a first-pass autonomous success.** Two outer app runs failed with OpenRouter HTTP 429. Gemini interrupted an early Claude launch; two subsequent Claude invocations hit configured turn limits. The fourth Claude invocation and final app continuation completed successfully. All attempts are included in the cost accounting below.

## Open the result

- `output/workspace/index.html`: final landing page. Open locally with its sibling CSS/JS/assets intact; no installation or build required.
- `output/after-dark-landing.zip`: portable landing page, source notes and local font licenses.
- `output/linux-agent-research-to-landing.mp4`: 1:57 English film, 1920 × 1080 at 30 fps. Edited app excerpts have explicit speed/source-time labels; the final reviewer-operated page preview is normal speed.
- `output/landing-desktop.png`, `output/landing-mobile.png`, `output/landing-hero.png`: actual Chromium screenshots.
- `public/capture.mp4`, `public/collection.mp4`, `public/recovery.mp4`, `public/final.mp4`: full recorded phases at 1×. Collection restores the existing app session; it submits no new model task.
- `public/landing-preview.webm`: recording of the actual generated local HTML, operated by the reviewer after the task.
- `output/remotion-source.zip`: separate video source and evidence package. It contains no provider credentials or app profile.

## Task and setup

The concept is an educational night-sky field journal, with no claim of affiliation with the cited institutions. The page needs source-linked preparation tips, a clearly illustrative bright/dark sky comparison, a working five-item checklist/reset, responsive styling, local assets and a bibliography. No forecasts, booking, email collection or deployment.

Exact instructions: `evidence/task.txt`, `evidence/design-brief.md`, `evidence/recovery-task.txt`, `evidence/final-task.txt`. The supervisor supplied the topic, four seed URLs, acceptance criteria, visual direction and an existing OFL font kit. The measured agent did not discover the topic or build the font kit itself.

Sources read in the app browser and reopened independently during review:

1. [NASA: Skywatching FAQ](https://science.nasa.gov/skywatching/faq/).
2. [NASA: Moon Viewing Tips](https://science.nasa.gov/moon/viewing-tips/).
3. [National Park Service: Where to Stargaze](https://www.nps.gov/subjects/nightskies/stargaze.htm).
4. [DarkSky / IES: Five Principles for Responsible Outdoor Lighting](https://darksky.org/resources/guides-and-how-tos/lighting-principles/).

Outer planner: Gemini `google/gemini-3.8-flash / low` through OpenRouter / Google AI Studio. Browser mode: Jev Auto; **zero Jev decisions** in all phases. Nested CLI: Claude Code 2.1.260, `claude-sonnet-5 / medium`, authenticated with an existing Max subscription. `modelUsage` confirms Sonnet 5 plus small Haiku 4.5 utility calls. No model was silently substituted for the coding task.

App source: `293696d` on `main`; no runtime code changes were made. Work happened in a fresh `tutorial-landing` app profile and `/home/bartek/linux-agent-tutorial-landing-workspace`. Authentication stayed in the private profile / dedicated Claude auth volume, outside the research workspace and archives. The isolated app profile had nested autonomy enabled. All webpage implementation was performed by Claude; Gemini wrote the research, process wrappers and check/report scripts.

## Time and cost

### Outer app phases

| Phase | State | Click → terminal event | Reported primary turns | Tool calls | Incremental OpenRouter usage cost |
| --- | --- | ---: | ---: | ---: | ---: |
| Research and initial build orchestration | Failed, HTTP 429 | 267.235 s | 93 | 105 | $0.820974600 |
| First externally prompted correction | Failed, HTTP 429 | 129.935 s | 19 additional | 19 additional | $0.318989025 |
| Final externally prompted correction | Completed | 76.952 s | 9 additional | 8 additional | $0.135693075 |
| Total active app intervals | Mixed outcomes | 474.122 s | 121 | 132 | **$1.275656700** |

There were 94, 20 and 9 model-timing records respectively: the first two include the final unsuccessful provider operation, which does not increase the successful-turn counter. Recorded primary request time sums to approximately 201.093 s, 49.397 s and 33.262 s in those phases. The first run made 59 `terminal_wait` calls; many idle-only waits resolved immediately. The two later foreground wrapper calls blocked through Claude completion, so no explicit `terminal_wait` call was needed in those phases.

The research note had been saved and displayed **26.136 seconds** after the first Start click. This is a milestone inside the first phase, not an additional interval or a separate matched benchmark.

### Every retained Claude invocation

| Invocation | Time | Outcome | CLI API-equivalent estimate |
| --- | ---: | --- | ---: |
| Early launch | 12.184 s, CLI-reported | Interrupted by Gemini with Ctrl+C | $0.229316000 |
| Restarted build | 354.508 s, wrapper | Exit 1, `error_max_turns`; page created | $0.686131600 |
| First correction | 48.253 s, wrapper | Exit 1, `error_max_turns`; partial correction | $0.443963000 |
| Final correction | 30.871 s, wrapper | Exit 0, `success` | $0.200345800 |
| Total recorded nested invocation time / estimate | 445.817 s | One successful completion among four invocations | **$1.559756400** |

The supervisor initially chose turn limits of 24 and 16, which proved too small for these executions. The final invocation allowed 64 turns and finished in 12. A larger turn allowance did not itself consume more tokens; it permitted normal completion. This does not prove 64 is optimal for arbitrary tasks.

The early launch result was overwritten by Gemini when it restarted. An audit recovered the complete JSON from the persisted terminal output (`call_589094`): `evidence/aborted-claude-result.json` plus `aborted-result-provenance.json`. Its original JSON was soft-wrapped on the terminal; the reconstruction joins those wraps and parses the complete JSON. This recovered **$0.229316** is included, not discarded. The app events and raw capture also retain the Ctrl+C and wrapper rewrite.

**Clock boundaries:** first Start → final app completion was **753.235 seconds (12 min 33 s)**. This includes the external review, reopening and gaps between continuations. Final independent browser checking happened afterward. It excludes initial setup and subsequent video production. The 474.122 s is the sum of active app phases; the 445.817 s is nested CLI time. These intervals overlap, so adding them would be wrong. The long restarted build includes the app/proxy interruption and collection period; it is not clean Sonnet latency.

**Billing boundaries:** $1.275657 is reported OpenRouter usage; $1.559756 is Claude Code's list-price estimate while using a Max subscription. The mixed-basis sum is **$2.835413**, useful only as an approximate combined API-equivalent figure, not an established extra charge or invoice. [Claude Code documentation](https://code.claude.com/docs/en/headless) describes these CLI cost fields as client estimates; [cost documentation](https://code.claude.com/docs/en/costs) distinguishes subscription allowances from token billing. Failed requests without usage, infrastructure, subscription allocation, this supervising conversation and video production are outside the known ledger.

Machine-readable accounting: `evidence/measurements.json`. The UI cost counters in continuations are cumulative; the table subtracts the preceding run. Claude calls use separate fresh sessions and separate result files, so their reported invocation costs are added once each.

## What worked, what failed, what changed

**Worked:** four-page research with explicit source URLs; actual delegation to Sonnet 5; a complete dependency-free landing page; original SVG artwork; functioning accessible native controls; local fonts; transparent source bibliography. Sonnet independently detected a low-contrast copper-on-ivory text combination and corrected it to a darker copper. Its build notes honestly distinguished static checks from unperformed browser testing.

**Failed:** the outer planner mistook terminal quietness for a useful wait condition, interrupted an early coding process, then spent many model turns polling. Both initial app phases later received HTTP 429. The exact provider limit responsible for 429 is unknown; the evidence establishes polling overhead, not a proven provider-side causal diagnosis. The two configured Claude turn limits were also too small. These are separate failures with separate scopes.

**Capture limitation:** the capture harness closed Electron when the first outer run failed. A nested Claude process was still running; the supervisor reopened the same profile to restore its egress proxy and collect the process result. This is an external recovery and a harness lifecycle limitation. The original footage is not presented as uninterrupted successful completion.

**External content/design feedback:** the review requested removal of an unsupported exact twenty-minute adaptation recommendation and softer wording about bright white light, removal of eyebrow labels and a desktop CTA width refinement. The first correction partly implemented these; the last completed the content correction and updated build notes. No application source fix was made.

**Remaining visual misses:** the supplied font kit contained only Outfit and DM Sans, although the supervisor's design brief requested a serif headline. Sonnet used Outfit and disclosed the mismatch. The desktop CTA also still stretches with its flex parent, despite Sonnet claiming it was already content-width. The reviewer measured this in `evidence/design-review.json`; this optional visual refinement is **not accepted as fixed**. Functional success is not full compliance with every aesthetic instruction.

Preserved revisions: `evidence/first-build/` (after the restarted build exited), `evidence/second-build/` (after the first correction), and `output/workspace/` (final files). Early screenshots were made before the first process finished its own changes; the review notes disclose that those screenshot/CSS versions are not guaranteed identical. Final screenshots and checks are from the final saved page.

## Independent checks and scope

`scripts/check-page.mjs` loads the actual local page in Chromium. All 18 targeted checks pass: one h1, desktop/mobile overflow, font loading, four bibliography links across three publishers, resolving anchors, CTA navigation, five native checklist items, keyboard operation, reset, slider endpoints, actual visual clip-path change, visible focus, offline rendering, no remote assets, readable content with JavaScript disabled, and no browser errors. `evidence/browser-check.json` records the final 2.676 s check, outside the app clock.

`scripts/check-design.mjs` records remaining visual discrepancies instead of treating the model's self-report as acceptance. External source review checked the main displayed tips and principles; it does not certify every sentence in the intermediate research note. The final page is an educational concept with schematic illustrations, not a calibrated sky simulation or an observing forecast. No deployment, cross-browser matrix or full automated accessibility audit was performed.

## Engineering follow-ups suggested by this test

These are recommendations, **not implemented changes**:

- Wait on a process completion signal/status or new output revision; do not repeatedly invoke the LLM against an unchanged quiet screen.
- Match completion markers against actual new output, not the echoed command that contains the marker text. Prefer process-aware execution over screen regexes.
- Treat process exit, CLI `is_error`/`subtype`, acceptance checks and generic terminal-tool completion as distinct signals.
- Keep invocation-specific output files and budgets; never overwrite failed/interrupted results when retrying.
- Apply provider backoff and retain the precise failure scope; do not attribute every 429 to insufficient credits.
- Keep the proxy/capture lifecycle alive while authorized child work is running, or deliberately stop and account for it.
- Treat numeric content claims and visual layout requirements as checkable acceptance items. Static self-report is insufficient for flex layout behavior.

## Reproduce the artifacts

To view the page, unzip `after-dark-landing.zip` and open `index.html`. All rendering assets are local; source links require connectivity. The output workspace additionally retains process and accounting files.

For the film, use Node 24:

```bash
npm ci
npm run typecheck
npm run render
npx remotion still src/index.tsx ResearchLanding output/thumbnail.png --frame=105
npm run studio
```

The film uses local Outfit and DM Sans fonts with bundled OFL notices and quiet original synthesized audio only under editorial cards. Re-rendering existing footage calls no models. Full captures, edited source-time labels and a separate real-page preview prevent editorial cuts from becoming a false task-time claim. No video or page was uploaded or published.
