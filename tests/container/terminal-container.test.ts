import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PodmanRuntime, TerminalSessionManager, containerName } from "@law/agentd";
import { isolatedRuntime } from "./isolated-runtime";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const imageJson = path.resolve(__dirname, "../../images/terminal/image.json");
const imageId = fs.existsSync(imageJson) ? (JSON.parse(fs.readFileSync(imageJson, "utf8")) as { id: string }).id : "";

const until = async (pred: () => Promise<boolean> | boolean, ms = 15_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("condition not met in time");
};

describe.skipIf(!enabled || !imageId)("terminal container", { timeout: 90_000 }, () => {
  const runtimeRoot = fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-ct-"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "law-ctws-"));
  const isolation = isolatedRuntime();
  const runtime = isolation.runtime;
  let manager: TerminalSessionManager;
  let sessionId = "";

  afterAll(async () => {
    await manager?.destroy();
    await isolation.cleanup();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }, 60_000);

  it("starts, has no provider keys in env and only /workspace writable", async () => {
    manager = new TerminalSessionManager({ runtime, runtimeRoot, imageId });
    const status = await manager.start(workspace, "none");
    expect(status.state, status.message).toBe("ready");
    sessionId = status.sessionId!;
    // This suite tests the worker, not the policy: answer the shell's gate checks permissively.
    manager.worker!.onRequest("gate.check", async () => ({ decision: "allow" }));
    const name = containerName(sessionId);
    const env = execFileSync("podman", ["exec", name, "env"]).toString();
    expect(env).not.toMatch(/OPENAI|ANTHROPIC/);
    expect(() => execFileSync("podman", ["exec", name, "touch", "/etc/x"], { stdio: "ignore" })).toThrow();
    execFileSync("podman", ["exec", name, "touch", "/workspace/ok"]);
    expect(fs.existsSync(path.join(workspace, "ok"))).toBe(true);
  });

  it("runs a command typed by the human and observes it", async () => {
    const w = manager.worker!;
    await until(async () => (await w.observe({})).screen.includes("$"));
    manager.write(new TextEncoder().encode("echo IN_CONTAINER_$((6*7))\r"));
    await until(async () => (await w.observe({})).screen.includes("IN_CONTAINER_42"));
  });

  it("survives a worker crash: tmux keeps the screen and reconnect works", async () => {
    const name = containerName(sessionId);
    manager.write(new TextEncoder().encode("echo KEEP_ME\r"));
    await until(async () => (await manager.worker!.observe({})).screen.includes("KEEP_ME"));
    execFileSync("podman", ["exec", name, "pkill", "-f", "worker/main.js"]);
    await until(() => manager.status.state === "disconnected", 10_000);
    const status = await manager.start(workspace, "none");
    expect(status.state, status.message).toBe("ready");
    manager.worker!.onRequest("gate.check", async () => ({ decision: "allow" }));
    await until(async () => (await manager.worker!.observe({})).screen.includes("KEEP_ME"));
  });
});
