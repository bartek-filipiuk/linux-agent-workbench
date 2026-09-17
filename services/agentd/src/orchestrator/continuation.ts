import type { Budgets } from "@law/protocol";
import type { ToolCall, ToolResult } from "../provider/types.js";

/** Durable pointers and pending results, separate from the renderer's bounded activity log. */
export type Continuation = {
  provider: "codex" | "openai" | "openrouter";
  threadId?: string;
  providerUsage?: import("../provider/types.js").ModelUsage;
  responseId?: string;
  modelContext?: unknown;
  pending: ToolCall[];
  results: ToolResult[];
  usage?: { turns: number; toolCalls: number; costUsd: number; elapsedMs: number };
  limits?: Budgets;
  /** Mutating fallback opens only after a completed Jev exception. */
  browserFallback?: boolean;
  jev?: import("@law/protocol").JevStats;
};

export function pendingResults(checkpoint: Continuation): ToolResult[] {
  return checkpoint.pending.map(call => checkpoint.results.find(r => r.callId === call.callId) ?? {
    callId: call.callId,
    output: JSON.stringify({ interrupted: true, outcome: "unknown", note: "The action may have happened. Observe the current state before acting; do not replay it automatically." }),
  });
}
