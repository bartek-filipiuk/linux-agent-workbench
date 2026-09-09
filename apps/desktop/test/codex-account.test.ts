import { expect, it } from "vitest";
import { CodexAccount } from "../src/main/codex-account";
it("loads paginated models, filters hidden and text-only entries, and closes the helper", async () => {
  let closed = false;
  const cursors: unknown[] = [];
  const model = (name: string) => ({ model: name, displayName: name, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "medium", description: "Balanced" }] });
  const service = new CodexAccount(() => ({}), () => {}, () => ({
    request: async (method, params) => {
      if (method !== "model/list") return {};
      cursors.push(params.cursor);
      return params.cursor ? { data: [model("second")], nextCursor: null } : { data: [model("gpt-6-astra"), { ...model("hidden"), hidden: true }, { ...model("text"), inputModalities: ["text"] }], nextCursor: "page-2" };
    },
    send: () => {}, close: () => { closed = true; }, next: async () => { throw Error("unused"); },
  }));
  expect((await service.models()).map(m => m.model)).toEqual(["gpt-6-astra", "second"]);
  expect(cursors).toEqual([undefined, "page-2"]);
  expect(closed).toBe(true);
});
it("closes the catalog helper on a malformed response", async () => {
  let closed = false;
  const service = new CodexAccount(() => ({}), () => {}, () => ({
    request: async () => ({}), send: () => {}, close: () => { closed = true; }, next: async () => { throw Error("unused"); },
  }));
  await expect(service.models()).rejects.toThrow();
  expect(closed).toBe(true);
});
it("only treats ChatGPT-managed accounts as subscription readiness", async () => {
  let type = "apiKey", closes = 0;
  const service = new CodexAccount(() => ({}), () => {}, () => ({
    request: async method => method === "account/read" ? { account: { type, email: "test@example.com", planType: "pro" } } : {},
    send: () => {}, close: () => { closes++; }, next: async () => { throw Error("unused"); },
  }));
  expect(await service.read()).toEqual({ state: "signed_out" });
  type = "chatgpt";
  expect(await service.read()).toMatchObject({ state: "ready", plan: "pro" });
  expect(closes).toBe(2);
});
it("rejects an unexpected authentication URL and closes its helper", async () => {
  let closed = false;
  const service = new CodexAccount(() => ({}), () => {}, () => ({
    request: async method => method === "account/login/start" ? { authUrl: "https://untrusted.test/login", loginId: "x" } : {},
    send: () => {}, close: () => { closed = true; }, next: async () => { throw Error("unused"); },
  }));
  await expect(service.login()).rejects.toThrow("unexpected sign-in URL");
  expect(closed).toBe(true);
});
it("cancels a login still initializing without opening a stale flow", async () => {
  let initialize!: (value: unknown) => void;
  let closed = false, loginStarted = false;
  const service = new CodexAccount(() => ({}), () => {}, () => ({
    request: async method => method === "initialize" ? new Promise(r => { initialize = r; }) : (loginStarted = true, {}),
    send: () => {}, close: () => { closed = true; }, next: async () => { throw Error("unused"); },
  }));
  const login = service.login();
  service.cancel();
  initialize({});
  await expect(login).rejects.toThrow("cancelled");
  expect(closed).toBe(true);
  expect(loginStarted).toBe(false);
});
