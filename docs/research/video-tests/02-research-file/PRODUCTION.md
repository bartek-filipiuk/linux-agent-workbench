# Research → a saved file

The second Linux Agent Workbench tutorial is a 40.1-second, 1920 × 1080, 30 fps English walkthrough. It shows a real task that reads two official documentation pages and saves a concise Markdown comparison. Task footage plays continuously at normal speed, with no cuts inside the task. Soft original audio replaces the brighter transition tones of the first film; the first film remains unchanged.

## Deliverables

- `output/linux-agent-research-to-file.mp4` — finished film.
- `output/linux-agent-research-to-file-silent.mp4` — silent version.
- `output/thumbnail.png` — thumbnail.
- `output/english.srt` — optional English captions.
- `output/python-cli-tools.md` — the file actually written by the app.
- `public/capture.mp4` — continuous original desktop recording.

## Recorded task

> Compare uv and pipx for running Python command-line tools. Read https://docs.astral.sh/uv/guides/tools/ and https://pipx.pypa.io/stable/ in the browser. Save /workspace/python-cli-tools.md: a concise table covering dependency isolation and each command to run Ruff once, plus both source links. Keep it under 180 words. Use the terminal only to write and display the note; do not install or run either tool.

One take was recorded. The app used Jev Auto with `google/gemini-3.8-flash`, low reasoning, through OpenRouter. Auto chose planned browser execution and Gemini reasoning throughout this task, with **zero Jev decisions**. The film says this explicitly: Auto does not need to invoke Jev for every task.

The tool events show navigation and reads of both official pages, followed by terminal input that writes the Markdown, displays it with `cat` and checks its word count. The host-side output file was independently read after completion; it contains 112 whitespace-separated words, both sources, an isolation comparison, and the commands `uvx ruff` and `pipx run ruff`. Nothing was installed or run with uv/pipx.

Task time was **9.203 seconds**, from the recorded Start click to the app's completed event. The completion poll returned at 9.369 seconds. Startup, setup, prompt typing and the post-completion hold are excluded. This single demo is not a benchmark or a general latency claim. Provider usage reported **$0.03711825**; it is separate from the published historical benchmark ledger.

The original file SHA-256 is recorded in `src/run-data.json`. The film's document view renders the exact heading, introduction, table cells and source URLs from that file. It is labeled as Markdown formatted for the film, not presented as a new app UI feature.

## Recording and editorial behavior

The harness entered the prompt and clicked Start. All task actions were performed by the real application. The harness switched the visible app tab from Browser to Terminal when a terminal tool began; this changed only the view and sent no instructions to the agent. That view switch is recorded in `evidence/run.json`.

Captions follow tool events. The timer follows the original task duration. The opening/closing layouts, document typography and quiet audio are editorial additions. Recording used an isolated X11 display and an isolated `tutorial-research` app profile; provider credentials remain outside the source project. The app's source was not changed.

The final content was checked against [uv's tools guide](https://docs.astral.sh/uv/guides/tools/) and [pipx's documentation](https://pipx.pypa.io/stable/). Both documents describe isolated tool environments and one-off execution. The report is a concise comparison of that behavior, not an exhaustive product recommendation.

## Re-render and edit

Use Node.js 24 and npm:

```bash
npm ci
npm run typecheck
npm run render
npx remotion still src/index.tsx ResearchTutorial output/thumbnail.png --frame=105
npm run studio
```

Recorded assets are included; rendering does not call model APIs. Rebuilding derived data requires the original evidence and report, FFmpeg, and Python with NumPy:

```bash
python3 scripts/prepare.py
python3 scripts/sound.py
python3 scripts/subtitles.py
```

The capture harness is a separate paid step. It requires a local Workbench checkout, configured provider credentials in the private app profile, existing worker images and X11 display `:99`. It refuses to replace an existing recording. `LAW_APP_ROOT`, `LAW_CAPTURE_DISPLAY` and `LAW_CAPTURE_INSTANCE` can override local defaults. Capture should only be rerun into a new take directory after preserving evidence.

Font assets are Outfit and DM Sans, with their OFL licenses included under `public/fonts/`. `scripts/sound.py` generates the original sound bed deterministically without samples or desktop audio. No video upload or public publication has been performed.
