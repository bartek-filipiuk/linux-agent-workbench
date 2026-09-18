# Linux Agent Workbench — first video tutorial

A 41.3-second English walkthrough of a real Jev Auto task, produced in Remotion at 1920 × 1080, 30 fps. The application recording runs at normal speed. There is no voice-over; editorial captions and quiet original sound design guide the viewer.

## Watch

- `output/linux-agent-first-tutorial.mp4` — finished film with sound design.
- `output/linux-agent-first-tutorial-silent.mp4` — the same film without audio.
- `output/thumbnail.png` — cover image.
- `output/english.srt` — optional subtitle track.
- `public/capture.mp4` — continuous source recording for the selected take.

## What actually happened

The recorded prompt was:

> Open https://github.com/microsoft/playwright/releases. Find the latest stable release, report its version, release date and source link. Leave its release page visible. Use only the browser.

The real desktop app used Jev Auto with `google/gemini-3.8-flash`, low reasoning, through OpenRouter, and `jev-1.13.0`. Gemini delegated the initial browser subtask to Jev. Jev reported a no-progress cycle; Gemini continued with planned browser execution and completed the task. That handoff is retained in the video and explicitly captioned.

The result was **v1.63.0**, published **September 4, 2026**, with the [official release page](https://github.com/microsoft/playwright/releases/tag/v1.63.0) left visible. An independent request to the [GitHub release API](https://api.github.com/repos/microsoft/playwright/releases/latest) verified the version, date and source after recording.

The selected take completed in **15.677 seconds**, measured from the Start task click marker to the app's completed event. The poll observed completion after 15.698 seconds. Preparation, application startup, typing and post-completion holds are outside that task clock. This is an illustrative recorded run, not a new benchmark or a typical-latency claim.

Two takes were made. The first completed in about 31.3 seconds but left the browser showing GitHub API JSON. For the second take, the prompt was revised to explicitly leave the release page visible and supply the releases URL. Its full execution is the take used in the film. Both source recordings and event logs are retained under `evidence/` and `public/`; the film does not splice task execution from different takes.

Known tracked provider cost: first take **$0.061865694**, selected take **$0.032173242**, total **$0.094038936**. This combines returned primary-provider usage and the app's configured Jev token estimate, excluding production work and infrastructure. These demonstration runs are separate from the published historical benchmark ledger.

## Editing choices

The opening and closing shots use a crop from the recorded final browser image. The prompt is a magnified crop of the actual app sidebar. The task section shows continuous app footage, a task clock and captions derived from recorded tool events. Intro/result animations and sound are editorial additions. No browser clicks, app responses or results were simulated. The capture harness only entered the prompt and pressed Start; the application performed the task.

The film uses Outfit and DM Sans, bundled with their OFL licenses in `public/fonts/`. The sound design is generated deterministically by `scripts/sound.py`; it contains no sampled music, voice or system audio. The app source was not changed for the tutorial.

## Re-render

Use Node.js 24 and npm:

```bash
npm ci
npm run typecheck
npm run render
npx remotion still src/index.tsx Poster output/thumbnail.png
```

To edit interactively:

```bash
npm run studio
```

The source recording, final-page crop, fonts and sound are already included. Rendering does not call model APIs. `src/run-data.json` holds verified result data and the recorded event timing used by the composition. All animations use the Remotion frame clock.

To rebuild derived assets from the retained evidence:

```bash
node scripts/prepare.mjs
python3 scripts/sound.py
python3 scripts/subtitles.py
```

The asset scripts additionally require FFmpeg and Python with NumPy. The capture harness is a separate live, paid step: it requires a configured local Workbench checkout, Playwright from that checkout, Electron, rootless Podman worker images, and a private `tutorial-final` app profile with working provider credentials. It records the dedicated X11 display `:99`, never the user's main desktop. See the environment overrides at the top of `scripts/capture.mjs`; it waits for a local `capture.trigger` file before recording. The existing footage is sufficient to render and edit the film; re-capturing is unnecessary.

The project deliberately lives separately from the application repository so video dependencies and assets do not affect the application build. This is the first review version; no upload or public publication has been performed.
