import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { sessionIdFor } from "../src/runtime/podman.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
afterEach(async () => {
  await fw?.close();
  fw = undefined;
});

function fakeRuntime(opts: { onEnsure?: (dir: string) => Promise<void>; imageOk?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    ensureRunning: async (spec: { runtimeDir: string }) => {
      calls.push("ensureRunning");
      await opts.onEnsure?.(spec.runtimeDir);
      return "started" as const;
    },
    destroy: async () => void calls.push("destroy"),
    state: async () => "running" as const,
    logs: async () => "container log",
    imageExists: async () => opts.imageOk ?? true,
  };
}

describe("TerminalSessionManager", () => {
  it("starts a session, connects to the worker socket and forwards data both ways", async () => {
    const runtimeRoot = tmpDir("law-rt-");
    const workspace = tmpDir("law-ws-");
    const runtime = fakeRuntime({
      onEnsure: async (dir) => {
        fw = await FakeWorker.listen(path.join(dir, "worker.sock"));
      },
    });
    const m = new TerminalSessionManager({ runtime, runtimeRoot, imageId: "sha256:x", connect: (p) => SocketTerminalWorker.connect(p) });
    const statuses: string[] = [];
    m.on("status", (s) => statuses.push(s.state));
    const got = new Promise<string>((r) => m.on("data", (b: Uint8Array) => r(new TextDecoder().decode(b))));
    const status = await m.start(workspace, "open");
    expect(status.state).toBe("ready");
    expect(status.sessionId).toBe(sessionIdFor(fs.realpathSync(workspace)));
    expect(fs.statSync(path.join(runtimeRoot, status.sessionId!)).mode & 0o777).toBe(0o700);
    fw!.emitPty("hello from pty");
    expect(await got).toBe("hello from pty");
    m.write(new TextEncoder().encode("ls\r"));
    await expect.poll(() => fw!.screen).toContain("ls");
    await m.resize(100, 30);
    expect(fw!.received.some((e) => e.type === "terminal.resize")).toBe(true);
    await m.refresh();
    expect(fw!.received.some((e) => e.type === "terminal.refresh")).toBe(true);
    expect(statuses).toEqual(["starting", "ready"]);
    m.detach();
    expect(m.status.state).toBe("disconnected");
    expect(runtime.calls).toEqual(["ensureRunning"]);
  });

  it("reports error with container logs when the socket never appears", async () => {
    const m = new TerminalSessionManager({ runtime: fakeRuntime(), runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x", connectTimeoutMs: 400 });
    const status = await m.start(tmpDir("law-ws-"), "open");
    expect(status.state).toBe("error");
    expect(status.message).toContain("container log");
  });

  it("refuses to start when the image is missing", async () => {
    const m = new TerminalSessionManager({ runtime: fakeRuntime({ imageOk: false }), runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x" });
    const status = await m.start(tmpDir("law-ws-"), "open");
    expect(status).toMatchObject({ state: "error" });
    expect(status.message).toMatch(/image/i);
  });

  it("rejects an invalid workspace without touching the runtime", async () => {
    const runtime = fakeRuntime();
    const m = new TerminalSessionManager({ runtime, runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x" });
    const status = await m.start("/", "open");
    expect(status.state).toBe("error");
    expect(runtime.calls).toEqual([]);
  });

  it("destroy detaches and removes the container", async () => {
    const runtimeRoot = tmpDir("law-rt-");
    const runtime = fakeRuntime({ onEnsure: async (dir) => { fw = await FakeWorker.listen(path.join(dir, "worker.sock")); } });
    const m = new TerminalSessionManager({ runtime, runtimeRoot, imageId: "sha256:x" });
    await m.start(tmpDir("law-ws-"), "none");
    await m.destroy();
    expect(m.status.state).toBe("stopped");
    expect(runtime.calls).toEqual(["ensureRunning", "destroy"]);
  });
});
