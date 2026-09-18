# Watch Linux Agent Workbench at work

Three examples of the real desktop app: read sources, save useful files, and hand research to a coding agent. All films have English captions and retain the distinction between app execution, external review and editorial presentation. Recordings are from September 18, 2026.

The MP4 files and optional subtitle tracks are hosted in the repository's [Demo videos release](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/tag/demo-videos-2026-09-18). Click a thumbnail to open or download its film. The release is a media collection, not an application binary release. Video files are outside Git history; [videos.json](videos.json) records their URLs, sizes and SHA-256 hashes.

## Research → a saved file · 40 seconds

[![Watch the uv and pipx research-to-file demo](images/research-to-file.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-file.mp4)

Gemini reads the official uv and pipx documentation, compares isolated Python CLI execution, and writes a concise Markdown note in the terminal. The saved 112-word file includes both sources and example commands. Auto uses planned browsing here, with no Jev calls.

**One take; task completed in 9.203 s; reported provider cost $0.0371.** Task footage plays continuously at normal speed. Nothing was installed or run with uv/pipx.

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-file.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/research-to-file.srt) · [Saved Markdown](../research/video-tests/02-research-file/deliverables/python-cli-tools.md) · [Task and evidence](../research/VIDEO-TESTS.md#film-02-research--a-real-file)

## Compare three monitoring tools · 3 minutes 8 seconds

[![Watch the monitoring comparison, failed validator and prompted correction](images/monitor-comparison.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-long-test.mp4)

The app researches Uptime Kuma, Gatus and Tianji against weighted requirements, writes a CSV and decision report, and generates a Python score check. The first attempt finishes despite its own failed validator. The film shows that failure and a correction requested by the reviewer.

**179.060 s original attempt + 93.196 s prompted correction; known total cost $1.1433.** Corrected files pass the documented checks. Both complete task sections play at labeled 2× speed with actual elapsed-time clocks. No deployment or Slack delivery was tested. This is assisted recovery, not a first-pass autonomous success.

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-long-test.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/monitor-comparison.srt) · [Corrected decision](../research/video-tests/03-monitor-comparison/deliverables/decision.md) · [Original failure and verification](../research/VIDEO-TESTS.md#film-03-compare-three-monitoring-products)

## Research → a working landing page · 1 minute 57 seconds

[![Watch Gemini research and Claude Sonnet 5 build After Dark](images/research-to-landing.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-landing.mp4)

Gemini reads four official pages from NASA, the National Park Service and DarkSky. It passes the research to Claude Code running **Sonnet 5** in the sandbox terminal. Claude builds **After Dark**, an HTML landing page with original SVG artwork, a schematic sky slider, a checklist and source links. The film includes a real Chromium preview of the saved page.

**Research saved after 26.136 s; first Start → final app completion took 12 min 33 s**, including external review, reopening and gaps. Two outer runs failed with HTTP 429; one Claude launch was interrupted, and two hit configured turn limits. The final continuation completed. All four Claude attempts are retained in the ledger.

**OpenRouter usage: $1.2757. Claude Code API-equivalent estimate: $1.5598.** Claude used a Max subscription, so the estimate is not an established additional charge. Final output passes 18 targeted browser checks; the report retains two visual deviations. This is assisted completion. App excerpts are explicitly labeled; the reviewer-operated page preview is normal speed.

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-research-to-landing.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/research-to-landing.srt) · [Download the landing page](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/after-dark-landing.zip) · [HTML source](../research/video-tests/04-research-landing/landing/index.html) · [Full test report](../research/VIDEO-TESTS.md#film-04-research--sonnet-5--after-dark)

## Bonus: find the latest release · 41 seconds

[![Watch the Playwright release lookup and Jev-to-planner recovery](images/release-lookup.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-first-tutorial.mp4)

The app finds the latest stable Playwright release and leaves its release page visible. Gemini first delegates to Jev, then continues with planned browser tools after Jev reports no progress. The selected take completed in **15.677 s** at a tracked cost of **$0.0322**. There were two takes with different prompts; their combined tracked cost was $0.0940. The film uses one continuous task recording at normal speed.

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-first-tutorial.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/release-lookup.srt) · [Both takes and verification](../research/VIDEO-TESTS.md#film-01-latest-playwright-release)

## How to interpret the numbers

Film duration and task duration are different clocks. These are selected desktop demonstrations with different tasks, prompts and levels of assistance, not a matched speed or reliability benchmark. Task clocks exclude app startup and prompt entry; follow-up gaps and review are included only where explicitly stated. Costs exclude video production, infrastructure and this supervising conversation; reported usage can omit unsuccessful requests without returned usage.

[Complete film test ledger](../research/VIDEO-TESTS.md) · [Historical matched benchmarks](../research/README.md) · [How the application works](../APPLICATION.md)

The original task recordings and editable Remotion projects remain in the separately retained production archive; their local provenance and hashes are recorded in the research kit. The public media release contains finished films, subtitles and the landing-page download. Third-party websites, names, screenshots and bundled fonts retain their own rights and notices; see [third-party notices](../../THIRD_PARTY_NOTICES.md).
