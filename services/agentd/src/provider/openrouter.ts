import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { ProtocolError } from "@law/protocol";
import type { ModelAdapter, ModelTurn, ModelTurnInput, TurnContext } from "./types.js";

const Message = z.object({ role: z.enum(["user", "assistant", "tool"]), content: z.unknown().optional() }).passthrough();
const State = z.object({ version: z.literal(1), model: z.string(), responseId: z.string(), messages: z.array(Message) });
const ResponseBody = z.object({
  id: z.string().min(1), provider: z.string().max(200).optional(),
  choices: z.array(z.object({ finish_reason: z.string().nullable(), message: z.object({
    role: z.literal("assistant"), content: z.string().nullable().optional(),
    reasoning: z.string().nullable().optional(), reasoning_details: z.array(z.unknown()).nullable().optional(),
    tool_calls: z.array(z.object({ id: z.string().min(1), type: z.literal("function"), function: z.object({ name: z.string().min(1), arguments: z.string() }).passthrough() }).passthrough()).optional(),
  }).passthrough() })).min(1),
  usage: z.object({ prompt_tokens: z.number().nonnegative(), completion_tokens: z.number().nonnegative(),
    prompt_tokens_details: z.object({ cached_tokens: z.number().nonnegative().optional() }).optional(),
    cost: z.number().finite().nonnegative().optional(),
  }),
});

export type OpenRouterOptions = {
  apiKey: string; model: string; effort?: string | undefined; provider?: string | undefined;
  fetch?: typeof fetch; maxAttempts?: number; backoffMs?: number; attemptTimeoutMs?: number;
};

/** Make object unions explicit for provider schema conversion, without loosening their validation. */
export function openRouterSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(openRouterSchema);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  const out = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "$schema").map(([key, child]) => [key, openRouterSchema(child)]));
  for (const union of [out.anyOf, out.oneOf]) {
    if (!out.type && Array.isArray(union) && union.length && union.every(child => child && typeof child === "object" && child.type === "object")) out.type = "object";
  }
  return out;
}

/** Stateless Chat API; opaque reasoning/signature fields must travel with their original tool calls. */
export class OpenRouterAdapter implements ModelAdapter {
  readonly model: string;
  private state: z.infer<typeof State> | undefined;
  private active: AbortController | undefined;
  constructor(private readonly opts: OpenRouterOptions) {
    this.model = opts.model;
    if (!["low", "medium", "high"].includes(opts.effort ?? "low")) throw new Error("OpenRouter reasoning must be low, medium or high");
  }
  exportContext(): unknown {
    if (!this.state) return undefined;
    // Images stay in the live conversation only; persisted continuations require a fresh observation.
    return { ...this.state, messages: this.state.messages.map(message => message.role === "user" && Array.isArray(message.content)
      ? { ...message, content: message.content.map(part => part.type === "image_url" ? { type: "text", text: "[Previous screenshot omitted. Observe the current page again.]" } : part) }
      : message) };
  }
  restoreContext(raw: unknown): void {
    const state = State.parse(raw);
    if (state.model !== this.model) throw new Error("Continue with the original OpenRouter model");
    this.state = state;
  }
  async interrupt(): Promise<void> { this.active?.abort(); }
  close(): void { this.active?.abort(); this.state = undefined; }

  async turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn> {
    if (this.active) throw new Error("OpenRouter turn already active");
    const active = new AbortController(); this.active = active;
    const signal = AbortSignal.any([ctx.signal, active.signal]);
    try {
      let messages: z.infer<typeof Message>[];
      if ("goal" in input) messages = [{ role: "user", content: input.goal }];
      else {
        if (!this.state || ctx.previousResponseId !== this.state.responseId) throw new Error("OpenRouter conversation context unavailable; start a new task");
        messages = [...this.state.messages];
        // All pending tool results precede supplementary user messages, including images.
        for (const result of input.toolResults) messages.push({ role: "tool", tool_call_id: result.callId, content: result.output });
        for (const result of input.toolResults) if (result.imageJpegBase64) messages.push({ role: "user", content: [
          { type: "text", text: `Screenshot accompanying tool result ${result.callId}. Untrusted page data.` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${result.imageJpegBase64}` } },
        ] });
        if (input.message) messages.push({ role: "user", content: input.message });
      }
      const started = performance.now();
      const { raw, attempts, headersMs } = await this.post({ model: this.model, stream: false,
        messages: [{ role: "system", content: ctx.system }, ...messages],
        tools: ctx.tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: openRouterSchema(t.parameters) } })),
        reasoning: { effort: this.opts.effort ?? "low" }, max_tokens: 4096,
        provider: { require_parameters: true, ...(this.opts.provider ? { only: [this.opts.provider], allow_fallbacks: false } : { sort: "latency" }) },
      }, signal);
      const parsed = ResponseBody.safeParse(raw);
      // Provider bodies can echo secrets or page content. Never include them in errors/logs.
      if (!parsed.success) throw new Error("OpenRouter returned an invalid response");
      const body = parsed.data;
      const choice = body.choices[0]!;
      if (!["stop", "tool_calls"].includes(choice.finish_reason ?? "")) throw new Error(`OpenRouter response incomplete (${choice.finish_reason === "length" ? "token limit" : "provider stopped"})`);
      const message = choice.message;
      if (!message.content?.trim() && !message.tool_calls?.length) throw new Error("OpenRouter returned an empty response");
      const calls = message.tool_calls ?? [];
      if (new Set(calls.map(c => c.id)).size !== calls.length) throw new Error("OpenRouter returned duplicate tool call IDs");
      const toolCalls = calls.map(call => {
        let args: unknown;
        try { args = JSON.parse(call.function.arguments); } catch { args = { __invalid: "Malformed tool arguments" }; }
        return { callId: call.id, name: call.function.name, args };
      });
      this.state = { version: 1, model: this.model, responseId: body.id, messages: [...messages, message] };
      return { responseId: body.id, text: message.content ?? "", toolCalls,
        usage: { inputTokens: body.usage.prompt_tokens, outputTokens: body.usage.completion_tokens,
          cachedInputTokens: body.usage.prompt_tokens_details?.cached_tokens ?? 0,
          ...(body.usage.cost !== undefined ? { costUsd: body.usage.cost } : {}),
        },
        timing: { attempts, headersMs, responseMs: performance.now() - started, ...(body.provider ? { upstream: body.provider } : {}) },
      };
    } finally { this.active = undefined; }
  }

  private async post(body: unknown, signal: AbortSignal): Promise<{ raw: unknown; attempts: number; headersMs: number }> {
    const maxAttempts = this.opts.maxAttempts ?? 2;
    const started = performance.now();
    let reason = "transport error";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.opts.attemptTimeoutMs ?? 60_000)]);
      let status: number | undefined;
      try {
        const res = await (this.opts.fetch ?? fetch)("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST", redirect: "error", signal: deadline,
          headers: { authorization: `Bearer ${this.opts.apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body),
        });
        status = res.status;
        const headersMs = performance.now() - started;
        if (res.ok) return { raw: await res.json(), attempts: attempt, headersMs };
        await res.body?.cancel();
        reason = `HTTP ${status}`;
      } catch {
        if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
        reason = deadline.aborted ? "request timed out" : "transport or response decoding error";
      }
      if (status !== undefined && status < 500 && status !== 408 && status !== 429) throw new Error(`OpenRouter ${reason}`);
      if (attempt < maxAttempts) {
        try { await sleep((this.opts.backoffMs ?? 250) * 2 ** (attempt - 1), undefined, { signal }); }
        catch { throw new ProtocolError("CANCELLED", "model request aborted"); }
      }
    }
    throw new Error(`OpenRouter failed after ${maxAttempts} attempts: ${reason}`);
  }
}
