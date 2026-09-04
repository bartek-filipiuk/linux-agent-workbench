import { useEffect, useState } from "react";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };

declare global {
  interface Window {
    workbench: { getStatus(): Promise<AgentdStatus>; onEvent(cb: (e: AgentdStatus) => void): () => void };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    return window.workbench.onEvent(setStatus);
  }, []);
  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  return (
    <>
      <header className="topbar">
        <span className="brand">LINUX AGENT WORKBENCH</span>
        <span className="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `agentd ready · ${status.model} · schema v${status.schemaVersion}`}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
      </header>
      <main className="main">
        {status.type === "agentd.ready" ? (
          <p>
            Database: <code>{status.dbPath}</code>
            {status.interruptedRuns > 0 && <> · {status.interruptedRuns} run(s) marked interrupted on restart</>}
          </p>
        ) : (
          <p>Terminal panel arrives in Milestone 2.</p>
        )}
      </main>
    </>
  );
}
