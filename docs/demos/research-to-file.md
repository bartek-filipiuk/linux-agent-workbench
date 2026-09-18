# Research → a saved Markdown file

**Read two official sources and turn them into a useful local note.** This task completed in one take without corrective feedback.

Recorded on September 18, 2026, using app source `293696d`. Gemini `google/gemini-3.8-flash` with low reasoning planned through OpenRouter / Google AI Studio; browser mode was Jev Auto (`jev-1.13.0`). The run used an isolated app profile and workspace. These are individual demonstrations, not matched speed benchmarks. No application runtime code was changed for the recording.

## Exact prompt and what happened

**Task:**

> Compare uv and pipx for running Python command-line tools. Read https://docs.astral.sh/uv/guides/tools/ and https://pipx.pypa.io/stable/ in the browser. Save /workspace/python-cli-tools.md: a concise table covering dependency isolation and each command to run Ruff once, plus both source links. Keep it under 180 words. Use the terminal only to write and display the note; do not install or run either tool.

One take. Gemini used planned browser execution throughout; Jev made zero decisions. The app read both official sources, wrote the report through the terminal, displayed it, and checked its length. The independent review confirmed 112 words, both links, the isolation comparison, `uvx ruff` and `pipx run ruff`. Nothing was installed or executed with either package tool.

What worked: browser-to-terminal handoff, concise source-grounded output and correct saved file. No correction was needed. The film's typeset report is explicitly a presentation of the saved Markdown, not a new application feature. Audio was softened for this film; the first film was unchanged.

Evidence: [run](../research/video-tests/02-research-file/evidence/run.json), [saved report](../research/video-tests/02-research-file/deliverables/python-cli-tools.md), [routing](../research/video-tests/02-research-file/evidence/route-events.json), [validation](../research/video-tests/02-research-file/evidence/validation.json), [production notes](../research/video-tests/02-research-file/PRODUCTION.md).

## Time, cost and outcome

| Measure | Recorded result |
| --- | --- |
| Start → app completion | **9.203 s** |
| Reported provider cost | **$0.037118250** |
| Primary turns / tool calls | 4 / 9 |
| Jev decisions | 0; Gemini used planned browser tools |
| Final artifact | `python-cli-tools.md`, 112 words |
| Acceptance | Passed; both sources, isolation comparison and commands checked |

The time excludes setup and prompt entry. Browser research, terminal writing and displaying the file are inside the task clock. The film retains continuous task footage at normal speed. The formatted report card presents the actual saved Markdown; it is editorial presentation, not an app screen. This demonstrates research and file creation, not the performance of running uv or pipx.

## Watch the film

[![Watch Research → a saved file](images/research-to-file.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-file.mp4)

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-file.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/research-to-file.srt)

Film length: **40 s**. Film duration is different from measured task time. Provider costs exclude setup, infrastructure, this supervising conversation and video production; they are recorded usage or explicitly labeled estimates, not invoices.

[All demonstrations](README.md) · [Full test ledger](../research/VIDEO-TESTS.md) · [Application README](../../README.md#watch-it-work)
