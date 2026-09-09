import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BUDGETS } from "@law/protocol";
import { Store } from "../src/storage/store.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { RunController } from "../src/orchestrator/run-controller.js";
import { BudgetTracker, BudgetExceededError, costOf } from "../src/orchestrator/budgets.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpSocketPath } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
let worker: SocketTerminalWorker | undefined;
let store: Store | undefined;

async function setup() {
  const p = tmpSocketPath();
  fw = await FakeWorker.listen(p);
  worker = await SocketTerminalWorker.connect(p, { requestTimeoutMs: 2_000 });
  store = new Store(":memory:");
  return { ws: store.createWorkspace("/tmp/ws"), store, worker, fw };
}
afterEach(async () => {
  worker?.close();
  await fw?.close();
  store?.close();
  worker = fw = store = undefined;
});

const input = (workspaceId: string) => ({ workspaceId, goal: "list files", networkMode: "open" as const });
const toolResultsOf = (i: unknown) => (i as { toolResults: { callId: string; output: string }[] }).toolResults;

describe("RunController", () => {
  it("parks for manual login, skips actions from an in-flight model turn and waits for explicit resume", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { delayMs: 100, toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "STALE" } }, { name: "terminal_observe", args: {} }] },
      { text: "done" },
    ]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const running = rc.start();
    await rc.pauseForHuman("manual login");
    expect(rc.state).toBe("handoff");
    expect(fw.screen).not.toContain("STALE");
    expect(adapter.inputs).toHaveLength(1);
    rc.resumeFromHandoff();
    expect((await running).state).toBe("completed");
    expect(toolResultsOf(adapter.inputs[1]).every(r => r.output.includes("Human took control"))).toBe(true);
  });

  it("lets persistent providers manage context and closes them at completion", async () => {
    const { ws, store, worker } = await setup();
    const observe = { toolCalls: [{ name: "terminal_observe", args: {} }] };
    const adapter = Object.assign(new FakeModelAdapter([observe, observe, { text: "done" }]), { managesContext: true, close: vi.fn() });
    const rc = new RunController({ store, adapter, worker, compactEvery: 1 }, input(ws));
    expect((await rc.start()).state).toBe("completed");
    expect(adapter.inputs.map((i) => "goal" in i ? "goal" : "results")).toEqual(["goal", "results", "results"]);
    expect(store.listEvents(rc.runId).some((e) => e.type === "context.compacted")).toBe(false);
    expect(adapter.close).toHaveBeenCalledOnce();
  });
  it("never persists a tool result's image, only its text", async () => {
    const { ws, store, worker } = await setup();
    const tools = {
      specs: [{ name: "peek", description: "peek", parameters: { type: "object", properties: {} } }],
      execute: async () => ({ output: JSON.stringify({ seen: "heading" }), imageJpegBase64: "QUJDREVGR0hJSktMTU5PUA==" }),
    };
    const adapter = new FakeModelAdapter([{ toolCalls: [{ name: "peek", args: {} }] }, { text: "done" }]);
    const rc = new RunController({ store, adapter, worker, tools }, input(ws));
    const out = await rc.start();
    expect(out.state).toBe("completed");
    const call = store.listToolCalls(out.runId)[0]!;
    expect(call.output_json).toBe(JSON.stringify({ seen: "heading" }));
    const everything = [...store.listEvents(out.runId).map((e) => JSON.stringify(e.payload)), call.output_json].join("\n");
    expect(everything).not.toContain("QUJDREVGR0hJSktMTU5PUA");
  });

  it("compacts the context every N turns: pending tool results plus a summary request, then a fresh chain from the goal", async () => {
    const { ws, store, worker } = await setup();
    const observe = { toolCalls: [{ name: "terminal_observe", args: {} }] };
    const adapter = new FakeModelAdapter([observe, observe, { text: "STATE: two observes done" }, observe, { text: "finished" }]);
    const rc = new RunController({ store, adapter, worker, compactEvery: 2 }, input(ws));
    const out = await rc.start();
    expect(out.state).toBe("completed");
    // inputs: goal, results, results+summary request, fresh goal (with the summary), results
    expect(adapter.inputs.map((i) => ("goal" in i ? "goal" : "message" in i && i.message ? "results+message" : "results"))).toEqual(["goal", "results", "results+message", "goal", "results"]);
    expect((adapter.inputs[3] as { goal: string }).goal).toContain("STATE: two observes done");
    expect((adapter.inputs[3] as { goal: string }).goal).toContain("list files");
    expect(adapter.contexts[3]?.previousResponseId).toBeUndefined(); // the chain restarted
    expect(adapter.contexts[4]?.previousResponseId).toMatch(/^fake-resp-/); // and continues from the fresh turn
    expect(store.listEvents(out.runId).some((e) => e.type === "context.compacted")).toBe(true);
  });

  it("runs a scripted session to completion and persists everything", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { text: "I will list files", toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "ls -al" } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "Done: files listed." },
    ]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const commentary: string[] = [];
    rc.on("commentary", (t) => commentary.push(t));
    const out = await rc.start();
    expect(out).toMatchObject({ state: "completed", finalText: "Done: files listed." });
    expect(commentary).toEqual(["I will list files", "Done: files listed."]);
    expect(fw.screen).toBe("$ ls -al\n$ ");
    expect(store.getRun(out.runId)).toMatchObject({ state: "completed", turns: 3, tool_calls: 3 });
    expect(store.listToolCalls(out.runId).map((t) => t.status)).toEqual(["done", "done", "done"]);
    expect(toolResultsOf(adapter.inputs[1]).map((r) => r.callId)).toEqual(["call-2", "call-3"]);
    expect(adapter.contexts[1]?.previousResponseId).toBe("fake-resp-1");
    expect(adapter.contexts[0]?.tools.map((t) => t.name)).toContain("terminal_input");
    expect(store.listEvents(out.runId).map((e) => e.type)).toContain("tool.done");
  });

  it("stops while the model call is pending", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = Object.assign(new FakeModelAdapter([{ text: "slow", delayMs: 5_000 }]), { close: vi.fn() });
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const p = rc.start();
    setTimeout(() => rc.stop(), 20);
    const out = await p;
    expect(out.state).toBe("stopped");
    expect(store.getRun(out.runId)?.state).toBe("stopped");
    expect(adapter.close).toHaveBeenCalledOnce();
  });

  it("stops while a tool call is executing and records it as error", async () => {
    const { ws, store, worker, fw } = await setup();
    fw.hangInputs = true;
    const adapter = new FakeModelAdapter([{ toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "sleep 100" } }] }]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const p = rc.start();
    setTimeout(() => rc.stop(), 20);
    const out = await p;
    expect(out.state).toBe("stopped");
    expect(store.listToolCalls(out.runId)[0]).toMatchObject({ status: "error", error_code: "CANCELLED" });
    await expect.poll(() => fw.received.some((e) => e.type === "worker.cancel")).toBe(true);
  });

  it("parks after the last permitted step, then resumes the same context exactly once", async () => {
    const { ws, store, worker } = await setup();
    const observe = { toolCalls: [{ name: "terminal_observe", args: {} }] };
    const adapter = Object.assign(new FakeModelAdapter([observe, observe, { text: "done" }]), { managesContext: true, close: vi.fn() });
    const rc = new RunController({ store, adapter, worker, budgets: { ...DEFAULT_BUDGETS, maxTurns: 2 } }, input(ws));
    const running = rc.start();
    await expect.poll(() => rc.state).toBe("budget_paused");
    expect(rc.stats).toMatchObject({ turns: 2, toolCalls: 2 });
    expect(adapter.close).not.toHaveBeenCalled();
    rc.resumeFromHandoff();
    expect(rc.state).toBe("budget_paused");
    expect(() => rc.resumeBudget("unlimited_time")).toThrow(/reached limit/);
    rc.resumeBudget("add_steps");
    expect(() => rc.resumeBudget("add_steps")).toThrow(/not paused/);
    expect(await running).toMatchObject({ runId: rc.runId, state: "completed" });
    expect(adapter.inputs).toHaveLength(3);
    expect(adapter.inputs.filter(i => "goal" in i)).toHaveLength(1);
    expect(toolResultsOf(adapter.inputs[2])).toHaveLength(1);
    expect(adapter.inputs[2]).toMatchObject({ message: expect.stringContaining("Re-observe") });
    expect(adapter.contexts[2]?.previousResponseId).toBe("fake-resp-3");
    expect(rc.budgetStatus.limits).toMatchObject({ maxTurns: 102, maxDurationMs: DEFAULT_BUDGETS.maxDurationMs, maxCostUsd: 10 });
    expect(adapter.close).toHaveBeenCalledOnce();
  });

  it("stop releases a parked provider without another model call", async () => {
    const { ws, store, worker } = await setup();
    const adapter = Object.assign(new FakeModelAdapter([{ toolCalls: [{ name: "terminal_observe", args: {} }] }]), { close: vi.fn() });
    const rc = new RunController({ store, adapter, worker, budgets: { ...DEFAULT_BUDGETS, maxTurns: 1 } }, input(ws));
    const running = rc.start();
    await expect.poll(() => rc.state).toBe("budget_paused");
    await rc.pauseForHuman("manual");
    rc.stop();
    expect((await running).state).toBe("stopped");
    expect(adapter.inputs).toHaveLength(1);
    expect(adapter.close).toHaveBeenCalledOnce();
  });

  it("skips stale actions in a batch after a time pause and rechecks policy on new actions", async () => {
    const { ws, store, worker, fw } = await setup();
    let now = 0;
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_observe", args: {} }, { name: "terminal_input", args: { kind: "text", text: "STALE" } }] },
      { toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "DENIED" } }] }, { text: "done" },
    ]);
    const policy = { authorize: vi.fn(async () => ({ allow: true as const })) };
    const rc = new RunController({ store, adapter, worker, policy, now: () => now, budgets: { ...DEFAULT_BUDGETS, maxDurationMs: 10 } }, input(ws));
    rc.on("tool", event => { if (event.status === "done") now = 11; });
    const running = rc.start();
    await expect.poll(() => rc.state).toBe("budget_paused");
    now = 100000;
    expect(rc.budgetStatus.elapsedMs).toBe(11);
    // A policy change while the human owns the sandbox must apply after resume.
    policy.authorize.mockImplementation(async () => ({ allow: false, code: "POLICY_DENIED", reason: "changed" }) as never);
    rc.resumeBudget("add_time");
    expect((await running).state).toBe("completed");
    expect(fw.screen).not.toMatch(/STALE|DENIED/);
    expect(toolResultsOf(adapter.inputs[1])[1]?.output).toContain("skipped");
    expect(policy.authorize).toHaveBeenCalledTimes(2);
    expect(rc.budgetStatus.limits.maxTurns).toBe(DEFAULT_BUDGETS.maxTurns);
  });

  it("unlimited steps cross both old caps without removing the spending or time limit", async () => {
    const { ws, store, worker } = await setup();
    const adapter = new FakeModelAdapter([...Array.from({ length: 205 }, () => ({ toolCalls: [{ name: "peek", args: {} }] })), { text: "done" }]);
    const rc = new RunController({ store, adapter, worker, tools: { specs: [], execute: async () => ({ output: "ok" }) }, budgets: { ...DEFAULT_BUDGETS, maxTurns: null, maxToolCalls: null } }, input(ws));
    expect((await rc.start()).state).toBe("completed");
    expect(rc.stats).toMatchObject({ turns: 206, toolCalls: 205 });
    expect(store.listEvents(rc.runId).filter(e => e.type === "cost.unknown_model")).toHaveLength(1);
    expect(rc.budgetStatus.limits.maxCostUsd).toBe(10);
  });

  it("feeds denials and invalid args back to the model instead of failing", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "bad\x00" } }, { name: "terminal_observe", args: {} }] },
      { text: "ok" },
    ]);
    const policy = {
      authorize: async (c: { name: string }) =>
        c.name === "terminal_observe" ? { allow: false as const, code: "POLICY_DENIED" as const, reason: "no peeking" } : { allow: true as const },
    };
    const rc = new RunController({ store, adapter, worker, policy }, input(ws));
    const out = await rc.start();
    expect(out.state).toBe("completed");
    const outputs = toolResultsOf(adapter.inputs[1]).map((r) => JSON.parse(r.output));
    expect(outputs[0]).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(outputs[1]).toMatchObject({ error: { code: "POLICY_DENIED", message: "no peeking" } });
    expect(store.listToolCalls(out.runId).map((t) => t.status)).toEqual(["error", "denied"]);
  });

  it("enters handoff on request_human and resumes with a fresh observation", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "request_human", args: { reason: "login" } }] },
      { text: "thanks" },
    ]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const states: string[] = [];
    rc.on("state", (s) => states.push(s));
    const handoff = new Promise<{ reason: string }>((r) => rc.on("handoff", r));
    const p = rc.start();
    expect(await handoff).toEqual({ reason: "login" });
    expect(rc.state).toBe("handoff");
    rc.resumeFromHandoff();
    const out = await p;
    expect(out.state).toBe("completed");
    expect(states).toEqual(["running", "handoff", "running", "completed"]);
    const output = JSON.parse(toolResultsOf(adapter.inputs[1])[0]!.output);
    expect(output).toMatchObject({ resumed: true, observation: { revision: 0 } });
  });

  it("stop during handoff ends the run as stopped", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([{ toolCalls: [{ name: "request_human", args: { reason: "login" } }] }]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const handoff = new Promise<void>((r) => rc.on("handoff", () => r()));
    const p = rc.start();
    await handoff;
    rc.stop();
    expect((await p).state).toBe("stopped");
  });

  it("a denial carrying a handoff reason pauses the run and resumes with an observation", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { text: "resumed" },
    ]);
    const policy = { authorize: async () => ({ allow: false as const, code: "LEASE_DENIED" as const, reason: "prompt visible", handoff: "nested permission prompt on screen" }) };
    const rc = new RunController({ store, adapter, worker, policy }, input(ws));
    const handoff = new Promise<{ reason: string }>((r) => rc.on("handoff", r));
    const p = rc.start();
    expect((await handoff).reason).toMatch(/nested permission prompt/);
    fw.screen = "$ done";
    rc.resumeFromHandoff();
    const out = await p;
    expect(out.state).toBe("completed");
    const output = JSON.parse(toolResultsOf(adapter.inputs[1])[0]!.output);
    expect(output).toMatchObject({ resumed: true, observation: { screen: "$ done" } });
    expect(store.listToolCalls(out.runId)[0]?.status).toBe("denied");
  });

  it("fails cleanly when the model adapter throws", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = { model: "boom", close: vi.fn(), turn: async () => { throw new Error("upstream 500"); } };
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const out = await rc.start();
    expect(out).toMatchObject({ state: "failed", endReason: "upstream 500" });
    expect(adapter.close).toHaveBeenCalledOnce();
  });
});

describe("costOf", () => {
  it("bills cached input tokens at a tenth of the input price", () => {
    const prices = { m: { inputUsdPerMTok: 1, outputUsdPerMTok: 2 } };
    expect(costOf("m", { inputTokens: 1000, outputTokens: 100, cachedInputTokens: 500 }, prices)).toBeCloseTo((500 + 50 + 200) / 1_000_000, 12);
    expect(costOf("m", { inputTokens: 1000, outputTokens: 0 }, prices)).toBeCloseTo(1000 / 1_000_000, 12);
    expect(costOf("other", { inputTokens: 1, outputTokens: 1 }, prices)).toBeUndefined();
  });
});

describe("BudgetTracker", () => {
  it("excludes nested human pauses and separates unlimited steps from time and cost", () => {
    let now = 0;
    const tracker = new BudgetTracker({ ...DEFAULT_BUDGETS }, () => now);
    now = 20; tracker.pauseClock(); tracker.pauseClock();
    now = 500; tracker.resumeClock();
    expect(tracker.elapsedMs()).toBe(20);
    now = 1000; tracker.resumeClock(); now = 1020;
    expect(tracker.elapsedMs()).toBe(40);
    tracker.extend("unlimited_steps");
    expect(tracker.limits).toEqual({ ...DEFAULT_BUDGETS, maxTurns: null, maxToolCalls: null });
    tracker.addCost(11);
    expect(() => tracker.check()).toThrow(/maxCostUsd/);
    tracker.extend("add_cost");
    expect(() => tracker.check()).not.toThrow();
    expect(tracker.limits.maxCostUsd).toBe(21);
  });
  it("throws the specific limit", () => {
    let t = 0;
    const b = new BudgetTracker({ maxTurns: 1, maxToolCalls: 1, maxDurationMs: 10, maxCostUsd: 0.5 }, () => t);
    b.check();
    b.addTurn();
    expect(() => b.check()).toThrow(BudgetExceededError);
    const c = new BudgetTracker({ maxTurns: 9, maxToolCalls: 9, maxDurationMs: 10, maxCostUsd: 0.5 }, () => t);
    t = 11;
    expect(() => c.check()).toThrow(/maxDurationMs/);
    const d = new BudgetTracker({ maxTurns: 9, maxToolCalls: 9, maxDurationMs: 1e9, maxCostUsd: 0.5 }, () => 0);
    d.addCost(0.6);
    expect(() => d.check()).toThrow(/maxCostUsd/);
  });
});
