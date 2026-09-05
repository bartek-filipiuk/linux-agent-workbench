import { useEffect, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";
import { BrowserPanel, type BrowserStatus } from "./BrowserPanel";
import { RunDrawer, emptyRun, reduceRun, type RunEvent, type RunView } from "./RunDrawer";
import { STATE_LABEL, label } from "./labels";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number; keyStore?: "keyring" | "env" | "none"; keyBackend?: string }
  | { type: "agentd.error"; message: string };
type SessionStatus = { state: "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"; sessionId?: string; workspacePath?: string; networkMode?: "open" | "none"; message?: string };
type LeaseState = { surface: "terminal" | "browser"; owner: "agent" | "human"; reason?: string };
type PolicySettings = { nestedAutonomy: boolean; domainMode: "open" | "ask" };
type Leases = Record<"terminal" | "browser", LeaseState>;

declare global {
  interface Window {
    workbench: {
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      getLease(): Promise<Leases>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      terminalRefresh(): void;
      startRun(goal: string): Promise<void>;
      stopRun(): Promise<void>;
      resumeRun(): Promise<void>;
      takeControl(surface?: "terminal" | "browser"): Promise<void>;
      releaseControl(surface?: "terminal" | "browser"): Promise<void>;
      decideApproval(id: string, decision: "once" | "session" | "deny"): Promise<void>;
      restoreRun(runId: string): Promise<void>;
      getBrowser(): Promise<BrowserStatus>;
      startBrowser(): Promise<void>;
      stopBrowser(): Promise<void>;
      navigate(url: string): Promise<void>;
      browserInput(event: unknown): void;
      browserFrames(on: boolean): void;
      writeDiagnostics(): Promise<string>;
      getPolicy(): Promise<PolicySettings>;
      setPolicy(patch: Partial<PolicySettings>): Promise<PolicySettings>;
      onBrowserState(cb: (s: BrowserStatus) => void): () => void;
      onBrowserFrame(cb: (f: { width: number; height: number; data: Uint8Array }) => void): () => void;
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
  const [policy, setPolicy] = useState<PolicySettings>({ nestedAutonomy: true, domainMode: "open" });
  const [leases, setLeases] = useState<Leases>({ terminal: { surface: "terminal", owner: "human" }, browser: { surface: "browser", owner: "human" } });
  const [run, setRun] = useState<RunView>(emptyRun);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserStatus>({ state: "idle" });
  const [view, setView] = useState<"terminal" | "browser" | "both">("terminal");

  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(setSession);
    void window.workbench.getNetwork().then(setNetwork);
    void window.workbench.getPolicy().then(setPolicy);
    void window.workbench.getLease().then(setLeases);
    void window.workbench.getBrowser().then(setBrowser);
    const offs = [
      window.workbench.onBrowserState(setBrowser),
      window.workbench.onEvent(setStatus),
      window.workbench.onSession(setSession),
      window.workbench.onLease((l) => setLeases((prev) => ({ ...prev, [l.surface]: l }))),
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
  const agentOwns = leases.terminal.owner === "agent";
  const agentOwnsBrowser = leases.browser.owner === "agent";
  const anyAgent = agentOwns || agentOwnsBrowser;
  const runActive = run.state !== undefined && ["running", "awaiting_approval"].includes(run.state);
  const approvalsPending = run.approvals.length > 0;

  // Esc stops the run while the agent has the terminal; when you hold the keyboard, Esc belongs to the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && runActive && anyAgent) {
        e.preventDefault();
        void window.workbench.stopRun();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [runActive, anyAgent]);

  const destroy = () => {
    if (window.confirm("Remove the sandbox container? The tmux session and anything outside /workspace inside it are lost. Files in the workspace stay.")) {
      void window.workbench.destroySandbox();
    }
  };

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
        <span className={`badge pol-${policy.nestedAutonomy ? "auto" : "sup"}`} title="Autonomous: claude and codex start with their permission prompts skipped; the sandbox is the boundary. Supervised: a bypass flag needs your approval.">
          AGENTS
          <select value={policy.nestedAutonomy ? "auto" : "sup"} onChange={(e) => void window.workbench.setPolicy({ nestedAutonomy: e.target.value === "auto" }).then(setPolicy)}>
            <option value="auto">autonomous</option>
            <option value="sup">supervised</option>
          </select>
        </span>
        <span className={`badge pol-${policy.domainMode}`} title="ask: a card before the sandbox or the browser first talks to a new host during a run">
          DOMAINS
          <select value={policy.domainMode} onChange={(e) => void window.workbench.setPolicy({ domainMode: e.target.value as "open" | "ask" }).then(setPolicy)}>
            <option value="open">open</option>
            <option value="ask">ask</option>
          </select>
        </span>
        <span className="view-switch" role="tablist" aria-label="Panels">
          {(["terminal", "browser", "both"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={`btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              {v === "terminal" ? "Terminal" : v === "browser" ? "Browser" : "Both"}
            </button>
          ))}
        </span>
        <span className="spacer" />
        <span className="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state} · run ${label(STATE_LABEL, run.state) || "idle"}`}
          {status.type === "agentd.ready" && status.keyStore === "env" && (
            <span className="warn" title={`safeStorage backend: ${status.keyBackend ?? "unknown"}. Install gnome-keyring or kwallet so the key can be encrypted.`}> · key in plain .env</span>
          )}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        <button className="btn" title="Write a diagnostics file (versions, containers, recent agentd log) with secrets removed" onClick={() => void window.workbench.writeDiagnostics().then((p) => window.alert(`Diagnostics written to\n${p}`))}>
          Diagnostics
        </button>
        <button className="btn danger" disabled={!session.sessionId} onClick={destroy}>Destroy sandbox</button>
      </header>
      {handoff && (
        <div className="banner">
          <span>
            {approvalsPending ? "The agent is waiting for your decision on the right." : <>Agent paused and needs you: <b>{handoff}</b>. You have the keyboard.</>}
          </span>
          {!approvalsPending && <button className="btn primary" onClick={() => void window.workbench.resumeRun()}>Give control back to agent</button>}
        </div>
      )}
      <main className="main">
        {view !== "terminal" && <BrowserPanel status={browser} owner={agentOwnsBrowser ? "agent" : "human"} runActive={runActive || run.state === "handoff"} />}
        {/* The terminal stays mounted across view switches: unmounting would throw away the screen. */}
        {live ? (
          <TerminalPanel owner={agentOwns ? "agent" : "human"} visible={view !== "browser"} />
        ) : view === "browser" ? null : (
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
        <span className={`owner ${leases.terminal.owner}`}>terminal: {leases.terminal.owner.toUpperCase()}</span>
        <span className={`owner ${leases.browser.owner}`}>browser: {leases.browser.owner.toUpperCase()}</span>
        {(leases.terminal.reason ?? leases.browser.reason) && <span className="hint">{leases.terminal.reason ?? leases.browser.reason}</span>}
        <span className="spacer" />
        {anyAgent ? (
          <button className="btn" onClick={() => void window.workbench.takeControl()}>Take control</button>
        ) : (
          runActive && <button className="btn" onClick={() => void window.workbench.releaseControl()}>Give control back</button>
        )}
      </footer>
    </div>
  );
}
