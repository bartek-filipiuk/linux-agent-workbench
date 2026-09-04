import { useState } from "react";
import { ApprovalCard, type ApprovalView } from "./ApprovalCard";

export type RunEvent =
  | { type: "run.state"; runId: string; state: string; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null; snapshot: boolean }
  | { type: "run.commentary"; runId: string; text: string }
  | { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; turns: number; toolCalls: number; costUsd: number | null }
  | { type: "run.handoff"; runId: string; reason: string }
  | { type: "approval.request"; id: string; runId: string; command: string; category: string; ruleId: string; summary: string; expiresAt: number }
  | { type: "approval.resolved"; id: string; decision: "once" | "session" | "deny" }
  | { type: "gate.event"; command: string; bucket: "auto" | "log" | "approval" | "deny"; actor: "human" | "agent"; decision: "allow" | "deny"; ruleId?: string; reason?: string }
  | { type: "run.restored"; runId: string; ok: boolean; message?: string };

export type LogRow = { kind: "commentary" | "tool" | "gate"; text: string; status?: string };

export type RunView = {
  runId?: string;
  state?: string;
  endReason?: string;
  finalText?: string;
  turns: number;
  toolCalls: number;
  costUsd: number | null;
  snapshot: boolean;
  restored?: string;
  approvals: ApprovalView[];
  log: LogRow[];
};

export const emptyRun: RunView = { turns: 0, toolCalls: 0, costUsd: null, snapshot: false, approvals: [], log: [] };

const TERMINAL = new Set(["completed", "stopped", "failed", "budget_exceeded", "interrupted"]);
const RUNNING = new Set(["running", "awaiting_approval", "handoff"]);

export function reduceRun(prev: RunView, e: RunEvent): RunView {
  // Events without a runId (gate, approvals) belong to the current view; a new runId starts a fresh view.
  const eventRun = "runId" in e ? e.runId : undefined;
  const view = eventRun && prev.runId && prev.runId !== eventRun ? { ...emptyRun, runId: eventRun } : { ...prev, ...(eventRun ? { runId: eventRun } : {}) };
  switch (e.type) {
    case "run.state": {
      const log = e.finalText !== undefined && view.log.at(-1)?.kind === "commentary" && view.log.at(-1)?.text === e.finalText ? view.log.slice(0, -1) : view.log;
      return {
        ...view,
        log,
        state: e.state,
        turns: e.turns,
        toolCalls: e.toolCalls,
        costUsd: e.costUsd,
        snapshot: e.snapshot,
        ...(e.endReason ? { endReason: e.endReason } : {}),
        ...(e.finalText !== undefined ? { finalText: e.finalText } : {}),
      };
    }
    case "run.commentary":
      return { ...view, log: [...view.log, { kind: "commentary", text: e.text }] };
    case "run.tool": {
      const log = [...view.log];
      const key = `${e.name} ${e.callId}`;
      const i = log.findIndex((l) => l.kind === "tool" && l.text === key);
      const row: LogRow = { kind: "tool", text: key, status: e.status };
      if (i >= 0) log[i] = row;
      else log.push(row);
      return { ...view, log, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd };
    }
    case "run.handoff":
      return { ...view, log: [...view.log, { kind: "commentary", text: `Agent asks for help: ${e.reason}` }] };
    case "approval.request":
      return { ...view, approvals: [...view.approvals, { id: e.id, command: e.command, category: e.category, summary: e.summary, expiresAt: e.expiresAt }] };
    case "approval.resolved":
      return { ...view, approvals: view.approvals.filter((a) => a.id !== e.id) };
    case "gate.event":
      return { ...view, log: [...view.log, { kind: "gate", text: `${e.actor}: ${e.command}`, status: `${e.bucket}/${e.decision}` }] };
    case "run.restored":
      return { ...view, restored: e.ok ? "Workspace restored to the pre-run snapshot." : `Restore failed: ${e.message ?? "unknown error"}` };
  }
}

export function RunDrawer({ run, sandboxReady }: { run: RunView; sandboxReady: boolean }) {
  const [goal, setGoal] = useState("Run ls -al and tell me how many entries are listed.");
  const busy = run.state !== undefined && RUNNING.has(run.state);
  const canRestore = run.runId !== undefined && run.snapshot && run.state !== undefined && TERMINAL.has(run.state);
  const restore = () => {
    if (run.runId && window.confirm("Restore tracked files to the state before this run? Untracked files are left as they are.")) {
      void window.workbench.restoreRun(run.runId);
    }
  };
  return (
    <aside className="drawer">
      {run.approvals.map((a) => (
        <ApprovalCard key={a.id} a={a} />
      ))}
      <label className="label" htmlFor="goal">Goal</label>
      <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} disabled={busy} />
      <div className="row">
        <button className="btn primary" disabled={!sandboxReady || busy || !goal.trim()} onClick={() => void window.workbench.startRun(goal)}>Start run</button>
        <button className="btn danger" disabled={!busy} onClick={() => void window.workbench.stopRun()}>Stop</button>
        {canRestore && <button className="btn" onClick={restore}>Restore pre-run state</button>}
      </div>
      <div className="stats">
        <span>state <b>{run.state ?? "idle"}</b>{run.endReason ? ` (${run.endReason})` : ""}</span>
        <span>turns <b>{run.turns}</b></span>
        <span>tools <b>{run.toolCalls}</b></span>
        <span>cost <b>{run.costUsd === null ? "n/a" : `$${run.costUsd.toFixed(4)}`}</b></span>
        {run.state && <span>snapshot <b>{run.snapshot ? "git" : "none"}</b></span>}
      </div>
      {run.restored && <div className="notice">{run.restored}</div>}
      <ol className="log">
        {run.log.map((l, i) => (
          <li key={i} className={l.kind === "tool" ? `tool ${l.status ?? ""}` : l.kind === "gate" ? `gate ${l.status?.endsWith("deny") ? "deny" : ""}` : "commentary"}>
            {l.kind === "tool" ? (
              <>
                <code>{l.text.split(" ")[0]}</code> <span className="st">{l.status}</span>
              </>
            ) : l.kind === "gate" ? (
              <>
                <span className="st">{l.status}</span> <code>{l.text}</code>
              </>
            ) : (
              l.text
            )}
          </li>
        ))}
        {run.finalText && run.state === "completed" && <li className="final">{run.finalText}</li>}
      </ol>
    </aside>
  );
}
