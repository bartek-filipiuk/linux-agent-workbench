import { EventEmitter } from "node:events";
import type { BrowserSessionManager } from "../src/session/browser-session-manager.js";
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Daemon, type ProviderConfig } from "../src/ipc.js";
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

async function bootWith(adapter: FakeModelAdapter, prepareWorkspace?: (dir: string) => void, browser?: BrowserSessionManager, provider?: "codex", extraConfig: Record<string, unknown> = {}) {
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
  const adapterCalls: { model: string; config: ProviderConfig }[] = [];
  const d = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, root) => new TerminalSessionManager({ runtime, runtimeRoot: root, imageId, connect: (p) => SocketTerminalWorker.connect(p) }),
    makeAdapter: (model, _key, config) => { adapterCalls.push({ model, config }); return adapter; },
    ...(browser ? { makeBrowser: () => browser } : {}),
    post: (m) => posted.push(m as Record<string, unknown>),
  });
  await d.handle({ type: "config.init", provider, apiKey: "sk-x", model: "fake", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot, ...extraConfig });
  await d.handle({ type: "session.start", workspacePath: workspace, networkMode: "open" });
  const last = (type: string) => [...posted].reverse().find((p) => p.type === type);
  return { d, posted, last, workspace, adapterCalls };
}
const boot = (adapter: FakeModelAdapter) => bootWith(adapter);
const settle = (pred: () => boolean, ms = 3000) => expect.poll(pred, { timeout: ms }).toBe(true);

describe("Daemon run flow", () => {
  it("keeps a budget pause isolated from stale requests, ordinary resume and manual login", async () => {
    class BrowserStub extends EventEmitter {
      status = { state: "ready", manual: false };
      setFramesEnabled() {}
      async control(command: { kind: string; enabled?: boolean }) {
        this.status = { state: "ready", manual: !!command.enabled }; this.emit("status", this.status); return this.status;
      }
    }
    const browser = new BrowserStub();
    const adapter = new FakeModelAdapter([{ toolCalls: [{ name: "terminal_observe", args: {} }] }, { text: "done" }]);
    const { d, last, adapterCalls } = await bootWith(adapter, undefined, browser as unknown as BrowserSessionManager, "codex");
    await d.handle({ type: "run.start", goal: "g", limits: { maxTurns: 1, maxDurationMinutes: 30 } });
    await settle(() => last("run.state")?.state === "budget_paused");
    const runId = last("run.state")!.runId;
    expect(last("run.state")).toMatchObject({ budget: { reason: "maxTurns", limits: { maxCostUsd: null, maxDurationMs: 1800000 } } });
    await d.handle({ type: "run.budget", runId: "stale-run", action: "unlimited_steps" });
    expect(last("agentd.error")?.message).toMatch(/no longer paused/);
    await d.handle({ type: "run.resume" });
    await d.handle({ type: "lease.take", owner: "agent" });
    expect(last("lease.state")).toMatchObject({ owner: "human" });
    expect(adapter.inputs).toHaveLength(1);
    await d.handle({ type: "run.start", goal: "replace paused task" });
    expect(adapterCalls).toHaveLength(1);
    await d.handle({ type: "ui.query", requestId: "manual", kind: "browser", command: { kind: "manual", enabled: true } });
    await d.handle({ type: "run.budget", runId, action: "unlimited_steps" });
    expect(last("agentd.error")?.message).toMatch(/Finish manual login/);
    expect(adapter.inputs).toHaveLength(1);
    await d.handle({ type: "ui.query", requestId: "finish", kind: "browser", command: { kind: "manual", enabled: false } });
    await d.handle({ type: "run.budget", runId, action: "unlimited_steps" });
    await settle(() => last("run.state")?.state === "completed");
    expect(last("run.state")).toMatchObject({ runId, budget: { limits: { maxTurns: null, maxToolCalls: null, maxDurationMs: 1800000 } } });
    expect(adapterCalls).toHaveLength(1);
  });

  it("follows a chosen playbook and distills an unguided run into a draft the human accepts", async () => {
    const seed = tmpDir("law-seed-");
    fs.writeFileSync(path.join(seed, "allegro-search.md"), "# Allegro search\n1. open the listing URL\n");
    const playbooksDir = path.join(tmpDir("law-pb-"), "playbooks");
    const observe = { toolCalls: [{ name: "terminal_observe", args: {} }] };
    const adapter = new FakeModelAdapter([{ text: "done" }, observe, observe, observe, { text: "finished" }, { text: "# Check the screen\n## Steps\n1. terminal_observe\n" }]);
    const { d, last, posted } = await bootWith(adapter, undefined, undefined, undefined, { playbooksDir, playbooksSeed: seed });
    await d.handle({ type: "ui.query", requestId: "q1", kind: "playbooks" });
    expect(last("ui.reply")).toMatchObject({ requestId: "q1", result: [{ slug: "allegro-search", name: "Allegro search", draft: false }] });
    await d.handle({ type: "run.start", goal: "missing", playbook: "nope" });
    expect(last("agentd.error")?.message).toContain("not found");
    await d.handle({ type: "run.start", goal: "search", playbook: "allegro-search" });
    await settle(() => last("run.state")?.state === "completed");
    expect(adapter.contexts[0]!.system).toMatch(/Playbook for this task[\s\S]*open the listing URL$/);
    await new Promise(r => setTimeout(r, 50));
    expect(posted.some(p => p.type === "playbook.draft")).toBe(false); // a guided run is not distilled
    await d.handle({ type: "run.start", goal: "Look at the screen three times" });
    await settle(() => posted.some(p => p.type === "playbook.draft"));
    expect(last("playbook.draft")).toMatchObject({ slug: "look-at-the-screen-three-times", name: "Check the screen" });
    expect(adapter.contexts.at(-1)).toMatchObject({ tools: [] });
    expect(adapter.inputs.at(-1)).toMatchObject({ goal: expect.stringMatching(/Tool trace \(3 calls\)[\s\S]*terminal_observe done/) });
    expect(fs.readFileSync(path.join(playbooksDir, "drafts", "look-at-the-screen-three-times.md"), "utf8")).toContain("# Check the screen");
    await d.handle({ type: "ui.query", requestId: "q2", kind: "playbook_accept", slug: "look-at-the-screen-three-times" });
    expect(last("ui.reply")).toMatchObject({ requestId: "q2", result: [{ slug: "allegro-search", draft: false }, { slug: "look-at-the-screen-three-times", draft: false }] });
  });

  it("routes per-run model choices without changing defaults for later runs", async () => {
    const { d, last, adapterCalls } = await bootWith(new FakeModelAdapter([{ text: "done" }]), undefined, undefined, "codex");
    await d.handle({ type: "run.start", goal: "g", modelSelection: { model: "gpt-6-astra", effort: "medium" } });
    await settle(() => last("run.state")?.state === "completed");
    expect(adapterCalls[0]).toMatchObject({ model: "gpt-6-astra", config: { provider: "codex", effort: "medium" } });
    await d.handle({ type: "run.start", goal: "use configured settings" });
    expect(adapterCalls[1]).toMatchObject({ model: "fake" });
    expect(adapterCalls[1]!.config).not.toHaveProperty("effort");
    await d.handle({ type: "run.stop" });
  });
  it("rejects subscription model overrides under the API provider", async () => {
    const { d, last, adapterCalls } = await boot(new FakeModelAdapter([]));
    await d.handle({ type: "run.start", goal: "g", modelSelection: { model: "gpt-6-astra", effort: "medium" } });
    expect(last("agentd.error")?.message).toContain("Codex provider only");
    expect(adapterCalls).toHaveLength(0);
  });
  it("pauses before opening manual login and blocks resume/start/agent leases until it finishes", async () => {
    class BrowserStub extends EventEmitter {
      status = { state: "ready", manual: false };
      setFramesEnabled() {}
      async control(command: { kind: string; enabled?: boolean }) {
        this.status = { state: "ready", manual: !!command.enabled }; this.emit("status", this.status); return this.status;
      }
    }
    const browser = new BrowserStub();
    const adapter = new FakeModelAdapter([{ delayMs: 100, toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "STALE" } }] }, { text: "done" }]);
    const { d, last } = await bootWith(adapter, undefined, browser as unknown as BrowserSessionManager);
    await d.handle({ type: "run.start", goal: "g" });
    await d.handle({ type: "ui.query", requestId: "manual", kind: "browser", command: { kind: "manual", enabled: true } });
    expect(last("ui.reply")).toMatchObject({ result: { manual: true } });
    expect(last("run.state")).toMatchObject({ state: "handoff" });
    expect(fw!.screen).not.toContain("STALE");
    for (const message of [{ type: "run.resume" }, { type: "lease.take", owner: "agent" }, { type: "run.start", goal: "new" }]) {
      await d.handle(message); expect(last("agentd.error")?.message).toMatch(/Finish manual login/);
    }
    await d.handle({ type: "ui.query", requestId: "finish", kind: "browser", command: { kind: "manual", enabled: false } });
    expect(last("run.state")).toMatchObject({ state: "handoff" });
    await d.handle({ type: "run.resume" });
    await settle(() => last("run.state")?.state === "completed");
  });

  it("ignores stale frame acknowledgements across preview generations", async () => {
    class BrowserStub extends EventEmitter { status = { state: "ready" }; setFramesEnabled() {} }
    const browser = new BrowserStub();
    const { d, posted } = await bootWith(new FakeModelAdapter([]), undefined, browser as unknown as BrowserSessionManager);
    await d.handle({ type: "browser.frames", enabled: true });
    const frame = (generation: number) => browser.emit("frame", { width: 1280, height: 800, generation, jpeg: new Uint8Array([255,216]) });
    const frames = () => posted.filter(m => m.type === "browser.frame");
    browser.emit("status", { state: "ready", generation: 1 }); frame(1); frame(1);
    const oldId = frames()[0]!.id;
    browser.emit("status", { state: "ready", generation: 2 }); frame(2); frame(2);
    await d.handle({ type: "browser.frameAck", id: oldId }); expect(frames()).toHaveLength(2);
    await d.handle({ type: "browser.frameAck", id: frames()[1]!.id }); expect(frames()).toHaveLength(3);
    expect(frames()[2]!.generation).toBe(2);
  });

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
    const leases = posted.filter((p) => p.type === "lease.state" && p.surface === "terminal").map((p) => p.owner);
    expect(leases).toEqual(["agent", "human"]);
    expect(posted.filter((p) => p.type === "lease.state" && p.surface === "browser").map((p) => p.owner)).toEqual(["agent", "human"]);
    expect(last("run.commentary")).toMatchObject({ text: "Two entries." });
    expect(posted.filter((p) => p.type === "run.tool" && p.status === "done")).toHaveLength(3);
    expect(last("run.state")).toMatchObject({ state: "completed", finalText: "Two entries.", turns: 3, toolCalls: 3, costUsd: null });
    expect(fw!.screen).toBe("$ ls -al\n$ ");
    await d.handle({ type: "ui.query", requestId: "history", kind: "history" });
    const history = last("ui.reply")!.result as Array<{ id: string }>;
    expect(history).toHaveLength(1);
    await d.handle({ type: "ui.query", requestId: "detail", kind: "detail", runId: history[0]!.id });
    expect(last("ui.reply")).toMatchObject({ result: { goal: "count files", state: "completed", finalText: "Two entries." } });
    await d.handle({ type: "ui.query", requestId: "other", kind: "detail", runId: "not-in-this-workspace" });
    expect(last("ui.reply")).toHaveProperty("error");
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
    await d.handle({ type: "session.network", networkMode: "none" });
    expect(last("agentd.error")).toMatchObject({ message: expect.stringMatching(/Finish or stop/) });
    expect(last("session.state")).toMatchObject({ state: "ready", networkMode: "open" });
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
    await d.handle({ type: "session.network", networkMode: "none" });
    expect(last("agentd.error")).toMatchObject({ message: expect.stringMatching(/Finish or stop/) });
    await d.handle({ type: "run.resume" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
  });

  it("human can take the lease mid-run: the run parks in handoff and resumes when control is given back", async () => {
    const adapter = new FakeModelAdapter([
      { text: "wait", delayMs: 300, toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "ok" },
    ]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    await d.handle({ type: "lease.take", owner: "human" });
    // Instead of burning turns against a locked surface the run waits for the human.
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "handoff");
    expect(last("run.tool")).toMatchObject({ name: "terminal_observe", status: "denied" });
    expect(last("run.handoff")).toMatchObject({ reason: expect.stringMatching(/human holds the terminal/) });
    await d.handle({ type: "lease.take", owner: "agent" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
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
