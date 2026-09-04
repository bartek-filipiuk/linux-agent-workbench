import { useEffect, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";
import { RunDrawer, emptyRun, reduceRun, type RunEvent, type RunView } from "./RunDrawer";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };
type SessionStatus = { state: "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"; sessionId?: string; workspacePath?: string; networkMode?: "open" | "none"; message?: string };
type LeaseState = { owner: "agent" | "human"; reason?: string };

declare global {
  interface Window {
    workbench: {
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      getLease(): Promise<LeaseState>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      startRun(goal: string): Promise<void>;
      stopRun(): Promise<void>;
      resumeRun(): Promise<void>;
      takeControl(): Promise<void>;
      releaseControl(): Promise<void>;
      decideApproval(id: string, decision: "once" | "session" | "deny"): Promise<void>;
      restoreRun(runId: string): Promise<void>;
      onEvent(cb: (e: AgentdStatus) => void): () => void;
      onSession(cb: (s: SessionStatus) => void): () => void;
      onTerminalData(cb: (data: Uint8Array) => void): () => void;
      onRun(cb: (e: RunEvent) => void): () => void;
      onLease(cb: (l: LeaseState) => void): () => void;
    };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  const [session, setSession] = useState<SessionStatus>({ state: "idle" });
  const [network, setNetwork] = useState<"open" | "none">("open");
  const [lease, setLease] = useState<LeaseState>({ owner: "human" });
  const [run, setRun] = useState<RunView>(emptyRun);
  const [handoff, setHandoff] = useState<string | null>(null);

  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(setSession);
    void window.workbench.getNetwork().then(setNetwork);
    void window.workbench.getLease().then(setLease);
    const offs = [
      window.workbench.onEvent(setStatus),
      window.workbench.onSession(setSession),
      window.workbench.onLease(setLease),
      window.workbench.onRun((e) => {
        setRun((v) => reduceRun(v, e));
        if (e.type === "run.handoff") setHandoff(e.reason);
        if (e.type === "run.state" && e.state !== "handoff") setHandoff(null);
      }),
    ];
    return () => offs.forEach((f) => f());
  }, []);

  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  const live = session.state === "ready";
  const agentOwns = lease.owner === "agent";
  const runActive = run.state !== undefined && ["running", "awaiting_approval"].includes(run.state);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">LINUX AGENT WORKBENCH</span>
        <button className="btn" onClick={() => void window.workbench.selectWorkspace()}>Open workspace…</button>
        <span className="path" title={session.workspacePath}>{session.workspacePath ?? "no workspace"}</span>
        <span className={`badge net-${network}`} title="Container network for the next start">
          NET {network.toUpperCase()}
          <select value={network} onChange={(e) => void window.workbench.setNetwork(e.target.value as "open" | "none").then(setNetwork)}>
            <option value="open">open</option>
            <option value="none">none</option>
          </select>
        </span>
        <span className="spacer" />
        <span className="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state} · run ${run.state ?? "idle"}`}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        <button className="btn danger" disabled={!session.sessionId} onClick={() => void window.workbench.destroySandbox()}>Destroy sandbox</button>
      </header>
      {handoff && (
        <div className="banner">
          <span>
            Agent paused and needs you: <b>{handoff}</b>. You have the keyboard.
          </span>
          <button className="btn primary" onClick={() => void window.workbench.resumeRun()}>Give control back to agent</button>
        </div>
      )}
      <main className="main">
        {live ? (
          <TerminalPanel owner={agentOwns ? "agent" : "human"} />
        ) : (
          <div className="empty">
            {session.state === "error" && <pre className="error">{session.message}</pre>}
            {session.state === "starting" && <p>Starting sandbox…</p>}
            {session.state === "disconnected" && (
              <p>
                Disconnected from the sandbox. <button className="btn" onClick={() => void window.workbench.reopenLast()}>Reconnect</button>
              </p>
            )}
            {(session.state === "idle" || session.state === "stopped") && <p>Open a workspace to start a sandboxed terminal.</p>}
          </div>
        )}
        <RunDrawer run={run} sandboxReady={live} />
      </main>
      <footer className="bottombar">
        <span className={`owner ${lease.owner}`}>{agentOwns ? "AGENT controls the terminal" : "HUMAN controls the terminal"}</span>
        {lease.reason && <span className="hint">{lease.reason}</span>}
        <span className="spacer" />
        {agentOwns ? (
          <button className="btn" onClick={() => void window.workbench.takeControl()}>Take control</button>
        ) : (
          runActive && <button className="btn" onClick={() => void window.workbench.releaseControl()}>Give control back</button>
        )}
      </footer>
    </div>
  );
}
