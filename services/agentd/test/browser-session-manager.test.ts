import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserSessionManager, hostLauncher } from "../src/session/browser-session-manager.js";
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
});
