import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_BUDGETS } from "@law/protocol";
import { Store } from "../src/storage/store.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { RunController } from "../src/orchestrator/run-controller.js";
import { BudgetTracker, BudgetExceededError } from "../src/orchestrator/budgets.js";
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
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 5_000 }]);
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const p = rc.start();
    setTimeout(() => rc.stop(), 20);
    const out = await p;
    expect(out.state).toBe("stopped");
    expect(store.getRun(out.runId)?.state).toBe("stopped");
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

  it("ends with budget_exceeded when turns run out", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter(Array.from({ length: 5 }, () => ({ toolCalls: [{ name: "terminal_observe", args: {} }] })));
    const rc = new RunController({ store, adapter, worker, budgets: { ...DEFAULT_BUDGETS, maxTurns: 2 } }, input(ws));
    const out = await rc.start();
    expect(out).toMatchObject({ state: "budget_exceeded", endReason: "maxTurns" });
    expect(adapter.inputs).toHaveLength(2);
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
    const adapter = { model: "boom", turn: async () => { throw new Error("upstream 500"); } };
    const rc = new RunController({ store, adapter, worker }, input(ws));
    const out = await rc.start();
    expect(out).toMatchObject({ state: "failed", endReason: "upstream 500" });
  });
});

describe("BudgetTracker", () => {
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
