import { describe, expect, it } from "vitest";
import { Store } from "../src/storage/store.js";
import { ApprovalManager } from "../src/policy/approvals.js";
import { CommandGate } from "../src/policy/gate.js";
import { Lease } from "../src/policy/lease.js";

function setup() {
  const store = new Store(":memory:");
  const runId = store.createRun({ workspaceId: store.createWorkspace("/w"), goal: "g", model: "m", networkMode: "open" });
  const lease = new Lease();
  const approvals = new ApprovalManager(store, { ttlMs: 5000 });
  let network: "open" | "none" = "open";
  let autonomy = false;
  const gate = new CommandGate({ lease, approvals, store, currentRunId: () => runId, networkMode: () => network, nestedAutonomy: () => autonomy });
  const events: Array<Record<string, unknown>> = [];
  gate.on("event", (e) => events.push(e));
  const req = (command: string) => gate.check({ command, cwd: "/workspace", pid: 1 });
  return { store, runId, lease, approvals, gate, events, req, setNetwork: (n: "open" | "none") => (network = n), setAutonomy: (a: boolean) => (autonomy = a) };
}

describe("CommandGate", () => {
  it("allows and logs everything the human types", async () => {
    const { req, events } = setup();
    expect(await req("rm -rf /")).toEqual({ decision: "allow" });
    expect(events[0]).toMatchObject({ actor: "human", bucket: "approval", decision: "allow" });
  });

  it("auto-allows and logs for the agent; a bypass flag asks unless nested autonomy is on", async () => {
    const { req, lease, events, store, runId, approvals, setAutonomy } = setup();
    lease.take("agent");
    expect(await req("ls -al")).toEqual({ decision: "allow" });
    expect(await req("node x.js")).toEqual({ decision: "allow" });
    approvals.once("request", (r) => approvals.decide(r.id, "deny"));
    expect(await req("claude --dangerously-skip-permissions")).toMatchObject({ decision: "deny", reason: expect.stringMatching(/denied by the human/) });
    setAutonomy(true);
    expect(await req("claude --dangerously-skip-permissions")).toEqual({ decision: "allow" });
    expect(events.map((e) => e.bucket)).toEqual(["auto", "log", "approval", "log"]);
    expect(store.listEvents(runId).filter((e) => e.type === "command.gate")).toHaveLength(4);
  });

  it("asks for approval and honours once / session / deny", async () => {
    const { req, lease, approvals } = setup();
    lease.take("agent");
    approvals.once("request", (r) => approvals.decide(r.id, "once"));
    expect(await req("git push")).toEqual({ decision: "allow" });
    approvals.once("request", (r) => approvals.decide(r.id, "deny"));
    expect(await req("git push")).toMatchObject({ decision: "deny", reason: expect.stringMatching(/denied/) });
    approvals.once("request", (r) => approvals.decide(r.id, "session"));
    expect(await req("git push")).toEqual({ decision: "allow" });
    let asked = false;
    approvals.once("request", () => (asked = true));
    expect(await req("git push origin main")).toEqual({ decision: "allow" });
    expect(asked).toBe(false);
  });

  it("does not ask when the network is off for network rules", async () => {
    const { req, lease, setNetwork } = setup();
    lease.take("agent");
    setNetwork("none");
    expect(await req("git push")).toEqual({ decision: "allow" });
  });
});
