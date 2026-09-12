import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { BrowserSessionManager, PodmanRuntime, SessionEgress, browserContainerName, podmanLauncher } from "@law/agentd";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const imageJson = path.resolve(__dirname, "../../images/browser/image.json");
const imageId = fs.existsSync(imageJson) ? (JSON.parse(fs.readFileSync(imageJson, "utf8")) as { id: string }).id : "";
const sessionId = "b2b2b2b2b2b2b2b2";
const profileVolume = `law-browser-test-${process.pid}`;

describe.skipIf(!enabled || !imageId)("browser container", { timeout: 120_000 }, () => {
  const runtime = new PodmanRuntime();
  const root = enabled ? fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-bc-")) : "";
  const downloads = enabled ? fs.mkdtempSync(path.join(os.tmpdir(), "law-bcdl-")) : "";
  // The container has no network of its own: its only way out is the session's egress proxy socket.
  const egress = new SessionEgress({ runtimeRoot: root, log: () => undefined });
  const make = () =>
    new BrowserSessionManager({
      socketDir: path.join(root, sessionId, "browser"),
      launcher: podmanLauncher({ runtime, sessionId, imageId, networkMode: "open", downloadsDir: downloads, profileVolume }),
      connectTimeoutMs: 60_000,
    });
  let m = make();

  beforeAll(async () => {
    await egress.ensure(sessionId, "open");
  });
  afterAll(async () => {
    await m.destroy();
    await egress.close();
    if (execFileSync("podman", ["volume", "ls", "--format", "{{.Name}} "]).toString().split(/\s+/).includes(profileVolume)) execFileSync("podman", ["volume", "rm", profileVolume]);
    fs.rmSync(root, { recursive: true, force: true });
  }, 60_000);

  it("starts in a container without keys or workspace, navigates with the network open and streams frames", async () => {
    const frames: number[] = [];
    m.on("frame", (f: { jpeg: Uint8Array }) => frames.push(f.jpeg.length));
    m.setFramesEnabled(true);
    const status = await m.start();
    expect(status.state, status.message).toBe("ready");
    const name = browserContainerName(sessionId);
    const env = execFileSync("podman", ["exec", name, "env"]).toString();
    expect(env).not.toMatch(/OPENAI|ANTHROPIC/);
    expect(() => execFileSync("podman", ["exec", name, "ls", "/workspace"], { stdio: "ignore" })).toThrow();
    // about:blank never repaints, so frames only start flowing once a page renders.
    const info = await m.navigate("https://example.com");
    expect(info.title).toMatch(/Example Domain/);
    const source = await m.read();
    expect(source.content).toMatch(/Example Domain/);
    expect(source.truncated).toBe(false);
    m.input({ kind: "mousemove", x: 5, y: 5 });
    await expect.poll(() => frames.length, { timeout: 15_000 }).toBeGreaterThan(0);
    m.setFramesEnabled(false);
    await new Promise(r => setTimeout(r, 300));
    const hiddenFrames = frames.length;
    await m.navigate("https://example.com/?hidden=1");
    expect((await m.observe({})).title).toMatch(/Example Domain/);
    await new Promise(r => setTimeout(r, 300));
    expect(frames.length).toBe(hiddenFrames);
    m.setFramesEnabled(true);
    await expect.poll(() => frames.length, { timeout: 15000 }).toBeGreaterThan(hiddenFrames);
  });

  it("uses a full manual window, routes through egress and preserves login cookies", async () => {
    const frames: number[] = [];
    m.on("frame", f => frames.push(f.jpeg.length)); m.setFramesEnabled(true);
    expect((await m.control({ kind: "manual", enabled: true })).manual).toBe(true);
    await expect(m.observe({ screenshot: true })).rejects.toThrow(/Manual login/);
    await expect(m.read()).rejects.toThrow(/Manual login/);
    await expect.poll(() => frames.length, { timeout: 15000 }).toBeGreaterThan(2);
    expect((await m.control({ kind: "manual", enabled: false })).manual).toBe(false);
    expect((await m.observe()).title).toMatch(/Example Domain/);
    const script = fs.readFileSync(path.join(__dirname, "manual-browser-fixture.mjs"), "utf8");
    const output = execFileSync("podman", ["exec", "-i", browserContainerName(sessionId), "node", "--input-type=module"], { input: script, timeout: 60000 }).toString();
    expect(JSON.parse(output)).toMatchObject({ cookiesPersisted: true, automationBlocked: true, hiddenFramesPaused: true });
    fs.copyFileSync(path.join(downloads, "manual-window.jpg"), "/tmp/law-manual-window.jpg");
  });

  it("hard-restarts the browser container without deleting its saved profile", async () => {
    const name = browserContainerName(sessionId);
    execFileSync("podman", ["exec", name, "touch", "/profile/user-data/reset-profile-sentinel"]);
    const before = execFileSync("podman", ["inspect", name, "--format", "{{.Id}}"], { encoding: "utf8" }).trim();
    expect((await m.restart()).state).toBe("ready");
    const after = execFileSync("podman", ["inspect", name, "--format", "{{.Id}}"], { encoding: "utf8" }).trim();
    expect(after).not.toBe(before);
    execFileSync("podman", ["exec", name, "test", "-f", "/profile/user-data/reset-profile-sentinel"]);
    expect(m.lastObservation).toBeUndefined();
    expect((await m.navigate("https://example.com")).title).toMatch(/Example Domain/);
  });

  it("keeps the profile across stop and start (container reused), and across destroy (volume)", async () => {
    await m.stop();
    expect(m.status.state).toBe("stopped");
    // A brand-new manager (app restart) must reconnect to the running container instead of breaking its socket.
    m = make();
    const again = await m.start();
    expect(again.state, again.message).toBe("ready");
    expect(again.url).toMatch(/example\.com/); // same page: the container and its Chromium survived the detach
    await m.destroy();
    m = make();
    const fresh = await m.start();
    expect(fresh.state, fresh.message).toBe("ready");
    const vol = execFileSync("podman", ["volume", "inspect", profileVolume, "--format", "{{.Mountpoint}}"]).toString().trim();
    expect(vol.length).toBeGreaterThan(0);
  });
});
