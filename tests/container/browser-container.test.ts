import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { BrowserSessionManager, PodmanRuntime, browserContainerName, podmanLauncher } from "@law/agentd";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const imageJson = path.resolve(__dirname, "../../images/browser/image.json");
const imageId = fs.existsSync(imageJson) ? (JSON.parse(fs.readFileSync(imageJson, "utf8")) as { id: string }).id : "";
const sessionId = "b2b2b2b2b2b2b2b2";

describe.skipIf(!enabled || !imageId)("browser container", { timeout: 120_000 }, () => {
  const runtime = new PodmanRuntime();
  const root = fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-bc-"));
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "law-bcdl-"));
  const make = () =>
    new BrowserSessionManager({
      socketDir: path.join(root, "browser"),
      launcher: podmanLauncher({ runtime, sessionId, imageId, networkMode: "open", downloadsDir: downloads }),
      connectTimeoutMs: 60_000,
    });
  let m = make();

  afterAll(async () => {
    await m.destroy();
    fs.rmSync(root, { recursive: true, force: true });
  }, 60_000);

  it("starts in a container without keys or workspace, navigates with the network open and streams frames", async () => {
    const frames: number[] = [];
    m.on("frame", (f: { jpeg: Uint8Array }) => frames.push(f.jpeg.length));
    const status = await m.start();
    expect(status.state, status.message).toBe("ready");
    const name = browserContainerName(sessionId);
    const env = execFileSync("podman", ["exec", name, "env"]).toString();
    expect(env).not.toMatch(/OPENAI|ANTHROPIC/);
    expect(() => execFileSync("podman", ["exec", name, "ls", "/workspace"], { stdio: "ignore" })).toThrow();
    // about:blank never repaints, so frames only start flowing once a page renders.
    const info = await m.navigate("https://example.com");
    expect(info.title).toMatch(/Example Domain/);
    m.input({ kind: "mousemove", x: 5, y: 5 });
    await expect.poll(() => frames.length, { timeout: 15_000 }).toBeGreaterThan(0);
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
    const vol = execFileSync("podman", ["volume", "inspect", "law-browser-profile-default", "--format", "{{.Mountpoint}}"]).toString().trim();
    expect(vol.length).toBeGreaterThan(0);
  });
});
