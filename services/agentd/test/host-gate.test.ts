import { describe, expect, it } from "vitest";
import { Store } from "../src/storage/store.js";
import { HostAllowlist } from "../src/policy/host-allowlist.js";
import { makeEgressDecider } from "../src/egress/host-gate.js";
import type { ApprovalOutcome } from "../src/policy/approvals.js";

function setup(mode: "open" | "ask" = "ask") {
  const store = new Store(":memory:");
  const ws = store.createWorkspace("/w");
  const allowlist = new HostAllowlist(store, ws);
  const requests: string[] = [];
  let answer: ApprovalOutcome = "once";
  let delay = 0;
  let runId: string | undefined = "run-1";
  const approvals = {
    request: (i: { command: string }) => {
      requests.push(i.command);
      return new Promise<ApprovalOutcome>((r) => setTimeout(() => r(answer), delay));
    },
  };
  const decide = makeEgressDecider({ mode: () => mode, allowlist: () => allowlist, approvals, currentRunId: () => runId });
  return { store, ws, allowlist, requests, decide, setAnswer: (a: ApprovalOutcome) => (answer = a), setDelay: (d: number) => (delay = d), setRun: (r: string | undefined) => (runId = r) };
}

describe("HostAllowlist", () => {
  it("persists only when asked and survives a reload", () => {
    const store = new Store(":memory:");
    const ws = store.createWorkspace("/w");
    const a = new HostAllowlist(store, ws);
    a.add("Docs.Example.com", { persist: true });
    a.add("temp.example.com", { persist: false });
    expect(a.has("docs.example.com")).toBe(true);
    expect(a.has("temp.example.com")).toBe(true);
    const b = new HostAllowlist(store, ws);
    expect(b.list()).toEqual(["docs.example.com"]);
  });
});

describe("egress host gate", () => {
  it("allows everything in open mode without asking", async () => {
    const { decide, requests } = setup("open");
    expect(await decide("anything.example", 443)).toEqual({ allow: true });
    expect(requests).toEqual([]);
  });

  it("asks once per host while a run is active: once allows this time, session persists, deny refuses", async () => {
    const { decide, requests, setAnswer, allowlist, store, ws } = setup();
    expect(await decide("api.example.com", 443)).toEqual({ allow: true });
    expect(requests).toEqual(["connect to api.example.com:443 from the sandbox"]);
    expect(await decide("api.example.com", 443)).toEqual({ allow: true }); // remembered for this app run
    expect(requests).toHaveLength(1);
    expect(store.listAllowedHosts(ws)).toEqual([]);

    setAnswer("session");
    await decide("cdn.example.com", 443);
    expect(store.listAllowedHosts(ws)).toEqual(["cdn.example.com"]);
    expect(allowlist.has("CDN.example.com")).toBe(true);

    setAnswer("deny");
    expect(await decide("evil.example.com", 443)).toMatchObject({ allow: false, reason: expect.stringMatching(/declined/) });
    expect(allowlist.has("evil.example.com")).toBe(false);
  });

  it("does not question the human's own traffic when no run is active", async () => {
    const { decide, requests, setRun } = setup();
    setRun(undefined);
    expect(await decide("manual.example.com", 22)).toEqual({ allow: true });
    expect(requests).toEqual([]);
  });

  it("coalesces concurrent connections to one host into one card", async () => {
    const { decide, requests, setDelay } = setup();
    setDelay(20);
    const results = await Promise.all([decide("page.example.com", 443), decide("page.example.com", 443), decide("page.example.com", 80)]);
    expect(results.every((r) => r.allow)).toBe(true);
    expect(requests).toHaveLength(1);
  });
});
