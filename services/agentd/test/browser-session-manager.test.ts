import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import type { PodmanRuntime } from "../src/runtime/podman.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browserExecutor } from "../src/tools/browser-tools.js";
import { BrowserSessionManager, hostLauncher, podmanLauncher } from "../src/session/browser-session-manager.js";
import { tmpDir } from "./helpers/tmp.js";
import { startFixtureServer } from "../../browser-worker/test/helpers/fixture-server.js";

// Real worker process on the host (Playwright + headless Chromium); skipped when the worker is not built.
const workerEntry = fileURLToPath(new URL("../../browser-worker/dist/main.js", import.meta.url));
const built = fs.existsSync(workerEntry);
let m: BrowserSessionManager | undefined;
afterEach(async () => {
  await m?.stop();
  m = undefined;
});

describe.skipIf(!built)("BrowserSessionManager (host worker)", { timeout: 60_000 }, () => {
  it("spawns the worker, streams frames, navigates and stops cleanly", async () => {
    const root = tmpDir("law-br-");
    m = new BrowserSessionManager({ socketDir: path.join(root, "rt"), launcher: hostLauncher({ workerEntry, profileDir: path.join(root, "profile") }) });
    m.setFramesEnabled(true);
    const frames: number[] = [];
    m.on("frame", (f: { width: number; height: number; jpeg: Uint8Array }) => frames.push(f.jpeg.length));
    const status = await m.start();
    expect(status.state, status.message).toBe("ready");
    expect(fs.existsSync(path.join(root, "rt", "browser.sock"))).toBe(true);
    await expect(m.navigate("file:///etc/passwd")).rejects.toThrow(/http/);
    m.input({ kind: "mousemove", x: 10, y: 10 });
    await expect.poll(() => frames.length, { timeout: 10_000 }).toBeGreaterThan(0);
    await m.stop();
    expect(m.status.state).toBe("stopped");
  });

  it("observes, acts by ref and waits through the socket", async () => {
    const root = tmpDir("law-br-");
    m = new BrowserSessionManager({ socketDir: path.join(root, "rt"), launcher: hostLauncher({ workerEntry, profileDir: path.join(root, "profile") }) });
    expect((await m.start()).state).toBe("ready");
    const site = await startFixtureServer();
    try {
      await m.navigate(`${site.url}/form.html`);
      const obs = await m.observe({ screenshot: false });
      const q = obs.elements.find((e) => e.role === "textbox" && e.name.includes("Query"))!;
      await m.act({ kind: "type", ref: q.ref, revision: obs.revision, text: "socket", submit: true });
      expect((await m.wait({ text: "QUERY=socket", timeoutMs: 5000 })).matched).toBe(true);
      await expect(m.act({ kind: "click", ref: q.ref, revision: obs.revision })).rejects.toMatchObject({ code: "STALE_OBSERVATION" });
      expect(await m.downloads()).toEqual([]);
      const tools = browserExecutor(m, root);
      const signal = new AbortController().signal;
      const read = JSON.parse((await tools.execute({ callId: "read", name: "browser_read", args: { scope: "page" } }, signal)).output);
      expect(read.content).toContain("QUERY=socket");
      expect(read.url).toContain(site.url);
      await m.stop(); // Stored captures remain saveable without restarting a browser.
      const saved = JSON.parse((await tools.execute({ callId: "save", name: "browser_save", args: { snapshotId: read.snapshotId } }, signal)).output);
      expect(fs.readFileSync(path.join(root, path.basename(saved.path)), "utf8")).toContain("QUERY=socket");
      expect(m.status.state).toBe("stopped");
    } finally {
      await site.close();
    }
  });

  it("reports an error when the worker cannot start", async () => {
    const root = tmpDir("law-br-");
    m = new BrowserSessionManager({ socketDir: path.join(root, "rt"), launcher: hostLauncher({ workerEntry: path.join(root, "missing.js"), profileDir: path.join(root, "profile") }), connectTimeoutMs: 5000 });
    const status = await m.start();
    expect(status.state).toBe("error");
  });

  it("restarts only the browser worker, retains the profile and reconnects frames", async () => {
    const root = tmpDir("law-br-reset-");
    const profile = path.join(root, "profile");
    m = new BrowserSessionManager({ socketDir: path.join(root, "rt"), launcher: hostLauncher({ workerEntry, profileDir: profile }) });
    m.setFramesEnabled(true);
    expect((await m.start()).state).toBe("ready");
    fs.writeFileSync(path.join(profile, "retained-profile-marker"), "keep");
    const frames: unknown[] = []; m.on("frame", f => frames.push(f));
    const restart = m.restart();
    await expect(m.restart()).rejects.toThrow(/already in progress/);
    expect((await restart).state).toBe("ready");
    expect(fs.readFileSync(path.join(profile, "retained-profile-marker"), "utf8")).toBe("keep");
    await expect.poll(() => frames.length).toBeGreaterThan(0);
    expect((await m.observe({})).url).toBe("about:blank");
  });
});

it("refuses to launch a browser without a container image instead of falling back to the host", async () => {
  const runtime = { ensureRunningWith: vi.fn() };
  const launch = podmanLauncher({ runtime: runtime as unknown as PodmanRuntime, sessionId: "0123456789abcdef", imageId: undefined, networkMode: "open", downloadsDir: "/tmp/unused-downloads" });
  await expect(launch({ socketDir: "/tmp/unused-runtime", socketPath: "/tmp/unused-runtime/browser.sock" })).rejects.toThrow(/Host browser fallback is disabled/);
  expect(runtime.ensureRunningWith).not.toHaveBeenCalled();
});
