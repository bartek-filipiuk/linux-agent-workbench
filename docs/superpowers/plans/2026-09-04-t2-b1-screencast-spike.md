# T2 B1 — Screencast to canvas and input forwarding (spike that stays)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** A second panel in the Electron window shows a live Chromium page rendered from Playwright screencast frames; the user navigates, clicks and types through the canvas with usable latency; the browser profile persists between app restarts. No model involvement yet; the human always owns the browser surface in B1.

**Architecture:** `services/browser-worker` runs Playwright on the host in B1 (containerised in B2) and serves `browser.sock` with the same `FramedConnection`. Frames go worker → agentd → main → renderer as raw kind-3 frames (`u16 width, u16 height, JPEG`), throttled in the worker. Input goes renderer → main → agentd → worker as `browser.input` notifications (mouse, wheel, key) mapped by the renderer from canvas to viewport coordinates. agentd's `BrowserSessionManager` spawns the worker process, owns its socket and profile directory, and mirrors `TerminalSessionManager`'s status model.

**Verified today:** `page.screencast.start({ onFrame: ({ data, viewportWidth, viewportHeight }) => …, size, quality })` (Playwright docs, class Screencast).

## Global Constraints

- T1 constraints apply. New frame kinds: `3` = browser frame (worker → agentd), `4` = reserved for browser input bytes (unused; input is JSON).
- Frame payload: `u16 width, u16 height` big-endian, then JPEG bytes. Worker sends at most `fps` frames per second (default 12 while input was seen in the last 2 s, else 2) and drops the rest.
- Worker messages: `browser.navigate { url }` (http/https only, normalised with `new URL`), `browser.info {}` → `{ url, title, viewport }`, `browser.screencast { quality?, size? }`, `browser.input` notification `{ kind: "mousemove"|"mousedown"|"mouseup"|"wheel"|"keydown"|"keyup"|"insert", x?, y?, button?, deltaX?, deltaY?, key?, text? }`.
- Profile dir `$XDG_DATA_HOME/linux-agent-workbench/profiles/browser/default/user-data`, mode 0700, one Chromium per profile.
- Viewport 1280×800; frames scaled to max 1024×640 at quality 60 (tunable).
- Playwright pinned to the exact version installed today; Chromium installed with `npx playwright install chromium`.

## Tasks

### Task 1: Protocol frame kinds + browser worker

- `packages/protocol/src/framing.ts`: `FrameKind.BrowserFrame = 3`, `FrameKind.BrowserInput = 4`; `isFrameKind` accepts 0–4; `FramedConnection` emits `"browser-frame"` for kind 3. Tests updated.
- `packages/protocol/src/browser.ts`: Zod for `BrowserNavigate`, `BrowserInfo`, `BrowserInputEvent`, `BrowserScreencastOptions`; `encodeBrowserFrame(w, h, jpeg)` / `decodeBrowserFrame(bytes)`.
- `services/browser-worker`: `package.json` (playwright pinned), `src/browser-session.ts` (`BrowserSession`: launchPersistentContext, page, screencast with throttling, `navigate`, `info`, `input`), `src/server.ts` (`BrowserWorkerServer` on a Unix socket, one client, frames to the current client), `src/main.ts` (env `LAW_BROWSER_SOCKET`, `LAW_BROWSER_PROFILE`).
- Test `services/browser-worker/test/browser-session.test.ts` with a `data:` fixture page: frames arrive with the right dimensions; `mousedown/up` on a button changes the title; `keydown` types into an input; navigate rejects `file:`.

### Task 2: agentd BrowserSessionManager + Daemon messages

- `services/agentd/src/session/browser-session-manager.ts`: spawn `node services/browser-worker/dist/main.js` (host mode) with the socket in the runtime dir and the profile dir; connect via `FramedConnection`; `on("browser-frame")` → emit `frame`; `navigate`, `input`, `info`, `stop` (SIGTERM, wait, kill).
- IPC: main → agentd `browser.start {}`, `browser.stop {}`, `browser.navigate { url }`, `browser.input { event }`; agentd → main `browser.state { state, url?, title?, message? }`, `browser.frame { width, height, data: Uint8Array }`.
- Daemon test with a fake worker (socket) for message routing; the real spawn is covered by the manual check.

### Task 3: Electron BrowserPanel

- main: forward `browser.frame` on channel `browser:frame` (ArrayBuffer), `browser.state` on `browser:state`; handlers `browser:start`, `browser:stop`, `browser:navigate`, `browser:input`.
- preload: `startBrowser`, `stopBrowser`, `navigate(url)`, `browserInput(event)`, `onBrowserFrame`, `onBrowserState`.
- renderer `BrowserPanel.tsx`: URL bar + Go + Stop/Start, `<canvas>` sized to the frame aspect, `createImageBitmap` on each frame (drop if one is still decoding), pointer events → `browser.input` with viewport coordinates (canvas scale), wheel → `wheel`, keydown/keyup → `key` (printable characters via `insert`), blue outline (human owns it in B1).
- App: view switch `Terminal | Browser | Both` in the top bar; Both = side by side.

### Task 4: Verify

- `pnpm dev`, open the browser panel, navigate to `https://example.com`, click the "More information" link through the canvas, type into a search box on a second site; close the app, reopen: the same profile (cookies) is there. Screenshots in the scratchpad. Note the felt latency.
