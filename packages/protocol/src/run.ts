import { z } from "zod";

export const RunState = z.enum([
  "idle",
  "running",
  "awaiting_approval",
  "handoff",
  "budget_paused",
  "completed",
  "stopped",
  "failed",
  "budget_exceeded",
  "interrupted",
]);
export type RunState = z.infer<typeof RunState>;

export const TERMINAL_STATES: ReadonlySet<RunState> = new Set<RunState>([
  "completed", "stopped", "failed", "budget_exceeded", "interrupted",
]);

export const NetworkMode = z.enum(["open", "none"]);
export type NetworkMode = z.infer<typeof NetworkMode>;

export const Budgets = z.object({
  maxTurns: z.number().int().positive().nullable(),
  maxToolCalls: z.number().int().positive().nullable(),
  maxDurationMs: z.number().int().positive().nullable(),
  maxCostUsd: z.number().nonnegative().nullable(),
});
export type Budgets = z.infer<typeof Budgets>;

/** null is deliberately unlimited; omitted limits preserve older clients' defaults. */
export const RunLimits = z.object({
  maxTurns: z.number().int().min(1).max(10000).nullable(),
  maxDurationMinutes: z.number().int().min(1).max(1440).nullable(),
}).strict();
export type RunLimits = z.infer<typeof RunLimits>;
export const BudgetAction = z.enum(["add_steps", "unlimited_steps", "add_time", "unlimited_time", "add_cost"]);
export type BudgetAction = z.infer<typeof BudgetAction>;
export type JevStats = { decisions: number; elapsedMs: number; costUsd: number; fallbacks: number };

export type RunBudgetStatus = { limits: Budgets; elapsedMs: number; reason: keyof Budgets | null };

export const DEFAULT_BUDGETS: Budgets = {
  maxTurns: 40,
  maxToolCalls: 200,
  maxDurationMs: 30 * 60_000,
  maxCostUsd: 10,
};

export const Sensitivity = z.enum(["normal", "sensitive"]);
export type Sensitivity = z.infer<typeof Sensitivity>;

export const RunEvent = z.object({
  seq: z.number().int().nonnegative(),
  runId: z.string(),
  ts: z.number(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  sensitivity: Sensitivity,
});
export type RunEvent = z.infer<typeof RunEvent>;

export const ControlLease = z.object({
  surface: z.literal("terminal"),
  owner: z.enum(["agent", "human"]),
  expiresAt: z.number(),
  reason: z.string().optional(),
});
export type ControlLease = z.infer<typeof ControlLease>;

export const ApprovalCategory = z.enum([
  "credential_transmission", "send", "publish", "purchase", "delete", "deploy",
  "permission_change", "external_side_effect", "destructive_workspace", "external_exec",
]);
export type ApprovalCategory = z.infer<typeof ApprovalCategory>;

export const ApprovalRequest = z.object({
  id: z.string(),
  runId: z.string(),
  category: ApprovalCategory,
  command: z.string(),
  commandHash: z.string(),
  ruleId: z.string(),
  summary: z.string(),
  expiresAt: z.number(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequest>;

export const ApprovalDecision = z.enum(["once", "session", "deny"]);
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;
