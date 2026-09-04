import { describe, expect, it } from "vitest";
import type { BrowserObservation } from "@law/protocol";
import { BrowserActionPolicy, classifyBrowserAction, isPrivateAddress, observationHints } from "../src/policy/browser-policy.js";
import { Lease, LeasePolicy } from "../src/policy/lease.js";

const obs: BrowserObservation = {
  revision: 1, activePageId: "p1", url: "https://x.com/compose", title: "X", viewport: { width: 1, height: 1 }, scroll: { x: 0, y: 0, maxY: 0 },
  pages: [],
  elements: [
    { ref: "e1", role: "textbox", name: "What is happening?", enabled: true, editable: true, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } },
    { ref: "e2", role: "button", name: "Post", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } },
    { ref: "e3", role: "password", name: "Password", enabled: true, editable: true, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } },
    { ref: "e4", role: "button", name: "Buy now", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } },
    { ref: "e5", role: "link", name: "Documentation", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } },
  ],
};

describe("isPrivateAddress", () => {
  it.each([
    ["http://localhost:3000/", true], ["http://127.0.0.1/", true], ["http://10.0.2.2/", true], ["http://192.168.1.5/", true], ["http://172.20.0.1/", true],
    ["http://169.254.169.254/latest/meta-data", true], ["http://[::1]/", true], ["http://app.internal/", true], ["http://printer.local/", true],
    ["https://example.com/", false], ["http://172.32.0.1/", false], ["http://8.8.8.8/", false],
  ])("%s → %s", (u, priv) => expect(isPrivateAddress(u)).toBe(priv));
});

describe("classifyBrowserAction", () => {
  it("asks before private navigation unless allowed, hands off typing into passwords", () => {
    expect(classifyBrowserAction({ kind: "navigate", url: "http://127.0.0.1/" }, obs)).toMatchObject({ kind: "approval", rule: { id: "browser-private" }, command: "navigate http://127.0.0.1/" });
    expect(classifyBrowserAction({ kind: "navigate", url: "http://127.0.0.1/" }, obs, { allowPrivate: true }).kind).toBe("allow");
    expect(classifyBrowserAction({ kind: "type", ref: "e3", revision: 1, text: "s3cret" }, obs)).toMatchObject({ kind: "handoff", reason: expect.stringMatching(/password/) });
    expect(classifyBrowserAction({ kind: "type", ref: "e1", revision: 1, text: "hello" }, obs).kind).toBe("allow");
  });
  it("routes consequential clicks to approval with the right category", () => {
    expect(classifyBrowserAction({ kind: "click", ref: "e2", revision: 1 }, obs)).toMatchObject({ kind: "approval", rule: { category: "send" } });
    expect(classifyBrowserAction({ kind: "click", ref: "e4", revision: 1 }, obs)).toMatchObject({ kind: "approval", rule: { category: "purchase", noSession: true } });
    expect(classifyBrowserAction({ kind: "type", ref: "e1", revision: 1, text: "x", submit: true }, obs).kind).toBe("allow");
    expect(classifyBrowserAction({ kind: "click", ref: "e5", revision: 1 }, obs).kind).toBe("allow");
    expect(classifyBrowserAction({ kind: "click", ref: "e9", revision: 1 }, obs).kind).toBe("allow");
  });
});

describe("BrowserActionPolicy", () => {
  const ctx = { runId: "r", networkMode: "open" as const };
  function make(domainMode: "open" | "ask" = "open") {
    const requests: string[] = [];
    let answer: "allow" | "deny" = "allow";
    const approvals = { request: async (i: { command: string }) => { requests.push(i.command); return answer; }, isSessionAllowed: () => false };
    const p = new BrowserActionPolicy({ lastObservation: () => obs, approvals, domainMode: () => domainMode });
    return { p, requests, setAnswer: (a: "allow" | "deny") => (answer = a) };
  }
  it("ignores non-browser tools and allows reads", async () => {
    const { p } = make();
    expect(await p.authorize({ callId: "1", name: "terminal_input", args: {} }, ctx)).toEqual({ allow: true });
    expect(await p.authorize({ callId: "1", name: "browser_act", args: { action: { kind: "click", ref: "e5", revision: 1 } } }, ctx)).toEqual({ allow: true });
  });
  it("asks before posting and relays a denial", async () => {
    const { p, requests, setAnswer } = make();
    expect(await p.authorize({ callId: "1", name: "browser_act", args: { action: { kind: "click", ref: "e2", revision: 1 } } }, ctx)).toEqual({ allow: true });
    expect(requests[0]).toMatch(/click "Post" on https:\/\/x\.com\/compose/);
    setAnswer("deny");
    expect(await p.authorize({ callId: "2", name: "browser_act", args: { action: { kind: "click", ref: "e2", revision: 1 } } }, ctx)).toMatchObject({ allow: false, code: "POLICY_DENIED" });
  });
  it("in ask mode asks once per host", async () => {
    const { p, requests } = make("ask");
    await p.authorize({ callId: "1", name: "browser_act", args: { action: { kind: "navigate", url: "https://docs.example.com/a" } } }, ctx);
    await p.authorize({ callId: "2", name: "browser_act", args: { action: { kind: "navigate", url: "https://docs.example.com/b" } } }, ctx);
    await p.authorize({ callId: "3", name: "browser_act", args: { action: { kind: "navigate", url: "https://other.example.com/" } } }, ctx);
    expect(requests).toEqual(["open docs.example.com", "open other.example.com"]);
  });
  it("relays a declined private navigation", async () => {
    const { p, requests, setAnswer } = make();
    setAnswer("deny");
    expect(await p.authorize({ callId: "1", name: "browser_act", args: { action: { kind: "navigate", url: "http://192.168.1.5/admin" } } }, ctx)).toMatchObject({ allow: false, code: "POLICY_DENIED", reason: expect.stringMatching(/private or local/) });
    expect(requests).toEqual(["navigate http://192.168.1.5/admin"]);
  });
  it("turns password typing into a handoff without asking", async () => {
    const { p, requests } = make();
    expect(await p.authorize({ callId: "1", name: "browser_act", args: { action: { kind: "type", ref: "e3", revision: 1, text: "x" } } }, ctx)).toMatchObject({ allow: false, code: "LEASE_DENIED", handoff: expect.stringMatching(/password field/) });
    expect(requests).toEqual([]);
  });

  it("asks before sign-in clicks on a login page and captcha buttons", () => {
    const login = { ...obs, elements: [...obs.elements, { ref: "e6", role: "button", name: "Log in", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } }, { ref: "e7", role: "button", name: "I'm not a robot", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } }] };
    expect(classifyBrowserAction({ kind: "click", ref: "e6", revision: 1 }, login)).toMatchObject({ kind: "approval", rule: { id: "browser-signin", category: "credential_transmission" }, command: 'click "Log in" on https://x.com/compose' });
    expect(classifyBrowserAction({ kind: "click", ref: "e7", revision: 1 }, login)).toMatchObject({ kind: "approval", rule: { id: "browser-captcha" }, command: `click "I'm not a robot" on https://x.com/compose` });
    const noPassword = { ...obs, elements: [{ ref: "e6", role: "button", name: "Log in", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } }] };
    expect(classifyBrowserAction({ kind: "click", ref: "e6", revision: 1 }, noPassword).kind).toBe("allow");
  });

  it("hints the model about login forms, captchas and 2fa", () => {
    expect(observationHints(obs).join(" ")).toMatch(/login_form/);
    expect(observationHints({ elements: [{ ref: "e1", role: "button", name: "Verify you are human", enabled: true, editable: false, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } }] }).join(" ")).toMatch(/captcha/);
    expect(observationHints({ elements: [{ ref: "e1", role: "textbox", name: "Enter the verification code", enabled: true, editable: true, inViewport: true, bounds: { x: 0, y: 0, width: 1, height: 1 } }] }).join(" ")).toMatch(/two_factor/);
    expect(observationHints({ elements: [] })).toEqual([]);
  });
});

describe("LeasePolicy per surface", () => {
  it("only governs its own surface's tools", async () => {
    const lease = new Lease();
    const p = new LeasePolicy(lease, "browser");
    const ctx = { runId: "r", networkMode: "open" as const };
    expect(await p.authorize({ callId: "1", name: "terminal_input", args: {} }, ctx)).toEqual({ allow: true });
    expect(await p.authorize({ callId: "1", name: "browser_act", args: {} }, ctx)).toMatchObject({ allow: false, code: "LEASE_DENIED" });
    lease.take("agent");
    expect(await p.authorize({ callId: "1", name: "browser_act", args: {} }, ctx)).toEqual({ allow: true });
  });
});
