import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserSessionManager } from "../src/session/browser-session-manager.js";
import { tmpDir } from "./helpers/tmp.js";

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
    m = new BrowserSessionManager({ runtimeRoot: path.join(root, "rt"), profileDir: path.join(root, "profile"), workerEntry });
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

  it("reports an error when the worker cannot start", async () => {
    const root = tmpDir("law-br-");
    m = new BrowserSessionManager({ runtimeRoot: path.join(root, "rt"), profileDir: path.join(root, "profile"), workerEntry: path.join(root, "missing.js"), connectTimeoutMs: 5000 });
    const status = await m.start();
    expect(status.state).toBe("error");
  });
});
