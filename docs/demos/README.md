# Watch Linux Agent Workbench at work

Three examples of the real desktop app: read sources, save useful files, and hand research to a coding agent. All films have English captions and retain the distinction between app execution, external review and editorial presentation. Recordings are from September 18, 2026.

The MP4 files and optional subtitle tracks are hosted in the repository's [Demo videos release](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/tag/demo-videos-2026-09-18). Click a thumbnail to read its dedicated task report, including the exact prompts, execution history, results and a link to the film. The release is a media collection, not an application binary release. Video files are outside Git history; [videos.json](videos.json) records their URLs, sizes and SHA-256 hashes.

## Research → a saved file · 40 seconds

[![Research → a saved file](images/research-to-file.png)](research-to-file.md)

Gemini reads the official uv and pipx documentation, compares isolated Python CLI execution, and writes a concise Markdown note in the terminal. The saved 112-word file includes both sources and example commands. Auto uses planned browsing here, with no Jev calls.

[Read the full task, prompts, results and watch the film](research-to-file.md)

## Compare three monitoring tools · 3 minutes 8 seconds

[![Compare three monitoring tools](images/monitor-comparison.png)](monitor-comparison.md)

The app researches Uptime Kuma, Gatus and Tianji against weighted requirements, writes a CSV and decision report, and generates a Python score check. The first attempt finishes despite its own failed validator. The film shows that failure and a correction requested by the reviewer.

[Read the full task, prompts, results and watch the film](monitor-comparison.md)

## Research → a working landing page · 1 minute 57 seconds

[![Research → a working landing page](images/research-to-landing.png)](research-to-landing.md)

Gemini reads four official pages from NASA, the National Park Service and DarkSky. It passes the research to Claude Code running **Sonnet 5** in the sandbox terminal. Claude builds **After Dark**, an HTML landing page with original SVG artwork, a schematic sky slider, a checklist and source links. The film includes a real Chromium preview of the saved page.

[Read the full task, prompts, results and watch the film](research-to-landing.md)

## Bonus: find the latest release · 41 seconds

[![Find the latest release](images/release-lookup.png)](release-lookup.md)

The app finds the latest stable Playwright release and leaves its release page visible. Gemini first delegates to Jev, then continues with planned browser tools after Jev reports no progress. The selected take completed in **15.677 s** at a tracked cost of **$0.0322**. There were two takes with different prompts; their combined tracked cost was $0.0940. The film uses one continuous task recording at normal speed.

[Read the full task, prompts, results and watch the film](release-lookup.md)

## How to interpret the numbers

Film duration and task duration are different clocks. These are selected desktop demonstrations with different tasks, prompts and levels of assistance, not a matched speed or reliability benchmark. Task clocks exclude app startup and prompt entry; follow-up gaps and review are included only where explicitly stated. Costs exclude video production, infrastructure and this supervising conversation; reported usage can omit unsuccessful requests without returned usage.

[Complete film test ledger](../research/VIDEO-TESTS.md) · [Historical matched benchmarks](../research/README.md) · [How the application works](../APPLICATION.md)

The original task recordings and editable Remotion projects remain in the separately retained production archive; their local provenance and hashes are recorded in the research kit. The public media release contains finished films, subtitles and the landing-page download. Third-party websites, names, screenshots and bundled fonts retain their own rights and notices; see [third-party notices](../../THIRD_PARTY_NOTICES.md).
