import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { ProtocolError } from "@law/protocol";
import type { ModelAdapter, ModelTurn, ModelTurnInput, ToolCall, TurnContext } from "./types.js";

export type FetchLike = typeof fetch;

export type OpenAIAdapterOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchLike;
  maxAttempts?: number;
  backoffMs?: number;
};

const OutputItem = z.discriminatedUnion("type", [
  z.object({ type: z.literal("function_call"), call_id: z.string(), name: z.string(), arguments: z.string() }),
  z.object({
    type: z.literal("message"),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  }),
]);
const ResponseBody = z.object({
  id: z.string(),
  status: z.string().optional(),
  error: z.object({ message: z.string() }).nullable().optional(),
  output: z.array(z.unknown()),
  usage: z
    .object({ input_tokens: z.number(), output_tokens: z.number(), input_tokens_details: z.object({ cached_tokens: z.number() }).partial().optional() })
    .optional(),
});

const RETRY_STATUS = new Set([408, 429]);

export class OpenAIResponsesAdapter implements ModelAdapter {
  readonly model: string;
  private readonly apiKey: string;
  private readonly url: string;
  private readonly fetchImpl: FetchLike;
  private readonly maxAttempts: number;
  private readonly backoffMs: number;

  constructor(opts: OpenAIAdapterOptions) {
    this.model = opts.model;
    this.apiKey = opts.apiKey;
    this.url = `${(opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/responses`;
    this.fetchImpl = opts.fetch ?? fetch;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.backoffMs = opts.backoffMs ?? 500;
  }

  async turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn> {
    const body = {
      model: this.model,
      instructions: ctx.system,
      store: true,
      tools: ctx.tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.parameters, strict: false })),
      ...(ctx.previousResponseId ? { previous_response_id: ctx.previousResponseId } : {}),
      input:
        "goal" in input
          ? [{ role: "user", content: input.goal }]
          : input.toolResults.map((r) => ({
              type: "function_call_output",
              call_id: r.callId,
              output: r.imageJpegBase64
                ? [
                    { type: "input_text", text: r.output },
                    { type: "input_image", image_url: `data:image/jpeg;base64,${r.imageJpegBase64}`, detail: "auto" },
                  ]
                : r.output,
            })),
    };
    const raw = await this.post(body, ctx.signal);
    const parsed = ResponseBody.parse(raw);
    if (parsed.status === "failed") throw new Error(`model response failed: ${parsed.error?.message ?? "unknown error"}`);

    const texts: string[] = [];
    const toolCalls: ToolCall[] = [];
    for (const item of parsed.output) {
      const r = OutputItem.safeParse(item);
      if (!r.success) continue; // reasoning and other item types are opaque to us
      if (r.data.type === "function_call") {
        let args: unknown;
        try {
          args = JSON.parse(r.data.arguments);
        } catch {
          args = { __invalid: r.data.arguments };
        }
        toolCalls.push({ callId: r.data.call_id, name: r.data.name, args });
      } else {
        for (const c of r.data.content) if (c.type === "output_text" && c.text) texts.push(c.text);
      }
    }
    return {
      responseId: parsed.id,
      text: texts.join("\n"),
      toolCalls,
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? 0,
        outputTokens: parsed.usage?.output_tokens ?? 0,
        cachedInputTokens: parsed.usage?.input_tokens_details?.cached_tokens ?? 0,
      },
    };
  }

  private async post(body: unknown, signal: AbortSignal): Promise<unknown> {
    let lastError = "";
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
      let res: Response;
      try {
        res = await this.fetchImpl(this.url, {
          method: "POST",
          headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      } catch (e) {
        if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
        lastError = e instanceof Error ? e.message : String(e);
        await this.backoff(attempt, signal);
        continue;
      }
      if (res.ok) return await res.json();
      const text = await res.text();
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
      } catch {}
      lastError = `HTTP ${res.status}: ${message}`;
      if (res.status >= 500 || RETRY_STATUS.has(res.status)) {
        await this.backoff(attempt, signal);
        continue;
      }
      throw new Error(lastError);
    }
    throw new Error(`model request failed after ${this.maxAttempts} attempts: ${lastError}`);
  }

  private async backoff(attempt: number, signal: AbortSignal): Promise<void> {
    if (attempt >= this.maxAttempts) return;
    try {
      await sleep(this.backoffMs * 2 ** (attempt - 1), undefined, { signal });
    } catch {
      throw new ProtocolError("CANCELLED", "model request aborted");
    }
  }
}
