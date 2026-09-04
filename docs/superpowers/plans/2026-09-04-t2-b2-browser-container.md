# T2 B2 — Browser worker in its own rootless container

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** The browser worker from B1 runs inside `law-browser-<sessionId>`, a second rootless Podman container built on the pinned Playwright image, with the Chromium profile in a named volume, downloads in a per-session directory, no workspace, no LLM key, and the same socket contract as on the host. Closing and reopening the app reconnects to the same container; the profile survives container recreation.

**Architecture:** `images/browser/Containerfile` starts from `mcr.microsoft.com/playwright:v1.62.1-noble` (Chromium + system deps + Node 22), installs `playwright@1.62.1` for `/opt/law` and copies the worker and protocol dists. `PodmanRuntime` gains a generic `ensureRunningWith(name, args)` plus `buildBrowserRunArgs(spec)`. `BrowserSessionManager` gets a `launcher` seam: `hostSpawn` (B1) or `podman` (B2); everything after the socket appears is unchanged.

## Global Constraints

- Container name `law-browser-<sessionId>` (same session id as the terminal, derived from the workspace path); socket dir `<runtimeRoot>/<sessionId>/browser` → `/run/law`; profile volume `law-browser-profile-default` → `/profile`; downloads dir `<dataDir>/downloads/<sessionId>` → `/downloads`.
- Launch args: `--userns=keep-id --cap-drop=ALL --security-opt=no-new-privileges --read-only --pids-limit=512 --memory=2g --shm-size=1g --tmpfs /tmp --tmpfs /run --tmpfs /home/agent`, `--network slirp4netns|none`, env `LAW_BROWSER_SOCKET=/run/law/browser.sock`, `LAW_BROWSER_PROFILE=/profile/user-data`, `HOME=/home/agent`. No workspace mount, no `OPENAI_*`.
- Chromium runs without its own SUID/userns sandbox (Playwright default in containers); the container is the boundary. Documented in the image.
- Image id pinned in `images/browser/image.json`; `scripts/build-image.sh` takes the image name as `$1` (`terminal` default) and prunes with `scripts/prune-images.sh`; storage cap raised to 10 GB (two images + base + one in-use previous).

## Tasks

1. **Image + build script**: Containerfile (rename `pwuser` uid 1000 → `agent`, `/opt/law` with `package.json` deps `playwright@1.62.1 zod`, copy `packages/protocol/dist`, `services/browser-worker/dist`, supervisor loop CMD), `scripts/build-image.sh browser` writing `images/browser/image.json`. Smoke: `podman run --rm --userns=keep-id --read-only --tmpfs … <id> node -e "require('playwright')"` and `id` → `agent`.
2. **Runtime + manager**: `buildBrowserRunArgs`, `PodmanRuntime.ensureRunningWith`, `BrowserSessionManager` launcher seam (`launch: () => Promise<{ kill(): Promise<void>; alive(): boolean }>`), Daemon builds the podman launcher when `config.init` carries `browserImageId`, else host spawn; `session.stop { destroy: true }` also destroys the browser container. Tests: args table; manager with a fake launcher.
3. **Container test**: `tests/container/browser-container.test.ts` (skipped without `LAW_CONTAINER_TESTS=1` or the image): start via podman launcher on a tmp session id, frames arrive, `podman exec env` has no keys, `/workspace` absent, navigate `https://example.com` with network open returns the title, profile volume keeps a cookie across destroy+start.
4. **Verify in the app**: main passes `browserImageId` from `images/browser/image.json`; open the browser panel, navigate, close app, reopen: the container is reused (log `reused`); screenshots.
