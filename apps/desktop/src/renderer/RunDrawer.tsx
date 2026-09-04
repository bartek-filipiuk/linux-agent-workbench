import { useState } from "react";

export type RunEvent =
  | { type: "run.state"; runId: string; state: string; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null }
  | { type: "run.commentary"; runId: string; text: string }
  | { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; turns: number; toolCalls: number; costUsd: number | null }
  | { type: "run.handoff"; runId: string; reason: string };

export type RunView = {
  runId?: string;
  state?: string;
  endReason?: string;
  finalText?: string;
  turns: number;
  toolCalls: number;
  costUsd: number | null;
  log: Array<{ kind: "commentary" | "tool"; text: string; status?: string }>;
};

export const emptyRun: RunView = { turns: 0, toolCalls: 0, costUsd: null, log: [] };

export function reduceRun(prev: RunView, e: RunEvent): RunView {
  // A new runId starts a fresh view so the drawer never mixes two runs.
  const view = prev.runId && prev.runId !== e.runId ? { ...emptyRun, runId: e.runId } : { ...prev, runId: e.runId };
  switch (e.type) {
    case "run.state": {
      // The final answer also arrives as the last commentary; keep it once, in the final box.
      const log = e.finalText !== undefined && view.log.at(-1)?.kind === "commentary" && view.log.at(-1)?.text === e.finalText ? view.log.slice(0, -1) : view.log;
      return { ...view, log, state: e.state, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd, ...(e.endReason ? { endReason: e.endReason } : {}), ...(e.finalText !== undefined ? { finalText: e.finalText } : {}) };
    }
    case "run.commentary":
      return { ...view, log: [...view.log, { kind: "commentary", text: e.text }] };
    case "run.tool": {
      const log = [...view.log];
      const key = `${e.name} ${e.callId}`;
      const i = log.findIndex((l) => l.kind === "tool" && l.text === key);
      const row = { kind: "tool" as const, text: key, status: e.status };
      if (i >= 0) log[i] = row;
      else log.push(row);
      return { ...view, log, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd };
    }
    case "run.handoff":
      return { ...view, log: [...view.log, { kind: "commentary", text: `Agent asks for help: ${e.reason}` }] };
  }
}

const RUNNING = new Set(["running", "awaiting_approval", "handoff"]);

export function RunDrawer({ run, sandboxReady }: { run: RunView; sandboxReady: boolean }) {
  const [goal, setGoal] = useState("Run ls -al and tell me how many entries are listed.");
  const busy = run.state !== undefined && RUNNING.has(run.state);
  return (
    <aside className="drawer">
      <label className="label" htmlFor="goal">Goal</label>
      <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} disabled={busy} />
      <div className="row">
        <button className="btn primary" disabled={!sandboxReady || busy || !goal.trim()} onClick={() => void window.workbench.startRun(goal)}>Start run</button>
        <button className="btn danger" disabled={!busy} onClick={() => void window.workbench.stopRun()}>Stop</button>
      </div>
      <div className="stats">
        <span>state <b>{run.state ?? "idle"}</b>{run.endReason ? ` (${run.endReason})` : ""}</span>
        <span>turns <b>{run.turns}</b></span>
        <span>tools <b>{run.toolCalls}</b></span>
        <span>cost <b>{run.costUsd === null ? "n/a" : `$${run.costUsd.toFixed(4)}`}</b></span>
      </div>
      <ol className="log">
        {run.log.map((l, i) => (
          <li key={i} className={l.kind === "tool" ? `tool ${l.status ?? ""}` : "commentary"}>
            {l.kind === "tool" ? (
              <>
                <code>{l.text.split(" ")[0]}</code> <span className="st">{l.status}</span>
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
