import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ApprovalCard } from "./ApprovalCard";
import { useActivityLog } from "./useActivityLog";
import { RunHistory } from "./RunHistory";
import { RunProgress } from "./RunProgress";
import { TaskComposer } from "./TaskComposer";
import { FollowupComposer, type Conversation } from "./FollowupComposer";
import { BudgetPause } from "./BudgetPause";
import { STYLES } from "./task-settings";
import { RUNNING, TERMINAL, type LogRow, type RunView } from "./run-view";
export { emptyRun, reduceRun, type RunEvent, type RunView } from "./run-view";
import { END_REASON_LABEL, STATE_LABEL, label, renderInline } from "./labels";


function Inline({ text }: { text: string }) {
  return (
    <>
      {renderInline(text).map((part, i) =>
        typeof part === "string" ? <span key={i}>{part}</span> : part.bold !== undefined ? <b key={i}>{part.bold}</b> : <code key={i}>{part.code}</code>,
      )}
    </>
  );
}

// Memoised: an event touches one row; the other few hundred must not re-render.
const Row = memo(function Row({ row: l }: { row: LogRow }) {
  return (
    <li data-log-id={l.id} className={l.kind === "tool" ? `tool ${l.status ?? ""}` : l.kind === "gate" ? `gate ${l.status?.endsWith("blocked") ? "deny" : ""}` : "commentary"}>
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

export function RunDrawer({ run, sandboxReady, activeGoal, workspace, surfaceWarning }: { run: RunView; sandboxReady: boolean; activeGoal: string; workspace?: string | undefined; surfaceWarning?: string | undefined }) {
  const [actionError, setActionError] = useState("");
  const [changes, setChanges] = useState<string | null>(null);
  const [composing, setComposing] = useState(!run.state);
  const [expanded, setExpanded] = useState(false);
  const [continuation, setContinuation] = useState<{ text: string; revision: number } | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationRevision, setConversationRevision] = useState(0);
  const restored = useRef(false);
  const refreshConversation = useCallback(() => setConversationRevision(v => v + 1), []);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    void window.workbench.getConversation().then(value => {
      if (cancelled) return;
      setConversation(value);
      if (!restored.current) { restored.current = true; if (value && !run.state) setComposing(false); }
    }).catch(e => { if (!cancelled) setActionError(String(e)); });
    return () => { cancelled = true; };
  }, [workspace, sandboxReady, run.runId, run.state, conversationRevision]);
  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);
  const started = useCallback(() => { setComposing(false); setExpanded(false); setContinuation(null); }, []);
  useEffect(() => { if (run.runId) { setComposing(false); setExpanded(false); } }, [run.runId]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [expanded]);
  const continueGoal = useCallback((previous: string, result: string) => {
    setContinuation({ text: `Continue this task: ${previous}\n\nPrevious result:\n${result}\n\nInspect the current workspace first and continue remaining work; do not repeat completed actions.`.slice(0, 4000), revision: Date.now() });
    setComposing(true);
  }, []);
  const showOutput = async () => {
    const relative = window.prompt("Output path inside this workspace (for example summary.md):");
    if (!relative) return;
    try { await window.workbench.showOutput(relative); } catch (e) { setActionError(String(e)); }
  };
  const busy = run.state !== undefined && RUNNING.has(run.state);
  const thinking = busy && run.approvals.length === 0 && run.state !== "handoff" && run.state !== "budget_paused" && !run.log.some((l) => l.kind === "tool" && l.status === "executing");
  const canRestore = run.runId !== undefined && run.snapshot && run.state !== undefined && TERMINAL.has(run.state);

  const { logRef, onScroll, unread, following, showLatest } = useActivityLog(run, thinking);

  const restore = () => {
    if (run.runId && window.confirm("Restore tracked files to the state before this run? Untracked files are left as they are.")) {
      void window.workbench.restoreRun(run.runId);
    }
  };

  return (
    <aside className={`drawer${composing && !busy ? " is-composing" : ""}${expanded && composing && !busy ? " is-expanded" : ""}`} id="run-drawer" aria-label="Agent task">
      <div className="task-heading"><h2 className="drawer-title">{composing && !busy ? "New task" : "Agent task"}</h2>
        {busy ? <button className="btn danger" onClick={() => void window.workbench.stopRun()}>Stop task</button>
          : <button className="btn" onClick={() => { setComposing(v => !v); setExpanded(false); setContinuation(null); }}>{composing ? "History & results" : "New task"}</button>}
      </div>
      {composing && !busy ? <TaskComposer key={workspace ?? "none"} workspace={workspace} ready={sandboxReady} expanded={expanded} onExpand={toggleExpanded} continuation={continuation} onStarted={started} /> : <>
      <RunProgress run={run} />
      {surfaceWarning && <p className="notice" role="alert">{surfaceWarning}</p>}
      {run.state === "budget_paused" && <BudgetPause run={run} disabled={!sandboxReady} />}
      <div className="drawer-controls">
      {run.approvals[0] && <section className="approval-queue" aria-label="Approval queue">
        <p className="queue-count" role="status">{run.approvals.length} pending · review one at a time</p>
        <ApprovalCard key={run.approvals[0].id} a={run.approvals[0]} />
        {run.approvals.length > 1 && <details className="queued-approvals"><summary>Next in queue ({run.approvals.length - 1})</summary><ol>{run.approvals.slice(1).map((a) => <li key={a.id}>{a.summary}<code>{a.command}</code></li>)}</ol></details>}
      </section>}
      {activeGoal && <details className="active-task"><summary>Task & settings</summary><p>{activeGoal}</p>
        {run.profile && <p className="composer-help">Style: {STYLES[run.profile as keyof typeof STYLES]?.name ?? run.profile}</p>}
        {run.model && <p className="composer-help">Model: {run.model} · {run.effort ?? "configured effort"}</p>}
        {run.budget && <p className="composer-help">{run.budget.limits.maxTurns === null ? "No step limit" : `${run.budget.limits.maxTurns} steps`} · {run.budget.limits.maxDurationMs === null ? "no time limit" : `${run.budget.limits.maxDurationMs / 60000} min active time`}</p>}
      </details>}
      {run.state === "handoff" && <p className="notice" role="status">Paused for you. Resume explicitly when you are ready.</p>}
      {run.state === "budget_exceeded" && <p className="notice" role="status">Budget reached. Review the log and update your goal before starting another run.</p>}
      <div className="stats">
        <span>state <b>{label(STATE_LABEL, run.state) || "idle"}</b>{run.endReason ? ` · ${label(END_REASON_LABEL, run.endReason)}` : ""}</span>
        <span>turns <b>{run.turns}</b></span>
        <span>tools <b>{run.toolCalls}</b></span>
        <span>cost <b>{run.costUsd === null ? "n/a" : `$${run.costUsd.toFixed(4)}`}</b></span>
        <span>snapshot <b>{run.state ? (run.snapshot ? "git" : "none") : "—"}</b></span>
      </div>
      {canRestore && <button className="btn" onClick={restore}>Restore pre-run state</button>}
      <RunHistory workspace={workspace} revision={`${run.runId ?? ""}:${busy}`} onContinue={continueGoal} />
      {run.restored && <div className="notice">{run.restored}</div>}
      </div>
      <ol className="log" aria-label="Run activity" tabIndex={0} ref={logRef} onScroll={onScroll}>
        {conversation && conversation.messages.filter(m => !run.runId || !m.id.startsWith(`${run.runId}:`)).length > 0 && <li className="conversation-history"><details open={!run.runId}><summary>Earlier in this conversation</summary>{conversation.messages.filter(m => !run.runId || !m.id.startsWith(`${run.runId}:`)).map(m => <article key={m.id}><strong>{m.role === "user" ? "You" : "Agent"}</strong><div><Inline text={m.text} /></div></article>)}</details></li>}
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
            <h3>Result</h3>
            <Inline text={run.finalText} />
            <div className="row result-actions">
              <button className="btn" onClick={() => void navigator.clipboard.writeText(run.finalText ?? "").catch(e => setActionError(String(e)))}>Copy result</button>
              <button className="btn" onClick={() => void showOutput()}>Show output…</button>
              <button className="btn" onClick={() => void window.workbench.getChanges().then(setChanges).catch(e => setActionError(String(e)))}>Workspace changes</button>
            </div>
          </li>
        )}
      </ol>
      {changes !== null && <details className="workspace-changes" open><summary>Workspace changes</summary><pre>{changes}</pre><button className="btn" onClick={() => setChanges(null)}>Close</button></details>}
      </>}
      {!composing && conversation && <FollowupComposer key={conversation.conversationId} conversation={run.runId ? { ...conversation, runId: run.runId } : conversation} busy={busy} ready={sandboxReady} refresh={refreshConversation} />}
      {actionError && <p className="error" role="alert">{actionError}</p>}
      {!composing && !following && <button className="btn log-follow" onClick={showLatest}>
        {unread > 0 ? `${unread} new ${unread === 1 ? "update" : "updates"} · ` : ""}{run.finalText && run.state === "completed" ? "Show result" : "Follow latest"}
      </button>}
    </aside>
  );
}
