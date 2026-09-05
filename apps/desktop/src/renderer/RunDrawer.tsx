import { memo, useEffect, useRef, useState } from "react";
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

export type LogRow = { id: number; kind: "commentary" | "tool" | "gate"; text: string; status?: string; preview?: string };
let nextRowId = 1; // stable keys so React can skip unchanged rows instead of re-rendering the whole log

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

const appendLog = (log: LogRow[], row: Omit<LogRow, "id">): LogRow[] => {
  const full: LogRow = { id: nextRowId++, ...row };
  return log.length >= MAX_LOG_ROWS ? [...log.slice(-(MAX_LOG_ROWS - 1)), full] : [...log, full];
};

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
      const key = `${e.name} ${e.callId}`;
      // A tool's row is updated in place (executing → done); it is almost always near the end.
      let i = -1;
      for (let j = view.log.length - 1; j >= 0; j--) if (view.log[j]!.kind === "tool" && view.log[j]!.text === key) { i = j; break; }
      if (i >= 0) {
        const log = [...view.log];
        log[i] = { ...log[i]!, status: e.status, ...(e.preview ? { preview: e.preview } : {}) };
        return { ...view, log, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd };
      }
      return { ...view, log: appendLog(view.log, { kind: "tool", text: key, status: e.status, ...(e.preview ? { preview: e.preview } : {}) }), turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd };
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

// Memoised: an event touches one row; the other few hundred must not re-render.
const Row = memo(function Row({ row: l }: { row: LogRow }) {
  return (
    <li className={l.kind === "tool" ? `tool ${l.status ?? ""}` : l.kind === "gate" ? `gate ${l.status?.endsWith("blocked") ? "deny" : ""}` : "commentary"}>
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
  );
});

export function RunDrawer({ run, sandboxReady }: { run: RunView; sandboxReady: boolean }) {
  const [goal, setGoal] = useState("Run ls -al and tell me how many entries are listed.");
  // Profile = working rules (and possibly a cheaper model) for the run; max turns = the per-run budget.
  const [profile, setProfile] = useState<"quick" | "research" | "project">("quick");
  const [maxTurns, setMaxTurns] = useState(40);
  const runOpts = () => ({ profile, maxTurns });
  // Autopilot: keep restarting the same goal until the agent says PROJECT DONE or the run limit is hit,
  // and hand control back on handoffs by itself. For long builds where nobody sits at the keyboard.
  const [autopilot, setAutopilot] = useState(false);
  const [maxRuns, setMaxRuns] = useState(20);
  const [pilot, setPilot] = useState({ runs: 0, spent: 0, note: "" });
  // Everything the autopilot effect reads lives in refs: the effect must react to state transitions only,
  // never re-run (and cancel its own timers) because a counter or the goal text changed.
  const prevState = useRef<string | undefined>(undefined);
  const pilotRef = useRef({ runs: 0, spent: 0, handoffs: 0 });
  const latest = useRef({ goal, maxRuns, run, opts: runOpts() });
  latest.current = { goal, maxRuns, run, opts: runOpts() };
  const logRef = useRef<HTMLOListElement>(null);
  const busy = run.state !== undefined && RUNNING.has(run.state);

  useEffect(() => {
    const was = prevState.current;
    prevState.current = run.state;
    if (!autopilot || run.state === was) return;
    const p = pilotRef.current;
    const { maxRuns: limit, goal: goalNow, run: r, opts: optsNow } = latest.current;
    if (run.state === "running" && was !== "handoff" && was !== "awaiting_approval") {
      p.runs += 1;
      p.handoffs = 0;
      setPilot({ runs: p.runs, spent: p.spent, note: "" });
    }
    if (run.state === "handoff") {
      p.handoffs += 1;
      // The same run asking three times means nobody can answer (a password, a locked surface): stop pretending.
      if (p.handoffs >= 3) {
        const why = [...r.log].reverse().find((l) => l.kind === "commentary" && l.text.startsWith("Agent asks for help"))?.text ?? "";
        setPilot({ runs: p.runs, spent: p.spent, note: `needs you: ${why.replace("Agent asks for help: ", "").slice(0, 80) || "repeated handoff"}` });
        return;
      }
      const t = setTimeout(() => void window.workbench.resumeRun(), 10_000);
      return () => clearTimeout(t);
    }
    if (run.state === "completed" || run.state === "budget_exceeded") {
      p.spent += r.costUsd ?? 0;
      const done = DONE_MARKER.test(r.finalText ?? "");
      const more = !done && p.runs < limit;
      setPilot({ runs: p.runs, spent: p.spent, note: done ? "project done" : more ? "restarting in 5 s" : "run limit reached" });
      if (!more) return;
      const t = setTimeout(() => void window.workbench.startRun(goalNow, optsNow), 5000);
      return () => clearTimeout(t);
    }
    if (run.state === "failed" || run.state === "stopped" || run.state === "interrupted") setPilot({ runs: p.runs, spent: p.spent, note: `stopped: run ${run.state}` });
    return undefined;
  }, [run.state, autopilot]);
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
        <button className="btn primary" disabled={!sandboxReady || busy || !goal.trim()} onClick={() => void window.workbench.startRun(goal, runOpts())}>Start run</button>
        <button className="btn danger" disabled={!busy} onClick={() => void window.workbench.stopRun()} title="Shortcut: Esc while the agent has the terminal">Stop</button>
        {canRestore && <button className="btn" onClick={restore}>Restore pre-run state</button>}
      </div>
      <div className="row autopilot" title="Profile: working rules for the run. research = scripts over clicking, save each item at once, compact context every 12 turns (and a cheaper model when LAW_RESEARCH_MODEL is set); project = coordinate a nested coding agent, compact every 20 turns; quick = as is. Max turns: the per-run budget.">
        <label>
          profile{" "}
          <select value={profile} onChange={(e) => setProfile(e.target.value as "quick" | "research" | "project")} disabled={busy}>
            <option value="quick">quick</option>
            <option value="research">research</option>
            <option value="project">project</option>
          </select>
        </label>
        <label>
          max turns <input type="number" min={5} max={400} value={maxTurns} onChange={(e) => setMaxTurns(Math.min(400, Math.max(5, Number(e.target.value) || 40)))} disabled={busy} />
        </label>
      </div>
      <div className="row autopilot" title="Restart the same goal after each completed run until the agent's final reply contains PROJECT DONE or the run limit is hit; handoffs are given back after 10 s.">
        <label>
          <input type="checkbox" checked={autopilot} onChange={(e) => { setAutopilot(e.target.checked); pilotRef.current = { runs: 0, spent: 0, handoffs: 0 }; setPilot({ runs: 0, spent: 0, note: "" }); }} /> Autopilot
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
        {run.log.map((l) => (
          <Row key={l.id} row={l} />
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
