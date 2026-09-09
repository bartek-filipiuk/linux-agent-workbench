import { describe, expect, it } from "vitest";
import { emptyRun, formatElapsed, reduceRun, runStage, type RunEvent } from "../src/renderer/run-view";

const state = (value: string, runId = "run-1"): RunEvent => ({ type: "run.state", runId, state: value, turns: 1, toolCalls: 1, costUsd: null, snapshot: false });
const comment = (text: string): RunEvent => ({ type: "run.commentary", runId: "run-1", text });
const tool = (status: "executing" | "done"): RunEvent => ({ type: "run.tool", runId: "run-1", name: "terminal_observe", callId: "call-1", status, turns: 2, toolCalls: 1, costUsd: null });

describe("run activity", () => {
  it("keeps a budget pause active and retains its settings through continuation", () => {
    let run = reduceRun(emptyRun, state("running"), 1000);
    const budget = { limits: { maxTurns: 1, maxToolCalls: 200, maxDurationMs: 1800000, maxCostUsd: null }, elapsedMs: 12000, reason: "maxTurns" as const };
    run = reduceRun(run, { ...state("budget_paused"), budget, model: "gpt-6-astra", effort: "medium", profile: "quick" } as RunEvent, 13000);
    expect(run.endedAt).toBeUndefined();
    expect(runStage(run)).toBe("Paused at your limit");
    run = reduceRun(run, state("running"), 30000);
    expect(run).toMatchObject({ startedAt: 1000, budget, model: "gpt-6-astra", effort: "medium" });
  });
  it("keeps log IDs unique after hydrating rows generated in the main process", () => {
    const hydrated = { ...emptyRun, log: [{ id: 100000, kind: "commentary" as const, text: "Restored" }] };
    const next = reduceRun(hydrated, comment("New event"));
    expect(next.log[1]!.id).toBeGreaterThan(100000);
  });
  it("counts incoming updates even after the 500-row history is full", () => {
    let run = reduceRun(emptyRun, state("running"), 1000);
    for (let i = 0; i < 520; i++) run = reduceRun(run, comment(`entry ${i}`), 2000);
    expect(run.log).toHaveLength(500);
    expect(run.activityVersion).toBe(520);
    expect(run.log[0]!.text).toBe("entry 20");
  });

  it("counts in-place tool updates and exposes the latest action", () => {
    let run = reduceRun(emptyRun, tool("executing"));
    expect(run.activityVersion).toBe(1);
    run = reduceRun(run, tool("done"));
    expect(run.log).toHaveLength(1);
    expect(run.activityVersion).toBe(2);
    expect(run.lastAction).toBe("terminal observe · done");
  });

  it("does not count state heartbeats or filtered gate noise as unread activity", () => {
    let run = reduceRun(emptyRun, state("running"));
    run = reduceRun(run, comment("Working"));
    run = reduceRun(run, state("running"));
    run = reduceRun(run, { type: "gate.event", command: "ls", bucket: "auto", actor: "agent", decision: "allow" });
    expect(run.activityVersion).toBe(1);
  });

  it("measures observed elapsed time across handoff and freezes at completion", () => {
    let run = reduceRun(emptyRun, state("running"), 1000);
    run = reduceRun(run, state("handoff"), 5000);
    run = reduceRun(run, state("running"), 10000);
    run = reduceRun(run, state("completed"), 16000);
    run = reduceRun(run, state("completed"), 19000);
    expect(run.startedAt).toBe(1000);
    expect(run.endedAt).toBe(16000);
    expect(formatElapsed(run.endedAt! - run.startedAt!)).toBe("0m 15s");
  });

  it("does not invent elapsed time when first observing an already completed run", () => {
    const run = reduceRun(emptyRun, state("completed"), 1000);
    expect(run.startedAt).toBeUndefined();
    expect(run.endedAt).toBeUndefined();
  });

  it("resets timing, unread sequence and last action for a new run", () => {
    let run = reduceRun(emptyRun, state("running"), 1000);
    run = reduceRun(run, tool("done"));
    run = reduceRun(run, state("completed"), 5000);
    run = reduceRun(run, state("running", "run-2"), 6000);
    expect(run).toMatchObject({ runId: "run-2", startedAt: 6000, activityVersion: 0, log: [] });
    expect(run.endedAt).toBeUndefined();
    expect(run.lastAction).toBeUndefined();
  });

  it("distinguishes a model wait, executing action and a human pause", () => {
    let run = reduceRun(emptyRun, state("running"));
    expect(runStage(run)).toBe("Waiting for model");
    run = reduceRun(run, tool("executing"));
    expect(runStage(run)).toBe("Executing action");
    run = reduceRun(run, state("handoff"));
    expect(runStage(run)).toBe("Waiting for you");
  });

  it("treats the final answer as a new update without duplicating its commentary", () => {
    let run = reduceRun(emptyRun, comment("Done"));
    run = reduceRun(run, { ...state("completed"), finalText: "Done" } as RunEvent);
    expect(run.activityVersion).toBe(2);
    expect(run.log).toHaveLength(0);
    expect(run.finalText).toBe("Done");
  });
});
