import type { RunBudgetStatus } from "@law/protocol";
import type { ApprovalView } from "./ApprovalCard";
import { label, STATE_LABEL } from "./labels";

export type RunEvent = (
  | { type: "run.state"; runId: string; state: string; goal?: string; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null; jev?: import("@law/protocol").JevStats; snapshot: boolean; browserEngine?: "classic" | "jev-hybrid"; budget?: RunBudgetStatus; model?: string; effort?: string; profile?: string }
  | { type: "run.commentary"; runId: string; text: string }
  | { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; preview?: string; turns: number; toolCalls: number; costUsd: number | null; jev?: import("@law/protocol").JevStats }
  | { type: "run.handoff"; runId: string; reason: string }
  | { type: "approval.request"; id: string; runId: string; command: string; category: string; ruleId: string; summary: string; expiresAt: number }
  | { type: "approval.resolved"; id: string; decision: "once" | "session" | "deny" }
  | { type: "gate.event"; command: string; bucket: "auto" | "log" | "approval" | "deny"; actor: "human" | "agent"; decision: "allow" | "deny"; ruleId?: string; reason?: string }
  | { type: "run.restored"; runId: string; ok: boolean; message?: string }) & { sequence?: number };

export type LogRow = { id: number; kind: "commentary" | "tool" | "gate"; text: string; status?: string; preview?: string };
let nextRowId = 1; // stable keys so React can skip unchanged rows instead of re-rendering the whole log

export type RunView = {
  activityVersion: number;
  startedAt?: number;
  endedAt?: number;
  lastAction?: string;
  runId?: string;
  state?: string;
  endReason?: string;
  finalText?: string;
  turns: number;
  toolCalls: number;
  costUsd: number | null;
  jev?: import("@law/protocol").JevStats;
  snapshot: boolean;
  budget?: RunBudgetStatus;
  model?: string;
  effort?: string;
  profile?: string;
  browserEngine?: "classic" | "jev-hybrid";
  restored?: string;
  approvals: ApprovalView[];
  log: LogRow[];
};

export const emptyRun: RunView = { activityVersion: 0, turns: 0, toolCalls: 0, costUsd: null, snapshot: false, approvals: [], log: [] };

export const TERMINAL = new Set(["completed", "stopped", "failed", "budget_exceeded", "interrupted"]);
export const RUNNING = new Set(["running", "awaiting_approval", "handoff", "budget_paused"]);
const MAX_LOG_ROWS = 500; // a shell loop can emit thousands of gate events; the drawer keeps the tail

const appendLog = (log: LogRow[], row: Omit<LogRow, "id">): LogRow[] => {
  nextRowId = Math.max(nextRowId, (log.at(-1)?.id ?? 0) + 1);
  const full: LogRow = { id: nextRowId++, ...row };
  return log.length >= MAX_LOG_ROWS ? [...log.slice(-(MAX_LOG_ROWS - 1)), full] : [...log, full];
};

function applyEvent(prev: RunView, e: RunEvent): RunView {
  const eventRun = "runId" in e ? e.runId : undefined;
  const view = eventRun && prev.runId && prev.runId !== eventRun ? { ...emptyRun, runId: eventRun } : { ...prev, ...(eventRun ? { runId: eventRun } : {}) };
  switch (e.type) {
    case "run.state": {
      const log = e.finalText !== undefined && view.log.at(-1)?.kind === "commentary" && view.log.at(-1)?.text === e.finalText ? view.log.slice(0, -1) : view.log;
      return {
        ...view,
        log,
        state: e.state,
        approvals: TERMINAL.has(e.state) ? [] : view.approvals,
        turns: e.turns,
        toolCalls: e.toolCalls,
        costUsd: e.costUsd,
        ...(e.jev ? { jev: e.jev } : {}),
        snapshot: e.snapshot,
        ...(e.budget ? { budget: e.budget } : {}),
        ...(e.model ? { model: e.model } : {}),
        ...(e.effort ? { effort: e.effort } : {}),
        ...(e.browserEngine ? { browserEngine: e.browserEngine } : {}),
        ...(e.profile ? { profile: e.profile } : {}),
        ...(e.endReason ? { endReason: e.endReason } : {}),
        ...(e.finalText !== undefined ? { finalText: e.finalText } : {}),
      };
    }
    case "run.commentary":
      return { ...view, log: appendLog(view.log, { kind: "commentary", text: e.text }) };
    case "run.tool": {
      const key = `${e.name} ${e.callId}`;
      // A tool's row is updated in place (executing → done); it is almost always near the end.
      let i = -1;
      for (let j = view.log.length - 1; j >= 0; j--) if (view.log[j]!.kind === "tool" && view.log[j]!.text === key) { i = j; break; }
      if (i >= 0) {
        const log = [...view.log];
        log[i] = { ...log[i]!, status: e.status, ...(e.preview ? { preview: e.preview } : {}) };
        return { ...view, log, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd, ...(e.jev ? { jev: e.jev } : {}) };
      }
      return { ...view, log: appendLog(view.log, { kind: "tool", text: key, status: e.status, ...(e.preview ? { preview: e.preview } : {}) }), turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd, ...(e.jev ? { jev: e.jev } : {}) };
    }
    case "run.handoff":
      return { ...view, log: appendLog(view.log, { kind: "commentary", text: `Agent asks for help: ${e.reason}` }) };
    case "approval.request":
      if (view.approvals.some((a) => a.id === e.id)) return view;
      return { ...view, approvals: [...view.approvals, { id: e.id, command: e.command, category: e.category, summary: e.summary, expiresAt: e.expiresAt }] };
    case "approval.resolved":
      return { ...view, approvals: view.approvals.filter((a) => a.id !== e.id) };
    case "gate.event":
      // Read-only commands are noise, and so is everything the human types that simply ran; the drawer
      // shows the agent's commands plus anything blocked or approved. The event log in SQLite keeps the rest.
      if (e.bucket === "auto") return view;
      if (e.actor === "human" && e.decision === "allow" && e.bucket !== "approval") return view;
      return { ...view, log: appendLog(view.log, { kind: "gate", text: e.command, status: `${e.actor} · ${e.decision === "deny" ? "blocked" : e.bucket === "approval" ? "approved" : "ran"}` }) };
    case "run.restored":
      return { ...view, restored: e.ok ? "Workspace restored to the pre-run snapshot." : `Restore failed: ${e.message ?? "unknown error"}` };
  }
}


/** Event receipt times measure the run observed by this UI; hydration is a separate feature. */
export function reduceRun(prev: RunView, e: RunEvent, now = Date.now()): RunView {
  const next = applyEvent(prev, e);
  const base = next.runId !== prev.runId ? emptyRun : prev;
  const changed = next.log !== base.log || next.finalText !== base.finalText;
  next.activityVersion = base.activityVersion + (changed ? 1 : 0);
  if (e.type === "run.state") {
    if (RUNNING.has(e.state)) next.startedAt ??= now;
    if (TERMINAL.has(e.state) && next.startedAt !== undefined) next.endedAt ??= now;
  }
  if (e.type === "run.tool") next.lastAction = `${e.name.replace(/_/g, " ")} · ${e.status}${e.preview ? ` · ${e.preview}` : ""}`;
  return next;
}

export function runStage(run: RunView): string {
  if (run.approvals.length) return "Waiting for approval";
  if (run.state === "budget_paused") return "Paused at your limit";
  if (run.state === "handoff") return "Waiting for you";
  if (run.state === "running") return run.log.some((l) => l.kind === "tool" && l.status === "executing") ? "Executing action" : "Waiting for model";
  return label(STATE_LABEL, run.state) || "Ready for a task";
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
