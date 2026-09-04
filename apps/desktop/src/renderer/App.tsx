import { useEffect, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };
type SessionStatus = { state: "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"; sessionId?: string; workspacePath?: string; networkMode?: "open" | "none"; message?: string };

declare global {
  interface Window {
    workbench: {
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      onEvent(cb: (e: AgentdStatus) => void): () => void;
      onSession(cb: (s: SessionStatus) => void): () => void;
      onTerminalData(cb: (data: Uint8Array) => void): () => void;
    };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  const [session, setSession] = useState<SessionStatus>({ state: "idle" });
  const [network, setNetwork] = useState<"open" | "none">("open");

  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(setSession);
    void window.workbench.getNetwork().then(setNetwork);
    const offA = window.workbench.onEvent(setStatus);
    const offB = window.workbench.onSession(setSession);
    return () => {
      offA();
      offB();
    };
  }, []);

  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  const live = session.state === "ready";

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
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state}`}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        <button className="btn danger" disabled={!session.sessionId} onClick={() => void window.workbench.destroySandbox()}>Destroy sandbox</button>
      </header>
      <main className="main">
        {live ? (
          <TerminalPanel owner="human" />
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
      </main>
      <footer className="bottombar">
        <span className="owner human">HUMAN controls the terminal</span>
        <span className="hint">Agent control arrives in Milestone 3.</span>
      </footer>
    </div>
  );
}
