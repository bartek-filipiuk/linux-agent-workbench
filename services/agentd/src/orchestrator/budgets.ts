import type { Budgets } from "@law/protocol";
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

  constructor(
    private readonly budgets: Budgets,
    private readonly now: () => number = Date.now,
  ) {
    this.startedAt = now();
  }

  addTurn() { this.turns++; }
  addToolCall() { this.toolCalls++; }
  addCost(usd: number) { this.costUsd += usd; }

  elapsedMs() { return this.now() - this.startedAt; }

  check(): void {
    const b = this.budgets;
    if (this.turns >= b.maxTurns) throw new BudgetExceededError("maxTurns", this.turns, b.maxTurns);
    if (this.toolCalls >= b.maxToolCalls) throw new BudgetExceededError("maxToolCalls", this.toolCalls, b.maxToolCalls);
    const elapsed = this.elapsedMs();
    if (elapsed > b.maxDurationMs) throw new BudgetExceededError("maxDurationMs", elapsed, b.maxDurationMs);
    if (this.costUsd > b.maxCostUsd) throw new BudgetExceededError("maxCostUsd", this.costUsd, b.maxCostUsd);
  }
}

export function costOf(model: string, usage: ModelUsage, prices: PriceTable): number | undefined {
  const p = prices[model];
  if (!p) return undefined;
  return (usage.inputTokens * p.inputUsdPerMTok + usage.outputTokens * p.outputUsdPerMTok) / 1_000_000;
}
