import { useEffect, useRef, useState } from "react";
import { ApprovalCard, type ApprovalView } from "./ApprovalCard";
import { END_REASON_LABEL, STATE_LABEL, label, renderInline } from "./labels";

export type RunEvent =
  | { type: "run.state"; runId: string; state: string; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null; snapshot: boolean }
  | { type: "run.commentary"; runId: string; text: string }
  | { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; preview?: string; turns: number; toolCalls: number; costUsd: number | null }
  | { type: "run.handoff"; runId: string; reason: string }
  | { type: "approval.request"; id: string; runId: string; command: string; category: string; ruleId: string; summary: string; expiresAt: number }
  | { type: "approval.resolved"; id: string; decision: "once" | "session" | "deny" }
  | { type: "gate.event"; command: string; bucket: "auto" | "log" | "approval" | "deny"; actor: "human" | "agent"; decision: "allow" | "deny"; ruleId?: string; reason?: string }
  | { type: "run.restored"; runId: string; ok: boolean; message?: string };

export type LogRow = { kind: "commentary" | "tool" | "gate"; text: string; status?: string; preview?: string };

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
const MAX_LOG_ROWS = 500; // a shell loop can emit thousands of gate events; the drawer keeps the tail

const appendLog = (log: LogRow[], row: LogRow): LogRow[] => (log.length >= MAX_LOG_ROWS ? [...log.slice(-(MAX_LOG_ROWS - 1)), row] : [...log, row]);

export function reduceRun(prev: RunView, e: RunEvent): RunView {
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
      return { ...view, log: appendLog(view.log, { kind: "commentary", text: e.text }) };
    case "run.tool": {
      const log = view.log.length >= MAX_LOG_ROWS ? view.log.slice(-(MAX_LOG_ROWS - 1)) : [...view.log];
      const key = `${e.name} ${e.callId}`;
      const i = log.findIndex((l) => l.kind === "tool" && l.text === key);
      const row: LogRow = { kind: "tool", text: key, status: e.status, ...(e.preview ? { preview: e.preview } : {}) };
      if (i >= 0) log[i] = row;
      else log.push(row);
      return { ...view, log, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd };
    }
    case "run.handoff":
      return { ...view, log: appendLog(view.log, { kind: "commentary", text: `Agent asks for help: ${e.reason}` }) };
    case "approval.request":
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

function Inline({ text }: { text: string }) {
  return (
    <>
      {renderInline(text).map((part, i) =>
        typeof part === "string" ? <span key={i}>{part}</span> : part.bold !== undefined ? <b key={i}>{part.bold}</b> : <code key={i}>{part.code}</code>,
      )}
    </>
  );
}

const DONE_MARKER = /PROJECT DONE/i;

export function RunDrawer({ run, sandboxReady }: { run: RunView; sandboxReady: boolean }) {
  const [goal, setGoal] = useState("Run ls -al and tell me how many entries are listed.");
  // Autopilot: keep restarting the same goal until the agent says PROJECT DONE or the run limit is hit,
  // and hand control back on handoffs by itself. For long builds where nobody sits at the keyboard.
  const [autopilot, setAutopilot] = useState(false);
  const [maxRuns, setMaxRuns] = useState(20);
  const [pilot, setPilot] = useState({ runs: 0, spent: 0, note: "" });
  const prevState = useRef<string | undefined>(undefined);
  const logRef = useRef<HTMLOListElement>(null);
  const busy = run.state !== undefined && RUNNING.has(run.state);

  useEffect(() => {
    const was = prevState.current;
    prevState.current = run.state;
    if (!autopilot || run.state === was) return;
    if (run.state === "running" && was !== "handoff" && was !== "awaiting_approval") setPilot((p) => ({ ...p, runs: p.runs + 1 }));
    if (run.state === "handoff") {
      const t = setTimeout(() => void window.workbench.resumeRun(), 10_000);
      return () => clearTimeout(t);
    }
    if (run.state === "completed" || run.state === "budget_exceeded") {
      const spent = pilot.spent + (run.costUsd ?? 0);
      const done = DONE_MARKER.test(run.finalText ?? "");
      const more = !done && pilot.runs < maxRuns;
      setPilot((p) => ({ ...p, spent, note: done ? "project done" : more ? "restarting in 5 s" : "run limit reached" }));
      if (!more) return;
      const t = setTimeout(() => void window.workbench.startRun(goal), 5000);
      return () => clearTimeout(t);
    }
    if (run.state === "failed" || run.state === "stopped") setPilot((p) => ({ ...p, note: `stopped: run ${run.state}` }));
    return undefined;
  }, [run.state, autopilot, maxRuns, goal, pilot.runs, pilot.spent, run.costUsd, run.finalText]);
  const thinking = busy && run.approvals.length === 0 && run.state !== "handoff" && !run.log.some((l) => l.kind === "tool" && l.status === "executing");
  const canRestore = run.runId !== undefined && run.snapshot && run.state !== undefined && TERMINAL.has(run.state);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.log.length, thinking, run.finalText]);

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
      <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} disabled={busy} placeholder="What should the agent do in this workspace?" />
      <div className="row">
        <button className="btn primary" disabled={!sandboxReady || busy || !goal.trim()} onClick={() => void window.workbench.startRun(goal)}>Start run</button>
        <button className="btn danger" disabled={!busy} onClick={() => void window.workbench.stopRun()} title="Shortcut: Esc while the agent has the terminal">Stop</button>
        {canRestore && <button className="btn" onClick={restore}>Restore pre-run state</button>}
      </div>
      <div className="row autopilot" title="Restart the same goal after each completed run until the agent's final reply contains PROJECT DONE or the run limit is hit; handoffs are given back after 10 s.">
        <label>
          <input type="checkbox" checked={autopilot} onChange={(e) => { setAutopilot(e.target.checked); setPilot({ runs: 0, spent: 0, note: "" }); }} /> Autopilot
        </label>
        <label>
          max runs <input type="number" min={1} max={200} value={maxRuns} onChange={(e) => setMaxRuns(Math.max(1, Number(e.target.value) || 1))} disabled={!autopilot} />
        </label>
        {autopilot && <span className="muted">run {pilot.runs}/{maxRuns}{pilot.spent ? ` · $${pilot.spent.toFixed(2)}` : ""}{pilot.note ? ` · ${pilot.note}` : ""}</span>}
      </div>
      <div className="stats">
        <span>state <b>{label(STATE_LABEL, run.state) || "idle"}</b>{run.endReason ? ` · ${label(END_REASON_LABEL, run.endReason)}` : ""}</span>
        <span>turns <b>{run.turns}</b></span>
        <span>tools <b>{run.toolCalls}</b></span>
        <span>cost <b>{run.costUsd === null ? "n/a" : `$${run.costUsd.toFixed(4)}`}</b></span>
        <span>snapshot <b>{run.state ? (run.snapshot ? "git" : "none") : "—"}</b></span>
      </div>
      {run.restored && <div className="notice">{run.restored}</div>}
      <ol className="log" ref={logRef}>
        {run.log.map((l, i) => (
          <li key={i} className={l.kind === "tool" ? `tool ${l.status ?? ""}` : l.kind === "gate" ? `gate ${l.status?.endsWith("blocked") ? "deny" : ""}` : "commentary"}>
            {l.kind === "tool" ? (
              <>
                <code>{l.text.split(" ")[0]}</code>
                {l.preview && <span className="preview">{l.preview}</span>}
                <span className="st">{l.status}</span>
              </>
            ) : l.kind === "gate" ? (
              <>
                <span className="st">{l.status}</span> <code>{l.text}</code>
              </>
            ) : (
              <Inline text={l.text} />
            )}
          </li>
        ))}
        {thinking && (
          <li className="tool executing thinking">
            <code>model</code>
            <span className="st">thinking</span>
          </li>
        )}
        {run.finalText && run.state === "completed" && (
          <li className="final">
            <Inline text={run.finalText} />
          </li>
        )}
      </ol>
    </aside>
  );
}
