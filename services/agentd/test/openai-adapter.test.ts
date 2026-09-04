import { describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { OpenAIResponsesAdapter } from "../src/provider/openai.js";
import { TERMINAL_TOOLS } from "../src/tools/terminal-tools.js";

type Call = { url: string; init: RequestInit; body: Record<string, unknown> };
function fakeFetch(responses: Array<{ status: number; json: unknown } | Error>) {
  const calls: Call[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init!, body: JSON.parse(String(init!.body)) });
    const next = responses.shift();
    if (!next) throw new Error("no more fake responses");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.json), { status: next.status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { f, calls };
}
const ok = (json: unknown) => ({ status: 200, json });
const ctx = (signal = new AbortController().signal, previousResponseId?: string) => ({ tools: TERMINAL_TOOLS, system: "SYS", signal, ...(previousResponseId ? { previousResponseId } : {}) });
const fcResponse = {
  id: "resp_1",
  status: "completed",
  output: [
    { type: "message", content: [{ type: "output_text", text: "Looking." }] },
    { type: "function_call", call_id: "call_a", name: "terminal_observe", arguments: "{\"maxLines\":50}" },
    { type: "function_call", call_id: "call_b", name: "terminal_input", arguments: "not json" },
  ],
  usage: { input_tokens: 66, output_tokens: 21 },
};

describe("OpenAIResponsesAdapter", () => {
  it("sends the first turn with instructions and tools, parses calls, text and usage", async () => {
    const { f, calls } = fakeFetch([ok(fcResponse)]);
    const a = new OpenAIResponsesAdapter({ apiKey: "sk-test", model: "gpt-5.6-sol", fetch: f });
    const turn = await a.turn({ goal: "list files" }, ctx());
    expect(calls[0]!.url).toBe("https://api.openai.com/v1/responses");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
    expect(calls[0]!.body).toMatchObject({ model: "gpt-5.6-sol", instructions: "SYS", input: [{ role: "user", content: "list files" }] });
    expect((calls[0]!.body.tools as Array<{ type: string; name: string; strict: boolean }>).map((t) => [t.type, t.name, t.strict])).toEqual([
      ["function", "terminal_observe", false], ["function", "terminal_input", false], ["function", "terminal_interrupt", false], ["function", "request_human", false],
    ]);
    expect(turn).toMatchObject({ responseId: "resp_1", text: "Looking.", usage: { inputTokens: 66, outputTokens: 21 } });
    expect(turn.toolCalls).toEqual([
      { callId: "call_a", name: "terminal_observe", args: { maxLines: 50 } },
      { callId: "call_b", name: "terminal_input", args: { __invalid: "not json" } },
    ]);
  });

  it("sends tool results with previous_response_id", async () => {
    const { f, calls } = fakeFetch([ok({ id: "resp_2", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Done" }] }], usage: { input_tokens: 1, output_tokens: 1 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    const turn = await a.turn({ toolResults: [{ callId: "call_a", output: "{\"screen\":\"$ \"}" }] }, ctx(undefined, "resp_1"));
    expect(calls[0]!.body).toMatchObject({ previous_response_id: "resp_1", input: [{ type: "function_call_output", call_id: "call_a", output: "{\"screen\":\"$ \"}" }] });
    expect(turn).toMatchObject({ text: "Done", toolCalls: [] });
  });

  it("retries transport failures with backoff and gives up after maxAttempts", async () => {
    const { f, calls } = fakeFetch([{ status: 429, json: { error: { message: "slow down" } } }, new Error("ECONNRESET"), ok({ id: "r", status: "completed", output: [], usage: { input_tokens: 0, output_tokens: 0 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f, backoffMs: 1 });
    await expect(a.turn({ goal: "g" }, ctx())).resolves.toMatchObject({ responseId: "r" });
    expect(calls).toHaveLength(3);
    const { f: f2 } = fakeFetch([{ status: 500, json: {} }, { status: 502, json: {} }, { status: 503, json: {} }]);
    const b = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f2, backoffMs: 1, maxAttempts: 3 });
    await expect(b.turn({ goal: "g" }, ctx())).rejects.toThrow(/503/);
  });

  it("does not retry 4xx and surfaces the API message", async () => {
    const { f, calls } = fakeFetch([{ status: 400, json: { error: { message: "Unsupported parameter: foo" } } }]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f, backoffMs: 1 });
    await expect(a.turn({ goal: "g" }, ctx())).rejects.toThrow(/Unsupported parameter: foo/);
    expect(calls).toHaveLength(1);
  });

  it("rejects with CANCELLED when aborted", async () => {
    const f = (async (_u: unknown, init?: RequestInit) => {
      await new Promise((_r, rej) => init!.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))));
      return new Response("{}");
    }) as unknown as typeof fetch;
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    const ac = new AbortController();
    const p = a.turn({ goal: "g" }, ctx(ac.signal));
    ac.abort();
    await expect(p).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
  });

  it("fails on a failed response status", async () => {
    const { f } = fakeFetch([ok({ id: "r", status: "failed", error: { message: "model overloaded" }, output: [], usage: { input_tokens: 0, output_tokens: 0 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    await expect(a.turn({ goal: "g" }, ctx())).rejects.toThrow(/model overloaded/);
  });
});
