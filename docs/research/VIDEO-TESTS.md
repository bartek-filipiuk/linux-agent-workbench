# Recorded application tests

These are real desktop demonstrations recorded on September 18, 2026, with retained prompts, events, output files and independent checks. They are **separate from the frozen historical benchmark series**. Different tasks, revised prompts and assisted corrections must not be pooled into a speed or success ranking.

The app source at recording was `293696d` on `main`. All three films used Gemini `google/gemini-3.8-flash`, low reasoning, through OpenRouter / Google AI Studio, with Jev Auto and `jev-1.13.0`. Recording used isolated app profiles, workspaces and an X11 display. Provider credentials remain outside the publication package. No app implementation changes were made to produce these films.

## Measurements and acceptance

Task time starts at the recorded Start click and ends at the app's completed event. It excludes setup, prompt entry, review between runs and video production. The separately retained completion-poll time is slightly longer. App completion is not itself proof of acceptance.

| Film / attempt | Task seconds | Primary turns | Tool calls | Jev decisions | Known cost, USD | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01: Playwright release, first take | 31.125 | 7 | 21 | 1 | 0.061865694 | Answer returned; browser left on API JSON. Not the selected presentation take. |
| 01: Playwright release, revised prompt | 15.677 | 6 | 15 | 2 | 0.032173242 | Version/date independently verified; release page visible. |
| 02: uv versus pipx → Markdown | 9.203 | 4 | 9 | 0 | 0.037118250 | Saved 112-word report meets the requested content and format. |
| 03: monitoring comparison, original | 179.060 | 42 | 110 | 0 | 0.654741675 | **Acceptance failed**, despite app completion. |
| 03: explicit corrective follow-up | 93.196 | 21 additional | 41 additional | 0 | 0.488558025 additional | Corrected artifacts pass the documented checks; assisted recovery. |
| **All retained attempts above** | **328.261** | **80** | **196** | **3** | **1.274456886** | Mixed tasks and outcomes; this is an accounting total. |

The first film's earlier production note rounded the first take to about 31.3 seconds using the completion poll (31.328 s). The event-based clock above is 31.125 s. This clarification preserves the original evidence rather than silently replacing it.

Costs are app-accounted provider usage; the first film includes the configured Jev token estimate. They are not a provider invoice, and exclude infrastructure, recording/rendering and this supervising conversation. The third film's follow-up UI shows **$1.143299700 cumulative**, already including the original $0.654741675. Counting it as an additional charge would double-count the original run.

Machine-readable records and complete prompts: [trials.json](video-tests/trials.json). Film durations: 41.344 s, 40.128 s and 188.182 s. Films 01 and 02 retain continuous 1× task footage; film 03 shows both full task sections at labeled 2× speed with an actual elapsed-time clock. Full 1× captures are also retained locally.

## Film 01: latest Playwright release

**Original task:**

> Open the Playwright repository on GitHub. Find the latest stable release and report its version, release date, and source link. Use only the browser.

**Revised task used in the film:**

> Open https://github.com/microsoft/playwright/releases. Find the latest stable release, report its version, release date and source link. Leave its release page visible. Use only the browser.

The first take returned an answer but ended on GitHub API JSON. That was an editorial presentation problem; the first prompt did not require leaving the release page visible. The second take supplied a starting URL and added that requirement. The two timings therefore cannot establish a same-prompt speedup.

In the selected take, Gemini delegated a browser subtask to Jev, which reported no progress. Gemini continued using planned browser tools. The real handoff remains in the film. The result was Playwright v1.63.0, published September 4, 2026; an independent GitHub release API request confirmed it and the release page was visibly open.

What worked: usable recovery from Jev's no-progress report, correct final release evidence, requested browser end state. What changed: the task prompt and editorial take selection. **No routing code was fixed.** There were two takes, not one uninterrupted attempt.

Evidence: [selected run](video-tests/01-release/evidence/run.json), [first take](video-tests/01-release/evidence/take-1/run.json), [independent GitHub check](video-tests/01-release/evidence/github-verification.json), [routing events](video-tests/01-release/evidence/route-events.json), [production notes](video-tests/01-release/PRODUCTION.md).

## Film 02: research → a real file

**Task:**

> Compare uv and pipx for running Python command-line tools. Read https://docs.astral.sh/uv/guides/tools/ and https://pipx.pypa.io/stable/ in the browser. Save /workspace/python-cli-tools.md: a concise table covering dependency isolation and each command to run Ruff once, plus both source links. Keep it under 180 words. Use the terminal only to write and display the note; do not install or run either tool.

One take. Gemini used planned browser execution throughout; Jev made zero decisions. The app read both official sources, wrote the report through the terminal, displayed it, and checked its length. The independent review confirmed 112 words, both links, the isolation comparison, `uvx ruff` and `pipx run ruff`. Nothing was installed or executed with either package tool.

What worked: browser-to-terminal handoff, concise source-grounded output and correct saved file. No correction was needed. The film's typeset report is explicitly a presentation of the saved Markdown, not a new application feature. Audio was softened for this film; the first film was unchanged.

Evidence: [run](video-tests/02-research-file/evidence/run.json), [saved report](video-tests/02-research-file/deliverables/python-cli-tools.md), [routing](video-tests/02-research-file/evidence/route-events.json), [validation](video-tests/02-research-file/evidence/validation.json), [production notes](video-tests/02-research-file/PRODUCTION.md).

## Film 03: compare three monitoring products

**Scenario:** a three-person team, 12 HTTP services, three TCP endpoints, one Linux Docker host, Slack alerts, a public status page, and a preference for configuration in Git. Compare Uptime Kuma, Gatus and Tianji using at least six official pages, including each product's latest release.

Deliverables: `candidates.csv` with an exact schema; a decision report under 650 words with sources, unknowns and a five-step proposed rollout; and a Python-generated `score-check.json` independently recomputing scores. Read the saved files before completing. Missing evidence must be `unknown`, not `no`.

| Criterion | Points if documented yes | Required for qualification |
| --- | ---: | --- |
| Docker | 20 | Yes |
| HTTP checks | 20 | Yes |
| TCP checks | 15 | Yes |
| Slack | 15 | Yes |
| Public status page | 10 | No |
| Configuration as code | 20 | No |

`no` and `unknown` earn zero points. Exact full instructions: [original task](video-tests/03-monitor-comparison/evidence/task.txt); [corrective follow-up](video-tests/03-monitor-comparison/evidence/recovery-task.txt).

### First attempt: failed acceptance

- The CSV/report gave Uptime Kuma 70 points; the stated weights yield 80.
- The generated validator detected that mismatch and wrote `validation_passed: false`. The agent read it and still completed with the incorrect result.
- Missing evidence for configuration as code was labeled `no` rather than `unknown`.
- Tianji was excluded because it lacked a native Slack provider. The user required Slack support, not a native provider; the documented Apprise route was relevant.
- Gatus's release date was May 20 without a timezone. Its official UTC publication timestamp is May 19 at 23:53. The follow-up normalized dates to UTC; the initial date was not proven wrong in every local timezone.

Original artifacts were preserved **before correction**: [CSV](video-tests/03-monitor-comparison/evidence/original-output/candidates.csv), [decision](video-tests/03-monitor-comparison/evidence/original-output/decision.md), [failed validator output](video-tests/03-monitor-comparison/evidence/original-output/score-check.json), [validator source](video-tests/03-monitor-comparison/evidence/original-output/validate_scores.py).

The generated validator printed failure JSON but exited normally. A generic terminal-tool `done` event meant the command completed, not that the artifact passed. The app does not enforce arbitrary task-specific JSON assertions as a completion gate.

### Prompted correction and verification

The supervising assistant explicitly requested correction. This was **external feedback**, not spontaneous self-recovery. Gemini corrected all saved reports, checked the integration evidence, normalized dates and reread the outputs.

| Product | Original score | Corrected score | Corrected qualification | Evidence caveat |
| --- | ---: | ---: | --- | --- |
| Gatus | 100 | 100 | Eligible; winner under these weights | YAML configuration documented |
| Uptime Kuma | 70 | 80 | Eligible | Configuration as code unknown in this review |
| Tianji | 65 | 80 | Eligible | Slack through Apprise; configuration as code unknown |

The corrected report has 644 whitespace-separated words. An independent verifier checks the CSV schema, three products, allowed values, weighted arithmetic, eligibility, latest release/version/date/license metadata, report length, source links and five checklist steps. All those checks pass. The supervising source review additionally checked the official product documentation, Tianji's HTTP/TCP implementation, its Apprise provider and Dockerfile, and upstream Apprise Slack documentation. Source snapshots are included.

What worked: substantive multi-source browsing, local artifact creation, an effective validator, and useful correction after feedback. What failed: enforcing that validator's result and interpreting evidence consistently. The original Gatus recommendation survived correction, but a correct winner does not make the flawed comparison acceptable.

**No deployment or actual Slack delivery was tested.** `unknown` does not establish that a feature or integration is absent. This was not a product security audit, licensing opinion or general reliability benchmark.

Evidence: [original run](video-tests/03-monitor-comparison/evidence/run.json), [follow-up](video-tests/03-monitor-comparison/evidence/recovery.json), [independent checks](video-tests/03-monitor-comparison/evidence/independent-check.json), [timing and routing](video-tests/03-monitor-comparison/evidence/phase-metrics.json), [corrected decision](video-tests/03-monitor-comparison/deliverables/decision.md), [corrected CSV](video-tests/03-monitor-comparison/deliverables/candidates.csv), [full production notes and primary-source links](video-tests/03-monitor-comparison/PRODUCTION.md).

### Timing breakdown

| Recorded interval | Original | Correction | Total |
| --- | ---: | ---: | ---: |
| Task | 179.060 s | 93.196 s | 272.256 s |
| Primary model requests | 137.529 s | 68.491 s | 206.020 s |
| Remaining elapsed time | 41.531 s | 24.705 s | 66.236 s |

Model-request time includes provider waiting; the remainder contains browser/terminal operations and orchestration. It is not a CPU profile. Jev was never called in either phase.

## Fix status and next engineering work

These films changed prompts and task artifacts, **not application runtime code**. The following are evidence-driven recommendations, not completed fixes:

1. For tasks with machine-checkable acceptance, register explicit acceptance checks and require a fresh successful result before claiming verified completion. Distinguish “finished” from “verified.”
2. Have generated validation scripts return a nonzero exit status on failure, while also checking the structured result. Exit status alone does not establish factual correctness.
3. Preserve original task constraints in comparisons: missing evidence stays unknown; an extra criterion such as “native Slack” must not silently replace “Slack support.”
4. Add a regression scenario where a terminal command exits zero but its saved validation JSON is false. The planner must investigate, correct, or report unresolved failure.
5. Keep feedback provenance and cumulative versus incremental costs explicit in durable conversations and reports.

A single observed failure motivates these checks; it does not measure failure frequency or prove that a different browser engine would fix it.

## Retention and reproduction

The `video-tests/` folders include original English production notes, exact prompts, event logs, scripts, source snapshots, results and validation. Historical local paths inside them are provenance. Large MP4/WAV assets and Remotion dependencies remain in the separate tutorial folders; [artifact-manifest.json](video-tests/artifact-manifest.json) records their local locations, sizes and SHA-256 hashes. Source archives for each film are retained there too. The original production notes describe the state before publication. Finished films, descriptions and subtitles are now linked from the [public demo gallery](../demos/README.md); raw captures and editable projects remain in the separate production archive.

Rendering from the separate source archives spends no model quota. Re-running a capture is a new paid experiment and should use a fresh workspace/profile/output directory. Do not overwrite original failure evidence or reuse previous outputs as if they were newly produced. These desktop recordings do not alter the historical 606-run benchmark inventory or its cost totals.

## Film 04: research → Sonnet 5 → After Dark

A subsequent, separately scoped test used four official pages from NASA, NPS and DarkSky to build an educational night-sky landing page. Gemini performed research and terminal orchestration; Claude Code **Sonnet 5** implemented the HTML/CSS/JS and SVG artwork. The supervisor supplied seed URLs, a design brief and fonts, then reviewed the output. Jev Auto used planned execution with zero Jev decisions.

**A working page was obtained after external corrections. This was not an autonomous first-pass success.** The complete [fourth-film report](video-tests/04-research-landing/PRODUCTION.md) includes exact tasks, limitations, provenance and engineering follow-ups. [Final HTML](video-tests/04-research-landing/landing/index.html), [browser checks](video-tests/04-research-landing/evidence/browser-check.json), [design exceptions](video-tests/04-research-landing/evidence/design-review.json) and [measurements](video-tests/04-research-landing/evidence/measurements.json) are retained in this repository.

| Milestone / phase | Time | Outcome |
| --- | ---: | --- |
| Research saved and displayed | 26.136 s after initial Start | Four official pages, three publishers |
| Initial outer app run | 267.235 s | HTTP 429; repeated idle polling |
| First outer correction | 129.935 s | HTTP 429 |
| Final outer correction | 76.952 s | Completed |
| First Start → final app completion | **753.235 s (12:33)** | Includes external review, reopening and gaps |

These clocks overlap with nested Claude execution; do not add them together. Final independent browser tests and video production occurred afterward. Outer active intervals sum to 474.122 s, not 753.235 s.

| Nested Claude attempt | Time | API-equivalent cost estimate | Result |
| --- | ---: | ---: | --- |
| Early launch | 12.184 s, CLI clock | $0.2293160 | Interrupted by Gemini; overwritten result recovered from tool log |
| Restarted build | 354.508 s, wrapper clock | $0.6861316 | Page produced; configured 24-turn limit reached |
| First correction | 48.253 s, wrapper clock | $0.4439630 | Partial fixes; configured 16-turn limit reached |
| Final correction | 30.871 s, wrapper clock | $0.2003458 | Completed within a 64-turn allowance, using 12 turns |
| **All four calls** | **445.817 s** | **$1.5597564** | Includes small Haiku utility calls |

The outer planner's recorded OpenRouter cost was **$1.2756567**. Claude used an existing Max subscription; its $1.5597564 is a list-price estimate, **not a demonstrated additional charge**. The combined $2.8354131 is a mixed-basis API-equivalent estimate, not an invoice. Earlier film totals above remain separate; none of these runs change the historical benchmark ledger.

The final page passes 18 targeted real-Chromium checks, including 1440/390 px layouts, keyboard checklist/reset, slider behavior, local fonts/assets, offline content and no browser errors. Source review removed an unsupported precise adaptation time and softened an absolute claim. Sonnet also independently corrected text contrast. A requested serif could not be used from the supplied sans-only kit (a setup mismatch); the desktop CTA width refinement was not achieved despite the model's self-report. These visual exceptions remain documented.

This test adds concrete engineering follow-ups: process-aware waiting rather than repeated reads of a quiet screen; fresh completion markers rather than matching echoed commands; explicit CLI exit/result checks; unique per-attempt output files; provider backoff; and a capture/proxy lifecycle that accounts for still-running child work. **No app runtime fixes were implemented in this documentation/video task.**


## Film 05: one authorized live X reply

A separately scoped live-account test used **GPT-5.6-Luna / medium through the Codex subscription, Classic browser tools**, and the owner's existing X session. It posted one supplied Polish greeting with the repository URL under the latest visible original post. The original phase handed control back unnecessarily; an external follow-up and one scoped send approval enabled completion. Two covered-element clicks failed before the agent navigated to the observed reply URL. No runtime code fix was made.

**33.743 s to handoff + 56.919 s continuation = 90.662 s for the task intervals**, including 19.868 s approval waiting. First Start → final completion was **161.324 s**, including 70.662 s of external review/setup between phases. There were 22 reported planner turns, 20 completed tool calls (21 database records including the interrupted handoff), and zero Jev calls. **USD cost is unavailable**, not zero, because this was subscription execution without a reliable per-task dollar estimate.

The supervisor reloaded the reply and parent thread and checked the persisted text and GitHub preview. [Published reply](https://x.com/vince_pl/status/2100926830660211187) · [Full prompts, chronology, measurements and evidence](video-tests/05-x-reply/REPORT.md).

The 2:07.7 local film preserves both phases at 1× and explains the omitted review gap. [Watch it from the dedicated demo page](../demos/x-live-reply.md#watch-the-film); the MP4 and subtitles are hosted in the repository media release. This is assisted completion on one real account, separate from the earlier Gemini/Jev tests and frozen historical benchmarks.
