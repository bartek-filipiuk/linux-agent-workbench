import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { Store } from "../src/storage/store.js";
import { tmpDir } from "./helpers/tmp.js";

function mkStore() {
  return new Store(":memory:");
}
function mkRun(store: Store) {
  const ws = store.createWorkspace("/tmp/ws");
  return store.createRun({ workspaceId: ws, goal: "do it", model: "fake", networkMode: "open" });
}

describe("Store", () => {
  it("protects the database and WAL files, including previously world-readable databases", () => {
    const dir = path.join(tmpDir(), "private");
    const file = path.join(dir, "state.sqlite");
    const first = new Store(file);
    first.close();
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
    fs.chmodSync(file, 0o644);
    const second = new Store(file);
    try {
      mkRun(second);
      for (const suffix of ["", "-wal", "-shm"]) expect(fs.statSync(file + suffix).mode & 0o777).toBe(0o600);
    } finally { second.close(); }
  });
  it("migrates to the current schema version and is idempotent", () => {
    const s = mkStore();
    expect(s.schemaVersion).toBe(5);
    s.close();
    const file = path.join(tmpDir(), "state.sqlite");
    const a = new Store(file);
    a.close();
    const b = new Store(file);
    expect(b.schemaVersion).toBe(5);
    b.close();
  });

  it("upserts workspaces by path", () => {
    const s = mkStore();
    expect(s.createWorkspace("/a")).toBe(s.createWorkspace("/a"));
    expect(s.createWorkspace("/a")).not.toBe(s.createWorkspace("/b"));
  });

  it("creates runs and appends events with monotonic seq", () => {
    const s = mkStore();
    const runId = mkRun(s);
    expect(s.getRun(runId)?.state).toBe("running");
    const s1 = s.appendEvent(runId, "model.turn", { n: 1 });
    const s2 = s.appendEvent(runId, "tool.call", { n: 2 }, "sensitive");
    expect(s2).toBeGreaterThan(s1);
    const events = s.listEvents(runId);
    expect(events.map((e) => e.type)).toEqual(["run.created", "model.turn", "tool.call"]);
    expect(events[2]!.sensitivity).toBe("sensitive");
  });

  it("tracks tool call lifecycle", () => {
    const s = mkStore();
    const runId = mkRun(s);
    const id = s.beginToolCall(runId, { callId: "c1", name: "terminal_observe", args: {} });
    expect(s.listToolCalls(runId)[0]).toMatchObject({ status: "executing", call_id: "c1" });
    s.finishToolCall(id, "done", { revision: 1 });
    expect(s.listToolCalls(runId)[0]).toMatchObject({ status: "done", output_json: JSON.stringify({ revision: 1 }) });
  });

  it("marks non-terminal runs interrupted and executing calls unknown on restart", () => {
    const file = path.join(tmpDir(), "state.sqlite");
    const a = new Store(file);
    const runId = mkRun(a);
    a.beginToolCall(runId, { callId: "c1", name: "terminal_input", args: { kind: "text", text: "ls" } });
    const pausedRun = mkRun(a);
    a.setRunState(pausedRun, "budget_paused");
    const doneRun = mkRun(a);
    a.setRunState(doneRun, "completed", "final");
    a.close();

    const b = new Store(file);
    expect(b.markInterruptedRuns("agentd_restart")).toBe(2);
    expect(b.getRun(pausedRun)).toMatchObject({ state: "interrupted", end_reason: "agentd_restart" });
    expect(b.getRun(runId)).toMatchObject({ state: "interrupted", end_reason: "agentd_restart" });
    expect(b.getRun(doneRun)?.state).toBe("completed");
    expect(b.listToolCalls(runId)[0]?.status).toBe("unknown");
    expect(b.listEvents(runId).at(-1)).toMatchObject({ type: "run.interrupted" });
    b.close();
  });

  it("prunes finished runs older than the cutoff with their child rows and old egress entries", () => {
    const s = mkStore();
    const oldRun = mkRun(s);
    s.beginToolCall(oldRun, { callId: "c1", name: "terminal_observe", args: {} });
    s.recordUsage(oldRun, { responseId: "r1", inputTokens: 1, outputTokens: 1, costUsd: 0 });
    s.setRunState(oldRun, "completed", "final");
    const liveRun = mkRun(s);
    s.logEgress("sess", { host: "example.com", port: 443, allowed: true });
    const future = Date.now() + 60_000;
    expect(s.pruneOlderThan(future)).toEqual({ runs: 1, egress: 1 });
    expect(s.getRun(oldRun)).toBeUndefined();
    expect(s.listToolCalls(oldRun)).toEqual([]);
    expect(s.listEvents(oldRun)).toEqual([]);
    expect(s.getRun(liveRun)?.state).toBe("running"); // never ended, never pruned
  });

  it("accumulates totals and usage", () => {
    const s = mkStore();
    const runId = mkRun(s);
    s.recordUsage(runId, { responseId: "r1", inputTokens: 10, outputTokens: 5, costUsd: 0.01 });
    s.addRunTotals(runId, { turns: 1, toolCalls: 2, costUsd: 0.01 });
    s.addRunTotals(runId, { turns: 1, costUsd: 0.02 });
    expect(s.getRun(runId)).toMatchObject({ turns: 2, tool_calls: 2 });
    expect(s.getRun(runId)!.cost_usd).toBeCloseTo(0.03);
  });
});
