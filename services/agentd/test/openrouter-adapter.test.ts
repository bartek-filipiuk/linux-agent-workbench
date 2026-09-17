import { describe, it, expect } from "vitest";
import { ProtocolError } from "@law/protocol";
import { OpenRouterAdapter, openRouterSchema } from "../src/provider/openrouter.js";

const tool = { name: "observe", description: "Observe", parameters: { type: "object", properties: {} } };
const ctx = (previousResponseId?: string, signal = new AbortController().signal) => ({ tools: [tool], system: "policy", signal, ...(previousResponseId ? { previousResponseId } : {}) });
const response = (message: object, id = "r1", extra = {}) => ({ id, provider: "Google", choices: [{ finish_reason: "stop", message: { role: "assistant", ...message } }], usage: { prompt_tokens: 100, completion_tokens: 10, prompt_tokens_details: { cached_tokens: 30 }, cost: 0.002 }, ...extra });
function fixture(replies: Array<unknown | number>) {
  const calls: any[] = [];
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    const reply = replies.shift();
    return new Response(JSON.stringify(typeof reply === "number" ? { error: { message: "SECRET sk-or-test" } } : reply), { status: typeof reply === "number" ? reply : 200 });
  }) as typeof fetch;
  const make = () => new OpenRouterAdapter({ apiKey: "sk-or-test", model: "google/gemini-3.8-flash", fetch: fetcher, backoffMs: 1 });
  return { calls, make };
}
const invocation = { id: "c1", type: "function", function: { name: "observe", arguments: "{}" }, extra_content: { google: { thought_signature: "opaque-signature" } } };

describe("OpenRouter adapter", () => {
  it("preserves signatures and reasoning across tools, checkpoints and follow-up; updates the tool gate", async () => {
    const opaque = [{ type: "reasoning.encrypted", data: "opaque", id: "sig" }];
    const f = fixture([response({ content: null, tool_calls: [invocation], reasoning_details: opaque }), response({ content: "done" }, "r2")]);
    const first = f.make();
    const turn = await first.turn({ goal: "read" }, ctx());
    expect(turn.toolCalls).toEqual([{ callId: "c1", name: "observe", args: {} }]);
    expect(turn.usage).toMatchObject({ costUsd: 0.002, cachedInputTokens: 30 });
    const resumed = f.make(); resumed.restoreContext(JSON.parse(JSON.stringify(first.exportContext())));
    await resumed.turn({ toolResults: [{ callId: "c1", output: "result", imageJpegBase64: "AAAA" }], message: "continue" }, { ...ctx(turn.responseId), tools: [] });
    expect(f.calls[1].messages.map((m: any) => m.role)).toEqual(["system", "user", "assistant", "tool", "user", "user"]);
    expect(f.calls[1].messages[2].reasoning_details).toEqual(opaque);
    expect(f.calls[1].messages[2].tool_calls[0]).toEqual(invocation);
    expect(f.calls[1].tools).toEqual([]);
    expect(JSON.stringify(resumed.exportContext())).not.toContain("AAAA");
    expect(JSON.stringify(resumed.exportContext())).toContain("screenshot omitted");
    expect(f.calls[0].reasoning).toEqual({ effort: "low" });
    expect(JSON.stringify(first.exportContext())).not.toContain("sk-or-test");
  });
  it("resets history for compaction and refuses missing or mismatched continuation", async () => {
    const f = fixture([response({ content: "summary" }), response({ content: "new" }, "r2")]);
    const a = f.make();
    await expect(a.turn({ toolResults: [] }, ctx("lost"))).rejects.toThrow("context unavailable");
    await a.turn({ goal: "old goal" }, ctx());
    await a.turn({ goal: "compacted goal" }, ctx());
    expect(f.calls[1].messages).toHaveLength(2);
    expect(f.calls[1].messages[1].content).toBe("compacted goal");
    expect(() => a.restoreContext({ version: 1, model: "other", responseId: "r", messages: [] })).toThrow("original");
  });
  it("retries overload without duplicating history and sanitizes provider failures", async () => {
    const f = fixture([503, response({ content: "done" })]);
    await expect(f.make().turn({ goal: "g" }, ctx())).resolves.toMatchObject({ timing: { attempts: 2 } });
    expect(f.calls[0]).toEqual(f.calls[1]);
    for (const status of [400, 401, 402, 403]) {
      const f = fixture([status]);
      await expect(f.make().turn({ goal: "g" }, ctx())).rejects.toThrow(`OpenRouter HTTP ${status}`);
      expect(f.calls).toHaveLength(1);
    }
  });
  it("rejects invalid, empty and truncated responses without committing context", async () => {
    for (const body of [{ error: { message: "SECRET" } }, response({ content: "" }), response({}, "r", { choices: [{ finish_reason: "length", message: { role: "assistant", tool_calls: [invocation] } }] })]) {
      const a = fixture([body]).make();
      await expect(a.turn({ goal: "g" }, ctx())).rejects.toThrow(/OpenRouter/);
      expect(a.exportContext()).toBeUndefined();
    }
  });
  it("returns malformed arguments for normal policy/tool validation", async () => {
    const a = fixture([response({ tool_calls: [{ ...invocation, function: { name: "observe", arguments: "bad" } }] })]).make();
    expect((await a.turn({ goal: "g" }, ctx())).toolCalls[0]!.args).toEqual({ __invalid: "Malformed tool arguments" });
  });
  it("Stop cancels both HTTP requests and retry backoff", async () => {
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const a = new OpenRouterAdapter({ apiKey: "k", model: "m", fetch: (async (_url, init) => {
      entered(); await new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
      return new Response();
    }) as typeof fetch });
    const pending = a.turn({ goal: "g" }, ctx()); await started; await a.interrupt();
    await expect(pending).rejects.toSatisfy(e => ProtocolError.is(e, "CANCELLED"));
    const ac = new AbortController();
    const b = new OpenRouterAdapter({ apiKey: "k", model: "m", backoffMs: 10000, fetch: (async () => { setTimeout(() => ac.abort(), 10); return new Response("", { status: 503 }); }) as typeof fetch });
    await expect(b.turn({ goal: "g" }, ctx(undefined, ac.signal))).rejects.toSatisfy(e => ProtocolError.is(e, "CANCELLED"));
  });
});

 it("keeps object action union constraints while making their object type explicit", () => {
   const branches = [{ type: "object", properties: { kind: { const: "click" } }, required: ["kind", "ref"] }, { type: "object", properties: { kind: { const: "type" } }, required: ["kind", "text"] }];
   expect(openRouterSchema({ $schema: "draft-7", properties: { action: { anyOf: branches } } })).toEqual({ properties: { action: { type: "object", anyOf: branches } } });
 });
