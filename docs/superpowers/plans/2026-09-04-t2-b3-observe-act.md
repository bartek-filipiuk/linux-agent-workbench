# T2 B3 — Semantic observation, ref-based actions, wait, downloads

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** The browser worker can describe the page to a model (interactive elements with short-lived refs, a screenshot, the page list) and execute structured actions against those refs, refusing actions whose revision is stale. Waiting, page switching, downloads and dialogs are handled. Everything is exercised on local fixture pages served over HTTP in tests.

**Architecture:** `BrowserSession.observe()` walks the DOM in the page (one `evaluate`), keeps element references in a per-session `WeakRef` registry on `window` under a random key, assigns `e1…eN` refs bound to a `revision`, and returns roles/names/text/bounds plus a JPEG screenshot (base64). `BrowserSession.act(action)` resolves a ref to an `ElementHandle` for the current revision and uses Playwright element methods (click, fill, selectOption); coordinates and keys go through `page.mouse`/`page.keyboard`. Stale refs → `STALE_OBSERVATION`. Popups become pages; `switchPage` changes the active page and the screencast target. Downloads are saved into the downloads dir and listed.

## Global Constraints

- New error code `STALE_OBSERVATION`.
- Refs: `e<n>`, valid only for the `revision` returned with them; each observe increments the revision; navigation invalidates all refs.
- Observation caps: 200 elements (in-viewport first, then the rest by document order), `name` ≤ 120 chars, `text` ≤ 120 chars; screenshot JPEG quality 50 scaled to max 1024 px wide.
- Interactive elements: `a[href]`, `button`, `input` (not hidden), `select`, `textarea`, `summary`, `[role=button|link|tab|menuitem|checkbox|radio|switch|textbox|combobox|option]`, `[contenteditable]`, `[onclick]`; plus `h1`–`h3` and `label` as landmarks (role `heading`/`label`, not actionable).
- Actions: `navigate {url}`, `click {ref, revision}`, `type {ref, revision, text, submit?}` (fill, then Enter when submit), `press {key}`, `select {ref, revision, values[]}`, `mouse {x, y, action: move|down|up|wheel, deltaY?}`, `switchPage {pageId}`, `closePage {pageId}`, `wait {ms ≤ 10000}`. `upload` returns `INVALID_INPUT` "not available yet" (needs the workspace policy from B4).
- `browser.wait {text?: regex, selector?, state?: load|networkidle, timeoutMs ≤ 60000}`; `browser.downloads` lists `{ name, bytes, pageUrl }`; dialogs (alert/confirm/prompt) are auto-dismissed and reported in the observation as `lastDialog`.

## Tasks

1. **Protocol**: `packages/protocol/src/browser.ts` schemas `BrowserElement`, `BrowserObservation`, `BrowserAction`, `BrowserActResult`, `BrowserWaitInput`, `BrowserWaitResult`, `BrowserDownload`; `ErrorCode` + `STALE_OBSERVATION`. Tests for the action union and stale/invalid shapes.
2. **Worker**: `fixtures/websites/{index,form,popup,download}.html`; `BrowserSession.observe/act/wait/downloads`, page registry with ids, dialog handling, download capture; `BrowserWorkerServer` routes `browser.observe|act|wait|downloads`. Tests with a local `http.createServer` serving the fixtures: elements and refs, click by ref navigates, stale revision, type+submit, select, popup → pages/switchPage/closePage, wait for text, download listed, dialog dismissed.
3. **agentd client**: `BrowserSessionManager.observe/act/wait/downloads`; manager test extended on the host worker with the fixture server.
4. **Wrap-up**: rebuild the browser image (worker changed), container test unchanged, typecheck/test/merge.
