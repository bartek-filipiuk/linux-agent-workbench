import type { Budgets, BudgetAction } from "@law/protocol";
import type { ModelUsage } from "../provider/types.js";

export type PriceTable = Record<string, { inputUsdPerMTok: number; outputUsdPerMTok: number }>;

export type BudgetLimit = keyof Budgets;

export class BudgetExceededError extends Error {
  constructor(
    readonly limit: BudgetLimit,
    readonly value: number,
    readonly max: number,
  ) {
    super(`budget exceeded: ${limit} (${value} > ${max})`);
    this.name = "BudgetExceededError";
  }
}

export class BudgetTracker {
  turns = 0;
  toolCalls = 0;
  costUsd = 0;
  private readonly startedAt: number;
  private pausedAt: number | undefined;
  private pausedMs = 0;
  private pauseDepth = 0;
  private carriedMs = 0;

  restore(usage: { turns: number; toolCalls: number; costUsd: number; elapsedMs: number }): void {
    this.turns = usage.turns; this.toolCalls = usage.toolCalls; this.costUsd = usage.costUsd; this.carriedMs = usage.elapsedMs;
  }

  constructor(
    private budgets: Budgets,
    private readonly now: () => number = Date.now,
  ) {
    this.startedAt = now();
  }

  addTurn() { this.turns++; }
  addToolCall() { this.toolCalls++; }
  addCost(usd: number) { this.costUsd += usd; }

  elapsedMs() { return this.carriedMs + (this.pausedAt ?? this.now()) - this.startedAt - this.pausedMs; }
  get limits(): Budgets { return { ...this.budgets }; }
  pauseClock() { if (this.pauseDepth++ === 0) this.pausedAt = this.now(); }
  resumeClock() {
    if (!this.pauseDepth || --this.pauseDepth) return;
    this.pausedMs += this.now() - this.pausedAt!;
    this.pausedAt = undefined;
  }

  extend(action: BudgetAction): void {
    const b = this.budgets;
    switch (action) {
      case "add_steps":
        b.maxTurns = b.maxTurns === null ? null : Math.max(b.maxTurns, this.turns) + 100;
        b.maxToolCalls = b.maxToolCalls === null ? null : Math.max(b.maxToolCalls, this.toolCalls) + 300;
        break;
      case "unlimited_steps": b.maxTurns = null; b.maxToolCalls = null; break;
      case "add_time": b.maxDurationMs = Math.max(b.maxDurationMs ?? 0, this.elapsedMs()) + 30 * 60_000; break;
      case "unlimited_time": b.maxDurationMs = null; break;
      case "add_cost": b.maxCostUsd = Math.max(b.maxCostUsd ?? 0, this.costUsd) + 10; break;
    }
  }

  check(phase: "model" | "tool" = "model"): void {
    const b = this.budgets;
    if (phase === "model" && b.maxTurns !== null && this.turns >= b.maxTurns) throw new BudgetExceededError("maxTurns", this.turns, b.maxTurns);
    if (b.maxToolCalls !== null && this.toolCalls >= b.maxToolCalls) throw new BudgetExceededError("maxToolCalls", this.toolCalls, b.maxToolCalls);
    const elapsed = this.elapsedMs();
    if (b.maxDurationMs !== null && elapsed >= b.maxDurationMs) throw new BudgetExceededError("maxDurationMs", elapsed, b.maxDurationMs);
    if (b.maxCostUsd !== null && this.costUsd > b.maxCostUsd) throw new BudgetExceededError("maxCostUsd", this.costUsd, b.maxCostUsd);
  }
}

/** OpenAI bills cached input tokens at a tenth of the input price. */
export const CACHED_INPUT_FACTOR = 0.1;

export function costOf(model: string, usage: ModelUsage, prices: PriceTable): number | undefined {
  const p = prices[model];
  if (!p) return undefined;
  const cached = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  return ((fresh + cached * CACHED_INPUT_FACTOR) * p.inputUsdPerMTok + usage.outputTokens * p.outputUsdPerMTok) / 1_000_000;
}
