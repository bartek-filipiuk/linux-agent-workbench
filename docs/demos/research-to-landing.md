# Research → Claude Code → After Dark

**An educational landing page built from four official sources, with research by Gemini and implementation by Claude Sonnet 5.** The result is usable after external review and corrections; the failed attempts remain part of the record.

Recorded on September 18, 2026, using app source `293696d`. Gemini `google/gemini-3.8-flash` with low reasoning planned through OpenRouter / Google AI Studio; browser mode was Jev Auto (`jev-1.13.0`). The run used an isolated app profile and workspace. These are individual demonstrations, not matched speed benchmarks. No application runtime code was changed for the recording.

## Setup and scope

A subsequent, separately scoped test used four official pages from NASA, NPS and DarkSky to build an educational night-sky landing page. Gemini performed research and terminal orchestration; Claude Code **Sonnet 5** implemented the HTML/CSS/JS and SVG artwork. The supervisor supplied seed URLs, a design brief and fonts, then reviewed the output. Jev Auto used planned execution with zero Jev decisions.

**A working page was obtained after external corrections. This was not an autonomous first-pass success.** The complete [fourth-film report](../research/video-tests/04-research-landing/PRODUCTION.md) includes exact tasks, limitations, provenance and engineering follow-ups. [Final HTML](../research/video-tests/04-research-landing/landing/index.html), [browser checks](../research/video-tests/04-research-landing/evidence/browser-check.json), [design exceptions](../research/video-tests/04-research-landing/evidence/design-review.json) and [measurements](../research/video-tests/04-research-landing/evidence/measurements.json) are retained in this repository.


Claude Code 2.1.260 used `claude-sonnet-5` with medium effort and an existing Max subscription. Small Haiku utility calls also appear in its usage. The supervisor supplied the topic, seed URLs, design brief and local fonts. Claude wrote the page; Gemini wrote the research and process/check wrappers. No deployment was part of this test.

## Exact original prompt

```text
Research and build "After Dark", a beautiful educational landing page about beginner stargazing and protecting the night sky. Read /workspace/design-brief.md first.

Use the browser to read at least FOUR substantive official pages from at least THREE publishers, starting with:
https://science.nasa.gov/skywatching/faq/
https://science.nasa.gov/moon/viewing-tips/
https://www.nps.gov/subjects/nightskies/stargaze.htm
https://darksky.org/resources/guides-and-how-tos/lighting-principles/
If a page is unavailable, find another official page and record the substitution. Save /workspace/research.md with concise paraphrased findings, claim-to-source URLs, actual page titles, access date and limitations. Read real pages; do not treat snippets or prior knowledge as verification. Do not invent current forecasts, star counts or affiliations.

Then use the TERMINAL to invoke the installed Claude Code with the explicit model claude-sonnet-5. Claude Code, not you, must implement the HTML/CSS/JS. Use a fresh noninteractive session, e.g. claude -p --model claude-sonnet-5 --effort medium --permission-mode acceptEdits --allowedTools 'Read,Write,Edit,Bash' --tools 'Read,Write,Edit,Bash' --max-turns 24 --max-budget-usd 4 --output-format json 'Read research.md and design-brief.md. Build the complete landing page in this workspace. Use the supplied local fonts. Do not spawn agents. Write build-notes.md with actual validation and limitations.' > claude-result.json 2> claude-stderr.log

Record start/end timestamps and exit code around that invocation in build-timing.json (use a shell or Python wrapper); do not leak authentication. CLI is already authenticated. If the explicit model or authentication fails, preserve the failure and report it; do not silently substitute a model. Poll without interrupting the process. Save full JSON to retain total_cost_usd, usage, modelUsage and result. Note this is subscription authentication: CLI cost is an API-equivalent estimate, not a demonstrated extra charge. Do not read auth files.

After Claude finishes, inspect the generated files and result JSON. Run available syntax/static checks; confirm research cites 4 pages/3 publishers, index.html exists and source links are present. Save checks.json with booleans and actual command outcomes. A false or failed check means NOT complete: give Claude a specific correction and preserve each invocation/result/timing separately. Do not implement the page yourself. No installs, external sends, deployment or commits. Browser/terminal are separate containers; the supervising recorder will open the local HTML afterward for a real browser/visual check. Finish with files, exact model identity from modelUsage, elapsed build time, CLI cost estimate and any untested limits. Leave terminal showing the result summary.
```

## Supplied design brief

```text
# After Dark — design and acceptance brief

Build a beautiful English HTML landing page about beginner stargazing and responsible outdoor lighting, based on research.md. Original educational concept, no affiliation with NASA, NPS or DarkSky. No commercial booking, email collection, analytics, deployment or fabricated testimonials/statistics.

Art direction: an astronomical field journal. Ink midnight (#101b25), warm ivory (#f5f0e3), muted copper (#c69263); generous editorial whitespace, dramatic split composition, an original SVG/canvas night-sky illustration with a topographic horizon. Depict an illustrative sky, not a location/date accurate sky map. Use a self-hosted characterful serif headline font and a legible sans for body (local fonts supplied). The standout interaction should let visitors compare a schematic bright and dark sky with an accessible labeled slider, explicitly not a calibrated simulation.

Page: memorable hero, primary CTA scrolling to a practical observing checklist, 3 concise evidence-based preparation tips with inline source links, the illustrative sky comparison, responsible lighting principles, and an honest linked bibliography (at least 4 sources across 3 publishers). Keep prose concise and source-derived paraphrases below 150 words per source. If time-specific forecasts or counts are not researched, do not invent them.

Useful interaction: a 5-item keyboard-accessible checklist with an updating progress count and reset button. No form that pretends to submit. All visible controls must work. No framework/build step; index.html plus local styles.css/script.js/assets is fine. Offline render must retain the illustration, fonts and UI. External links remain normal online links.

Quality: responsive at 390 and 1440 px; no horizontal overflow; semantic landmarks, one h1, clear keyboard focus, contrast, reduced-motion support, labels for controls, no console errors. Avoid generic icon-card grids, gradient text, decorative pill collections, section-number counters, emoji icons, gratuitous glowing blobs, or a fake dashboard. Do not hide content behind animation if JS fails. Maximum display font 96px desktop. No copyrighted stock photo downloads; create the hero vector illustration yourself.

Read research.md; implement all page code yourself in this Claude Code invocation. Do not spawn other agents. Write build-notes.md with real files, checks actually run and limits. Do not claim screenshot or browser testing unless you perform it. Do not read credentials or unrelated directories. This workspace is the complete authorized scope.
```

## What happened, in order

1. Gemini read four official pages from NASA, NPS and DarkSky. It saved and displayed the research note 26.136 seconds after Start.
2. Gemini started Claude Code, then interrupted the early launch with Ctrl+C. Its overwritten result was subsequently recovered from the persisted tool log and included in the cost total.
3. The restarted Claude build produced a page but reached the configured 24-turn limit. Meanwhile, Gemini repeatedly polled a quiet terminal and the outer run ended with HTTP 429. The exact provider limit behind that response is unknown.
4. The capture harness had closed Electron while Claude was still running. The supervisor reopened the same profile to restore its egress proxy and collect the result. This was external intervention.
5. Review identified unsupported wording and visual refinements. The first corrective Claude call made partial changes but reached its 16-turn limit; the outer continuation also ended with HTTP 429.
6. A final explicitly prompted call allowed 64 turns and completed in 12. The final app continuation completed as well.
7. The supervisor then loaded the saved HTML in real Chromium, ran 18 targeted checks and recorded its preview. All functional checks passed; two visual deviations remained documented.

The initial 24/16-turn budgets came from the supervisor's instructions. The observed failures do not show that the model could never finish without those limits. No application runtime fix was implemented during this test.

## Exact first corrective follow-up

```text
The first app run failed with OpenRouter HTTP 429 while polling Claude. The existing Claude process has now exited and its results were collected after reopening the app. Preserve those originals. Read build-timing.json, claude-result.json and build-notes.md: Claude produced a page but hit error_max_turns (exit 1), so do NOT call the original invocation successful.

Make one small corrective Claude Code invocation using explicit claude-sonnet-5, medium effort, same allowed tools, max-turns 16, max-budget-usd 2, output-format json; save its output as claude-followup.json, stderr separately, and timing/exit as followup-timing.json. Do not overwrite original results or rerun the research.

Pass Claude this precise instruction: "Read research.md and build-notes.md. Keep the existing page and make only these fixes: remove all eyebrow/kicker paragraphs above headings; make the hero CTA content-width on desktop; replace the unsupported absolute 'lost instantly under white light' with cautious wording about bright white light disrupting dark adaptation; replace the unsupported exact 'at least twenty minutes' in the checklist with 'Give your eyes time to adjust to the dark'. Do not add facts or sources. Keep the 4 bibliography links, slider, checklist, responsive CSS and local fonts. Run node --check script.js and finish with a concise truthful result, avoiding redundant testing. Update build-notes.md to disclose this external review, previous turn-limit failure and actual corrections. Do not spawn agents."

IMPORTANT: avoid the prior idle polling loop. Run your wrapper in the foreground; have it print the standalone line AFTER_DARK_DONE_EXIT_<exitcode> after writing its timing JSON. Wait for the completion line with terminal_wait using until regex ^AFTER_DARK_DONE_EXIT_[0-9]+$ and timeoutMs 60000; idleMs by itself returns immediately on a quiet terminal and is NOT process completion. Read saved output only after the marker. Do not restart the invocation while it is running.

If it succeeds, write checks.json with actual syntax, required files, 4 source URLs/3 publishers and successful Claude follow-up checks. Say browser interaction checks are by the external reviewer, not by you. Final reply: both invocation outcomes, exact model, both CLI cost estimates separately, follow-up time, remaining limits. No implementation by Gemini, no installs or deployment.
```

## Exact final follow-up

```text
Finish the remaining corrections using ONE Claude Code call. The preceding two invocations hit our too-small turn limits; preserve all their files. Use the installed explicit claude-sonnet-5 with medium effort, max-turns 64, max-budget-usd 2, output-format json, permission-mode acceptEdits and tools Read,Write,Edit,Bash. Save results as claude-final.json and final-timing.json. Do not resume old invocations, start fresh so costs are per invocation.

The Claude prompt must say: "Inspect the existing index.html and styles.css. Finish only these edits if still needed: replace the checklist's unsupported exact twenty-minute recommendation with 'Give your eyes time to adjust to the dark'; soften any claim that dark adaptation is instantly lost; ensure there are no eyebrow/kicker paragraphs above headings; make the hero CTA content-width on desktop. Keep all functional UI and sources. Update build-notes.md with an explicit follow-up note that the earlier two invocations hit turn limits and this external review removed unsupported precision. Run node --check script.js, report actual remaining limits, and FINISH. Do not re-test all previous checks, do not spawn agents."

Run a Python wrapper in foreground, record timestamps/exit and print a standalone FINAL_CLAUDE_EXIT_<exitcode> completion line. If waiting is needed use terminal_wait until ^FINAL_CLAUDE_EXIT_[0-9]+$ with timeoutMs 60000. Never repeatedly use idle-only waits. Once it exits, read only a concise Python-parsed summary of the JSON (is_error, subtype, total_cost_usd, modelUsage model names, result) to avoid flooding the terminal. Write checks.json from real file/syntax/source-count/CLI-success checks. Do not claim success if Claude exits nonzero. No changes to page code by Gemini. No installs or deployment. Finish with a short truthful summary.
```

## Recorded times, costs and final verification

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

## Inspect the result and supporting evidence

- [Final research note](../research/video-tests/04-research-landing/landing/research.md) and [final HTML](../research/video-tests/04-research-landing/landing/index.html).
- [Complete production report](../research/video-tests/04-research-landing/PRODUCTION.md), including sources, failures, accounting boundaries and engineering follow-ups.
- [Machine-readable measurements](../research/video-tests/04-research-landing/evidence/measurements.json), [functional checks](../research/video-tests/04-research-landing/evidence/browser-check.json) and [remaining design deviations](../research/video-tests/04-research-landing/evidence/design-review.json).

The film uses labeled excerpts from the app and a normal-speed reviewer-operated preview of the generated page. It does not present twelve minutes of assisted work as a two-minute autonomous task.

## Watch the film

[![Watch Research → a working landing page](images/research-to-landing.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-landing.mp4)

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-landing.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/research-to-landing.srt) · [Download the landing page](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/after-dark-landing.zip)

Film length: **1:57**. Film duration is different from measured task time. Provider costs exclude setup, infrastructure, this supervising conversation and video production; they are recorded usage or explicitly labeled estimates, not invoices.

[All demonstrations](README.md) · [Full test ledger](../research/VIDEO-TESTS.md) · [Application README](../../README.md#watch-it-work)
