import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BUDGETS, type BrowserObservation } from "@law/protocol";
import { JevClient, JevConfig, type JevReply, type JevRequest } from "../src/provider/jev.js";
import { actionSpace, BrowserTask } from "../src/orchestrator/jev-browser.js";
import { RunController } from "../src/orchestrator/run-controller.js";
import { Store } from "../src/storage/store.js";
import { FakeModelAdapter, type ScriptedTurn } from "../src/provider/fake.js";
import type { TerminalWorker } from "../src/worker/types.js";
import { ApprovalManager } from "../src/policy/approvals.js";
import { BrowserActionPolicy } from "../src/policy/browser-policy.js";
import { dataDir, runtimeDir, containerLabel, profileVolume } from "../src/paths.js";
import { sessionIdFor } from "../src/runtime/podman.js";
import { codexEnvironment } from "../src/provider/codex-process.js";

const request: JevRequest = { state: {}, questions: { operation: { type: "choice", instructions: "Choose", criteria: { CLICK: "click", DONE: "done" } } } };
const reply = (operation = "CLICK", confidence = 0.99): JevReply => ({ model: "jev-1.13.0", answers: {
  operation: { type: "choice", choice: operation, confidence, probabilities: { [operation]: 1 } },
  click: { type: "choice", choice: "e1", confidence, probabilities: { e1: 1 } },
}, usage: { input_tokens: 100, output_tokens: 10 }, elapsedMs: 10, costUsd: 0.0000042 });
const valid = () => ({ ...reply(), answers: { operation: { ...reply().answers.operation!, probabilities: { CLICK: 0.9, DONE: 0.1 } } } });
const config = JevConfig.parse({ apiKey: "apikey_secret-test-only" });

describe("TypeSafe host boundary", () => {
  it("uses only the fixed endpoint and blocks redirects; validates and meters replies", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(valid())));
    const result = await new JevClient(config, fetcher).evaluate(request, new AbortController().signal);
    expect(fetcher.mock.calls[0]).toMatchObject(["https://api.typesafe.ai/v1/systemone", { redirect: "error", method: "POST" }]);
    expect(result.costUsd).toBeCloseTo(0.0000042);
  });
  it.each([401, 429])("does not leak provider bodies or retry HTTP %s", async status => {
    const fetcher = vi.fn(async () => new Response("apikey_secret-test-only", { status }));
    await expect(new JevClient(config, fetcher).evaluate(request, new AbortController().signal)).rejects.toThrow(`Jev HTTP ${status}`);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([503, 529])("recovers from transient HTTP %s with one inference retry", async status => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("private provider error", { status })).mockResolvedValueOnce(new Response(JSON.stringify(valid())));
    const result = await new JevClient(config, fetcher).evaluate(request, new AbortController().signal);
    expect(result.attempts).toBe(2); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("bounds persistent overload to two attempts and exposes only the safe HTTP status", async () => {
    const fetcher = vi.fn(async () => new Response("apikey_private_error", { status: 503 }));
    await expect(new JevClient(config, fetcher).evaluate(request, new AbortController().signal)).rejects.toMatchObject({ code: "http_error", status: 503, message: "Jev HTTP 503" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("includes retry backoff in the original deadline", async () => {
    const fetcher = vi.fn(async () => new Response("overload", { status: 503 }));
    await expect(new JevClient({ ...config, timeoutMs: 100 }, fetcher).evaluate(request, new AbortController().signal)).rejects.toMatchObject({ code: "timeout_or_transport" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("Stop cancels retry backoff without a second provider request", async () => {
    const stop = new AbortController();
    const fetcher = vi.fn(async () => { queueMicrotask(() => stop.abort(new Error("stopped"))); return new Response("overload", { status: 503 }); });
    await expect(new JevClient(config, fetcher).evaluate(request, stop.signal)).rejects.toThrow("stopped");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["outside", "missing", "sum", "winner", "nan"])("rejects malformed distributions: %s", async kind => {
    const data = valid(); const a = data.answers.operation;
    if (kind === "outside") a.choice = "evil";
    if (kind === "missing") delete (a.probabilities as Record<string, number>).DONE;
    if (kind === "sum") a.probabilities.CLICK = 0.2;
    if (kind === "winner") a.choice = "DONE";
    if (kind === "nan") a.confidence = NaN;
    await expect(new JevClient(config, async () => new Response(JSON.stringify(data))).evaluate(request, new AbortController().signal)).rejects.toThrow(/invalid/);
  });
  it("enforces request deadline and sanitizes transport errors", async () => {
    const fetcher: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new Error("secret key transport error"))));
    await expect(new JevClient({ ...config, timeoutMs: 100 }, fetcher).evaluate(request, new AbortController().signal)).rejects.toThrow("Jev request failed or timed out");
  });
  it("does not give TypeSafe credentials to the primary model process", () => {
    vi.stubEnv("TYPESAFE_API_KEY", "secret"); vi.stubEnv("JEV_API_KEY", "secret");
    expect(codexEnvironment().TYPESAFE_API_KEY).toBeUndefined(); expect(codexEnvironment().JEV_API_KEY).toBeUndefined();
  });
  it("rejects oversized response streams and cancels the reader", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(256001)); }, cancel });
    await expect(new JevClient(config, async () => new Response(body)).evaluate(request, new AbortController().signal)).rejects.toThrow("Jev response exceeds the size limit");
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects oversized context before contacting the provider", async () => {
    const fetcher = vi.fn();
    await expect(new JevClient(config, fetcher).evaluate({ ...request, state: "x".repeat(160001) }, new AbortController().signal)).rejects.toThrow("context exceeds");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

const observation = (): BrowserObservation => ({ revision: 1, activePageId: "p1", url: "https://example.com", title: "Test", viewport: { width: 1000, height: 700 }, scroll: { x: 0, y: 0, maxY: 0 }, pages: [], pageText: "Form", elements: [
  { ref: "e1", role: "button", name: "Search", enabled: true, editable: false, inViewport: true, operations: ["click"], bounds: { x: 0, y: 0, width: 40, height: 20 } },
] });
let stores: Store[] = [];
afterEach(() => { stores.forEach(s => s.close()); stores = []; vi.unstubAllEnvs(); });

function setup(options: { evaluate?: (r: JevRequest, signal: AbortSignal) => Promise<JevReply>; policy?: BrowserActionPolicy; maxTurns?: number; act?: () => string; first?: boolean; script?: ScriptedTurn[] } = {}) {
  const store = new Store(":memory:"); stores.push(store); const obs = observation();
  const adapter = new FakeModelAdapter(options.script ?? [{ toolCalls: [{ name: "browser_task", args: { goal: "Search" } }] }, { text: "Planner received result" }]);
  let calls = 0;
  const execute = vi.fn(async (call: { name: string }) => ({ output: call.name === "browser_act" ? options.act?.() ?? "{}" : "page observation" }));
  const evaluator = { evaluate: vi.fn(options.evaluate ?? (async () => reply(calls++ ? "DONE" : "CLICK"))) };
  const rc = new RunController({ store, adapter, worker: { cancel: vi.fn(), observe: vi.fn(async () => ({})) } as unknown as TerminalWorker,
    tools: { specs: [{ name: "browser_act", description: "act", parameters: {} }, { name: "browser_read", description: "read", parameters: {} }], execute }, ...(options.policy ? { policy: options.policy } : {}),
    budgets: { ...DEFAULT_BUDGETS, maxTurns: options.maxTurns ?? 30 },
    hybrid: { evaluator, observation: () => obs, minConfidence: 0.55, ...(options.first ? { strategy: "first" as const } : {}) },
  }, { workspaceId: store.createWorkspace("/tmp/jev-test"), goal: "Search", networkMode: "open" });
  return { rc, store, adapter, execute, evaluator, obs };
}

describe("hybrid controller", () => {
  it("Jev First delegates navigation and supplies separate fresh evidence in two primary turns", async () => {
    const { rc, store, adapter } = setup({ first: true, script: [
      { toolCalls: [{ name: "browser_task", args: { goal: "Search", url: "https://example.com" } }] }, { text: "Checked evidence" },
    ] });
    await rc.start();
    const names = store.listToolCalls(rc.runId).map(c => c.name);
    expect(names).toEqual(["browser_task", "browser_act", "browser_observe", "browser_act", "browser_observe", "browser_observe", "browser_read"]);
    expect(adapter.inputs).toHaveLength(2);
    const offered = adapter.contexts[0]!.tools.map(t => t.name);
    expect(offered).toContain("browser_task"); expect(offered).toContain("browser_fallback"); expect(offered).not.toContain("browser_act");
    const result = JSON.parse((adapter.inputs[1] as { toolResults: { output: string }[] }).toolResults[0]!.output);
    expect(result).toMatchObject({ status: "completion_candidate", verified: false, evidence: { page: "page observation", observation: "page observation" } });
  });
  it("Jev First refuses direct actions and mutating fallback before delegation", async () => {
    const { rc, execute, adapter } = setup({ first: true, script: [
      { toolCalls: [{ name: "browser_act", args: { action: { kind: "navigate", url: "https://example.com" } } },
        { name: "browser_fallback", args: { tool: "browser_act", args: { action: { kind: "navigate", url: "https://example.com" } }, reason: "skip Jev" } }] }, { text: "Blocked" },
    ] });
    await rc.start(); expect(execute).not.toHaveBeenCalled();
    expect(JSON.stringify(adapter.inputs[1])).toContain("require needs_help");
  });
  it("Jev First exceptions enable fallback without bypassing child approval", async () => {
    const obs = observation(); obs.elements[0]!.name = "Purchase";
    const approvals = { isSessionAllowed: () => false, request: vi.fn(async () => "deny" as const) };
    const { rc, execute, store } = setup({ first: true, evaluate: async () => reply("BLOCKED"), policy: new BrowserActionPolicy({ lastObservation: () => obs, approvals }), script: [
      { toolCalls: [{ name: "browser_task", args: { goal: "Purchase" } }] },
      { toolCalls: [{ name: "browser_fallback", args: { tool: "browser_act", args: { action: { kind: "click", ref: "e1", revision: 1 } }, reason: "unsupported action" } }] }, { text: "Denied" },
    ] });
    await rc.start(); expect(approvals.request).toHaveBeenCalledOnce();
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
    expect(JSON.parse(store.getRun(rc.runId)!.continuation_json!).browserFallback).toBe(true);
  });
  it("Jev First never executes a denied initial navigation", async () => {
    const policy = new BrowserActionPolicy({ lastObservation: () => observation(), approvals: { isSessionAllowed: () => false, request: async () => "deny" } });
    const { rc, execute, evaluator, adapter } = setup({ first: true, policy, script: [
      { toolCalls: [{ name: "browser_task", args: { goal: "Inspect", url: "http://127.0.0.1/admin" } }] }, { text: "Denied" },
    ] });
    await rc.start(); expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false); expect(evaluator.evaluate).not.toHaveBeenCalled();
    expect(JSON.stringify(adapter.inputs[1])).toContain("navigation_failed_or_denied");
  });
  it("Jev First Stop interrupts a pending decision and prevents evidence capture", async () => {
    let entered!: () => void; const started = new Promise<void>(r => { entered = r; });
    const { rc, execute } = setup({ first: true, evaluate: async (_r, signal) => { entered(); return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))); } });
    const run = rc.start(); await started; rc.stop(); expect((await run).state).toBe("stopped");
    expect(execute.mock.calls.map(([c]) => c.name)).toEqual(["browser_observe"]);
  });
  it("journals child actions, counts decisions/tools and returns unverified completion to the planner", async () => {
    const { rc, store, adapter } = setup(); await rc.start();
    expect(store.listToolCalls(rc.runId).map(c => c.name)).toEqual(["browser_task", "browser_observe", "browser_act", "browser_observe"]);
    expect(rc.stats).toMatchObject({ turns: 4, toolCalls: 4 });
    expect(JSON.stringify(adapter.inputs[1])).toContain("completion_candidate");
    expect(JSON.stringify(adapter.inputs[1])).toContain('verified');
    expect(JSON.parse(store.getRun(rc.runId)!.continuation_json!).pending).toEqual([]);
  });
  it("honors existing approval denial for an inner click", async () => {
    const obs = observation(); obs.elements[0]!.name = "Purchase";
    const approvals = { isSessionAllowed: () => false, request: vi.fn(async () => "deny" as const) };
    const policy = new BrowserActionPolicy({ lastObservation: () => obs, approvals });
    const { rc, execute, adapter } = setup({ policy }); await rc.start();
    expect(approvals.request).toHaveBeenCalledOnce();
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
    expect(JSON.stringify(adapter.inputs[1])).toContain("uncertain_action_or_denied");
  });
  it("does not replay a failed mutation", async () => {
    const { rc, execute, evaluator } = setup({ act: () => JSON.stringify({ error: { code: "TIMEOUT" } }) }); await rc.start();
    expect(execute.mock.calls.filter(([c]) => c.name === "browser_act")).toHaveLength(1);
    expect(evaluator.evaluate).toHaveBeenCalledOnce();
  });
  it("returns control when repeated clicks make no observable progress", async () => {
    const { rc, execute, evaluator, adapter } = setup({ evaluate: async () => reply() });
    await rc.start();
    expect(execute.mock.calls.filter(([c]) => c.name === "browser_act")).toHaveLength(2);
    expect(evaluator.evaluate).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(adapter.inputs[1])).toContain("no_progress");
    expect(rc.stats.jev?.fallbacks).toBe(1);
  });
  it("falls back without action on low confidence or provider failure", async () => {
    for (const evaluate of [async () => reply("CLICK", 0.1), async () => { throw new Error("Jev unavailable"); }]) {
      const { rc, execute } = setup({ evaluate }); await rc.start();
      expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
    }
  });
  it("Stop cancels an in-flight Jev request without action", async () => {
    let entered!: () => void; const started = new Promise<void>(r => { entered = r; });
    const { rc, execute } = setup({ evaluate: async (_r, signal) => { entered(); return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))); } });
    const run = rc.start(); await started; rc.stop(); expect((await run).state).toBe("stopped");
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
  });
  it.each([false, true])("manual takeover invalidates the decision and resumes the same primary conversation (first=%s)", async first => {
    let entered!: () => void; let finish!: (r: JevReply) => void;
    const started = new Promise<void>(r => { entered = r; });
    const { rc, execute, adapter } = setup({ first, evaluate: async () => { entered(); return new Promise(r => { finish = r; }); } });
    const run = rc.start(); await started; const paused = rc.pauseForHuman("manual"); finish(reply()); await paused;
    expect(rc.state).toBe("handoff"); rc.resumeFromHandoff(); await run;
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
    expect(adapter.inputs).toHaveLength(2);
  });
  it.each([false, true])("budget pause invalidates pending work and continues with the planner (first=%s)", async first => {
    const { rc, execute } = setup({ first, maxTurns: 1 });
    const parked = new Promise<void>(resolve => rc.on("state", state => { if (state === "budget_paused") resolve(); }));
    const run = rc.start(); await parked; rc.resumeBudget("add_steps"); await run;
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
  });
  it.each([false, true])("does not let a late approval execute after Stop (first=%s)", async first => {
    let entered!: () => void; let approve!: (r: "once") => void;
    const waiting = new Promise<void>(r => { entered = r; }); const obs = observation(); obs.elements[0]!.name = "Publish";
    const policy = new BrowserActionPolicy({ lastObservation: () => obs, approvals: { isSessionAllowed: () => false, request: async () => { entered(); return new Promise(r => { approve = r; }); } } });
    const { rc, execute } = setup({ first, policy }); const run = rc.start(); await waiting; rc.stop(); approve("once"); await run;
    expect(execute.mock.calls.some(([c]) => c.name === "browser_act")).toBe(false);
  });
});

it("excludes sensitive/disabled inputs and represents field-value pairs and select options", () => {
  const obs = observation(); const base = obs.elements[0]!;
  obs.elements.push({ ...base, ref: "e2", role: "textbox", operations: ["type"], editable: true }, { ...base, ref: "e3", sensitive: true }, { ...base, ref: "e4", enabled: false },
    { ...base, ref: "e5", operations: ["select"], options: [{ label: "Polish", value: "pl", disabled: false }] });
  const space = actionSpace(obs, BrowserTask.parse({ goal: "Fill", values: [{ name: "query", text: "hello" }] }));
  expect(Object.keys(space.groups.CLICK!)).toEqual(["e1"]);
  expect(space.groups.TYPE!.e2_v0!.action).toMatchObject({ text: "hello", ref: "e2" });
  expect(space.groups.SELECT!.e5_o0!.action).toMatchObject({ values: ["pl"] });
});

it("isolates all runtime identities while keeping classic defaults", () => {
  vi.stubEnv("LAW_INSTANCE", ""); const original = [dataDir(), runtimeDir(), sessionIdFor("/tmp/work"), containerLabel(), profileVolume()];
  vi.stubEnv("LAW_INSTANCE", "jev"); const isolated = [dataDir(), runtimeDir(), sessionIdFor("/tmp/work"), containerLabel(), profileVolume()];
  isolated.forEach((value, i) => expect(value).not.toBe(original[i]));
  expect(isolated[3]).toBe("law.app=jev");
  vi.stubEnv("LAW_INSTANCE", "../../escape"); expect(dataDir).toThrow("LAW_INSTANCE");
});

it("pauses the active clock for a real approval and Stop resolves the pending gate", async () => {
  const store = new Store(":memory:"); stores.push(store);
  const obs = observation(); obs.elements[0]!.name = "Purchase";
  const approvals = new ApprovalManager(store, { ttlMs: 60000 });
  const policy = new BrowserActionPolicy({ lastObservation: () => obs, approvals });
  const execute = vi.fn(async () => ({ output: "page" }));
  let now = 0;
  const rc = new RunController({ store, adapter: new FakeModelAdapter([{ toolCalls: [{ name: "browser_task", args: { goal: "Purchase" } }] }]),
    worker: { cancel() {} } as unknown as TerminalWorker, tools: { specs: [], execute }, policy, approvals, now: () => now,
    hybrid: { evaluator: { evaluate: async () => reply() }, observation: () => obs, minConfidence: 0.55 },
  }, { workspaceId: store.createWorkspace("/tmp/jev-approval"), goal: "Purchase", networkMode: "open" });
  const parked = new Promise<void>(resolve => rc.on("state", state => { if (state === "awaiting_approval") resolve(); }));
  const run = rc.start(); await parked;
  now = 50000; expect(rc.budgetStatus.elapsedMs).toBe(0);
  rc.stop(); expect((await run).state).toBe("stopped"); expect(approvals.pending).toHaveLength(0);
  expect(execute).toHaveBeenCalledTimes(1); // observation only
});
