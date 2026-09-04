import { describe, expect, it } from "vitest";
import { Lease, LeasePolicy } from "../src/policy/lease.js";

describe("Lease", () => {
  it("starts with the human, changes owner and emits only on change", () => {
    const l = new Lease();
    const events: string[] = [];
    l.on("change", (s) => events.push(s.owner));
    expect(l.state.owner).toBe("human");
    l.take("agent", "run started");
    l.take("agent");
    l.take("human", "stop");
    expect(events).toEqual(["agent", "human"]);
    expect(l.state).toMatchObject({ owner: "human", reason: "stop" });
  });
});

describe("LeasePolicy", () => {
  it("denies agent tool calls unless the agent owns the lease", async () => {
    const l = new Lease();
    const p = new LeasePolicy(l);
    const call = { callId: "1", name: "terminal_input", args: {} };
    const ctx = { runId: "r", networkMode: "open" as const };
    expect(await p.authorize(call, ctx)).toMatchObject({ allow: false, code: "LEASE_DENIED" });
    l.take("agent");
    expect(await p.authorize(call, ctx)).toEqual({ allow: true });
  });
});
