import { z } from "zod";

export const JevConfig = z.object({
  apiKey: z.string().min(1).max(512),
  model: z.string().regex(/^jev-[a-zA-Z0-9.-]+$/).default("jev-1.13.0"),
  timeoutMs: z.number().int().min(100).max(30_000).default(5000),
  minConfidence: z.number().min(0).max(1).default(0.55),
  inputUsdPerMTok: z.number().nonnegative().default(0.042),
});
export type JevConfig = z.infer<typeof JevConfig>;
export type JevQuestion = { type: "choice"; instructions: string; criteria: Record<string, string | null> };
export type JevRequest = { state: unknown; questions: Record<string, JevQuestion> };
const Answer = z.object({ type: z.literal("choice"), choice: z.string(), confidence: z.number().min(0).max(1), probabilities: z.record(z.string(), z.number().min(0).max(1)) });
const Reply = z.object({ model: z.string().max(100), answers: z.record(z.string(), Answer), usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() }) });
export type JevReply = z.infer<typeof Reply> & { elapsedMs: number; costUsd: number };
export interface JevEvaluator { evaluate(request: JevRequest, signal: AbortSignal): Promise<JevReply> }

/** A private host client. Never log requests, response bodies, headers or provider error text. */
export class JevClient implements JevEvaluator {
  constructor(private readonly config: JevConfig, private readonly request: typeof fetch = fetch) {}

  async evaluate(input: JevRequest, signal: AbortSignal): Promise<JevReply> {
    const started = performance.now();
    const body = JSON.stringify({ ...input, model: this.config.model });
    if (body.length > 160_000) throw new Error("Jev context exceeds the size limit");
    for (const q of Object.values(input.questions)) {
      if (!Object.keys(q.criteria).length || Object.keys(q.criteria).length > 254) throw new Error("Jev choice count is outside the supported range");
    }
    let raw: unknown;
    try {
      const response = await this.request("https://api.typesafe.ai/v1/systemone", {
        method: "POST", redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(this.config.timeoutMs)]),
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" }, body,
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Jev HTTP ${response.status}`); }
      // Bound reads as well as requests; never surface a provider body as an exception.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Jev returned an empty response");
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length;
          if (bytes > 256_000) throw new Error("Jev response exceeds the size limit"); chunks.push(part.value); }
      } finally { await reader.cancel().catch(() => {}); }
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (e) {
      if (signal.aborted) throw signal.reason;
      const message = e instanceof Error && /^Jev (HTTP \d{3}|returned an empty response|response exceeds the size limit)$/.test(e.message) ? e.message : "Jev request failed or timed out";
      throw new Error(message);
    }
    const parsed = Reply.safeParse(raw);
    if (!parsed.success) throw new Error("Jev returned an invalid decision");
    const reply = parsed.data;
    for (const [name, q] of Object.entries(input.questions)) {
      const a = reply.answers[name]; const ids = Object.keys(q.criteria);
      if (!a || !Object.hasOwn(q.criteria, a.choice) || Object.keys(a.probabilities).length !== ids.length || ids.some(id => !Object.hasOwn(a.probabilities, id))
        || Math.abs(Object.values(a.probabilities).reduce((n, p) => n + p, 0) - 1) > 0.02
        || a.probabilities[a.choice]! + 1e-6 < Math.max(...Object.values(a.probabilities))) throw new Error("Jev returned an invalid choice distribution");
    }
    return { ...reply, elapsedMs: performance.now() - started, costUsd: reply.usage.input_tokens * this.config.inputUsdPerMTok / 1_000_000 };
  }
}
