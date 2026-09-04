import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PodmanRuntime, TerminalSessionManager, containerName } from "@law/agentd";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const imageJson = path.resolve(__dirname, "../../images/terminal/image.json");
const imageId = fs.existsSync(imageJson) ? (JSON.parse(fs.readFileSync(imageJson, "utf8")) as { id: string }).id : "";

const until = async (pred: () => Promise<boolean> | boolean, ms = 20_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("condition not met in time");
};

describe.skipIf(!enabled || !imageId)("bash policy gate in the container", { timeout: 90_000 }, () => {
  const runtimeRoot = fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-gt-"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "law-gtws-"));
  const manager = new TerminalSessionManager({ runtime: new PodmanRuntime(), runtimeRoot, imageId });
  const seen: string[] = [];
  let allowRm = false;

  afterAll(async () => {
    await manager.destroy();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }, 60_000);

  it("every interactive command is checked; a denied rm -rf does not run", async () => {
    const status = await manager.start(workspace, "none");
    expect(status.state, status.message).toBe("ready");
    manager.worker!.onRequest("gate.check", async (p) => {
      const command = String(p.command);
      seen.push(command);
      if (/^rm\s+-rf/.test(command) && !allowRm) return { decision: "deny", reason: "test says no" };
      return { decision: "allow" };
    });
    const w = manager.worker!;
    await until(async () => (await w.observe({})).screen.includes("$"));
    manager.write(new TextEncoder().encode("touch victim.txt\r"));
    await until(() => fs.existsSync(path.join(workspace, "victim.txt")));
    manager.write(new TextEncoder().encode("rm -rf victim.txt\r"));
    await until(async () => (await w.observe({})).screen.includes("law: command blocked: test says no"));
    expect(fs.existsSync(path.join(workspace, "victim.txt"))).toBe(true);
    expect(seen).toContain("touch victim.txt");
    expect(seen).toContain("rm -rf victim.txt");
  });

  it("an allowed rm -rf runs", async () => {
    allowRm = true;
    manager.write(new TextEncoder().encode("rm -rf victim.txt\r"));
    await until(() => !fs.existsSync(path.join(workspace, "victim.txt")));
  });

  it("the gate is fail-closed when no agentd client is connected", async () => {
    manager.detach();
    const name = containerName(manager.status.sessionId!);
    // An interactive bash with a pty (script) so the trap is armed at the first prompt.
    let out = "";
    try {
      out = execFileSync("podman", ["exec", "-i", name, "script", "-qec", "bash -i", "/dev/null"], { input: "echo SHOULD_NOT_RUN\nexit\n", stdio: "pipe", timeout: 20_000 }).toString();
    } catch (e) {
      out = String((e as { stdout?: Buffer }).stdout ?? "") + String((e as { stderr?: Buffer }).stderr ?? "");
    }
    expect(out).toContain("law: command blocked: no policy connection");
    expect(out).not.toMatch(/^SHOULD_NOT_RUN$/m);
  });
});
