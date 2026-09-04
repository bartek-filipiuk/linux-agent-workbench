import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Daemon } from "../src/ipc.js";
import { Store } from "../src/storage/store.js";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
afterEach(async () => {
  await fw?.close();
  fw = undefined;
});

async function bootWith(adapter: FakeModelAdapter, prepareWorkspace?: (dir: string) => void) {
  const posted: Array<Record<string, unknown>> = [];
  const runtimeRoot = tmpDir("law-rt-");
  const workspace = tmpDir("law-ws-");
  prepareWorkspace?.(workspace);
  const runtime = {
    ensureRunning: async (spec: { runtimeDir: string }) => { fw = await FakeWorker.listen(path.join(spec.runtimeDir, "worker.sock")); return "started" as const; },
    destroy: async () => {},
    state: async () => "running" as const,
    logs: async () => "",
    imageExists: async () => true,
  };
  const d = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, root) => new TerminalSessionManager({ runtime, runtimeRoot: root, imageId, connect: (p) => SocketTerminalWorker.connect(p) }),
    makeAdapter: () => adapter,
    post: (m) => posted.push(m as Record<string, unknown>),
  });
  await d.handle({ type: "config.init", apiKey: "sk-x", model: "fake", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot });
  await d.handle({ type: "session.start", workspacePath: workspace, networkMode: "open" });
  const last = (type: string) => [...posted].reverse().find((p) => p.type === type);
  return { d, posted, last, workspace };
}
const boot = (adapter: FakeModelAdapter) => bootWith(adapter);
const settle = (pred: () => boolean, ms = 3000) => expect.poll(pred, { timeout: ms }).toBe(true);

describe("Daemon run flow", () => {
  it("runs a goal to completion, moving the lease agent -> human and streaming events", async () => {
    const adapter = new FakeModelAdapter([
      { text: "Listing.", toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "ls -al" } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "Two entries." },
    ]);
    const { d, posted, last } = await boot(adapter);
    expect(last("lease.state")).toBeUndefined();
    await d.handle({ type: "run.start", goal: "count files" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    const leases = posted.filter((p) => p.type === "lease.state").map((p) => p.owner);
    expect(leases).toEqual(["agent", "human"]);
    expect(last("run.commentary")).toMatchObject({ text: "Two entries." });
    expect(posted.filter((p) => p.type === "run.tool" && p.status === "done")).toHaveLength(3);
    expect(last("run.state")).toMatchObject({ state: "completed", finalText: "Two entries.", turns: 3, toolCalls: 3, costUsd: null });
    expect(fw!.screen).toBe("$ ls -al\n$ ");
  });

  it("drops human keystrokes while the agent owns the lease, accepts them afterwards", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 400 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("HUMAN") });
    expect(fw!.screen).toBe("$ ");
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("HUMAN") });
    await expect.poll(() => fw!.screen).toContain("HUMAN");
  });

  it("stops a running run and refuses a second concurrent run", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 5000 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "running");
    await d.handle({ type: "run.start", goal: "again" });
    expect(last("agentd.error")).toMatchObject({ message: expect.stringMatching(/already running/) });
    await d.handle({ type: "run.stop" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "stopped");
    expect(last("lease.state")).toMatchObject({ owner: "human" });
  });

  it("hands off on request_human and resumes on run.resume", async () => {
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "request_human", args: { reason: "please log in" } }] },
      { text: "thanks" },
    ]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.handoff") as { reason?: string } | undefined)?.reason === "please log in");
    expect(last("lease.state")).toMatchObject({ owner: "human" });
    expect(last("run.state")).toMatchObject({ state: "handoff" });
    await d.handle({ type: "run.resume" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
  });

  it("human can take the lease mid-run; the next agent tool call is denied and fed back", async () => {
    const adapter = new FakeModelAdapter([
      { text: "wait", delayMs: 300, toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "ok" },
    ]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    await d.handle({ type: "lease.take", owner: "human" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    expect(last("run.tool")).toMatchObject({ name: "terminal_observe", status: "denied" });
  });

  it("routes gate checks from the worker through approvals and back", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 1500 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    const pending = fw!.askClient("gate.check", { command: "git push", cwd: "/workspace", pid: 1 });
    await settle(() => last("approval.request") !== undefined);
    const req = last("approval.request") as { id: string; command: string };
    expect(req.command).toBe("git push");
    await d.handle({ type: "approval.decide", id: req.id, decision: "once" });
    expect(await pending).toEqual({ decision: "allow" });
    expect(last("approval.resolved")).toMatchObject({ id: req.id, decision: "once" });
    expect(last("gate.event")).toMatchObject({ command: "git push", bucket: "approval", decision: "allow" });
    expect(await fw!.askClient("gate.check", { command: "ls", cwd: "/workspace", pid: 1 })).toEqual({ decision: "allow" });
    await d.handle({ type: "run.stop" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "stopped");
  });

  it("records a git snapshot on run.start and restores it on run.restore", async () => {
    const adapter = new FakeModelAdapter([{ text: "done" }]);
    const { d, last, workspace } = await bootWith(adapter, (dir) => {
      execFileSync("git", ["-C", dir, "init", "-q"]);
      fs.writeFileSync(path.join(dir, "f.txt"), "keep\n");
      execFileSync("git", ["-C", dir, "add", "."]);
      execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "i"]);
    });
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    expect(last("run.state")).toMatchObject({ snapshot: true });
    fs.writeFileSync(path.join(workspace, "f.txt"), "damaged\n");
    await d.handle({ type: "run.restore", runId: (last("run.state") as { runId: string }).runId });
    expect(last("run.restored")).toMatchObject({ ok: true });
    expect(fs.readFileSync(path.join(workspace, "f.txt"), "utf8")).toBe("keep\n");
  });

  it("refuses run.start without a ready session", async () => {
    const posted: Array<Record<string, unknown>> = [];
    const d = new Daemon({ openStore: (p) => new Store(p), makeManager: () => { throw new Error("unused"); }, makeAdapter: () => new FakeModelAdapter([]), post: (m) => posted.push(m as Record<string, unknown>) });
    await d.handle({ type: "run.start", goal: "g" });
    expect(posted.at(-1)).toMatchObject({ type: "agentd.error" });
  });

  it("browser.start needs a ready sandbox session and a configured launcher", async () => {
    const posted: Array<Record<string, unknown>> = [];
    const d = new Daemon({ openStore: (p) => new Store(p), makeManager: () => { throw new Error("unused"); }, makeAdapter: () => new FakeModelAdapter([]), post: (m) => posted.push(m as Record<string, unknown>) });
    await d.handle({ type: "browser.start" });
    expect(posted.at(-1)).toMatchObject({ type: "agentd.error", message: expect.stringMatching(/not configured/) });
  });
});
