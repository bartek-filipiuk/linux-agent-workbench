import { describe, expect, it } from "vitest";
import { Store } from "../src/storage/store.js";
import { ApprovalManager } from "../src/policy/approvals.js";
import { RULES } from "../src/policy/rules.js";

const rule = RULES.find((r) => r.id === "git-push")!;
function setup(ttlMs = 100) {
  const store = new Store(":memory:");
  const ws = store.createWorkspace("/w");
  const runId = store.createRun({ workspaceId: ws, goal: "g", model: "m", networkMode: "open" });
  const am = new ApprovalManager(store, { ttlMs });
  return { store, runId, am };
}

describe("ApprovalManager", () => {
  it("emits a request, resolves once, records the decision", async () => {
    const { store, runId, am } = setup(5000);
    const reqs: Array<{ id: string; command: string }> = [];
    am.on("request", (r) => reqs.push(r));
    const p = am.request({ runId, command: "git push", rule });
    expect(reqs[0]).toMatchObject({ command: "git push", ruleId: "git-push", category: "publish" });
    expect(am.pending).toHaveLength(1);
    expect(am.decide(reqs[0]!.id, "once")).toBe(true);
    await expect(p).resolves.toBe("once");
    expect(am.pending).toHaveLength(0);
    expect(am.decide(reqs[0]!.id, "once")).toBe(false);
    const rows = store.listEvents(runId).filter((e) => e.type === "approval.decided");
    expect(rows[0]?.payload).toMatchObject({ decision: "once", ruleId: "git-push" });
  });

  it("a decision resolves just its request; duplicate decisions cannot touch the queue", async () => {
    const { store, runId, am } = setup(5000);
    const first = am.request({ runId, command: "git push origin main", rule });
    const second = am.request({ runId, command: "git push origin release", rule });
    const [a, b] = am.pending;
    expect(am.decide(a!.id, "once")).toBe(true);
    expect(am.decide(a!.id, "session")).toBe(false);
    await expect(first).resolves.toBe("once");
    expect(am.pending.map((r) => r.id)).toEqual([b!.id]);
    am.decide(b!.id, "deny");
    await expect(second).resolves.toBe("deny");
    store.close();
  });

  it("denies expired decisions even before the expiry timer runs", async () => {
    const store = new Store(":memory:");
    const runId = store.createRun({ workspaceId: store.createWorkspace("/w"), goal: "g", model: "m", networkMode: "open" });
    let now = 100;
    const am = new ApprovalManager(store, { ttlMs: 5000, now: () => now });
    const decision = am.request({ runId, command: "git push", rule });
    now = 5100;
    expect(am.decide(am.pending[0]!.id, "session")).toBe(false);
    await expect(decision).resolves.toBe("deny");
    expect(am.isSessionAllowed(runId, rule.id)).toBe(false);
    store.close();
  });

  it("session decision remembers the rule for the run only", async () => {
    const { runId, am, store } = setup(5000);
    am.on("request", (r) => am.decide(r.id, "session"));
    await expect(am.request({ runId, command: "git push", rule })).resolves.toBe("session");
    expect(am.isSessionAllowed(runId, "git-push")).toBe(true);
    const otherRun = store.createRun({ workspaceId: store.createWorkspace("/w"), goal: "g2", model: "m", networkMode: "open" });
    expect(am.isSessionAllowed(otherRun, "git-push")).toBe(false);
  });

  it("deny and timeout both deny", async () => {
    const { runId, am } = setup(50);
    am.once("request", (r) => am.decide(r.id, "deny"));
    await expect(am.request({ runId, command: "git push", rule })).resolves.toBe("deny");
    await expect(am.request({ runId, command: "git push origin x", rule })).resolves.toBe("deny");
  });
});
