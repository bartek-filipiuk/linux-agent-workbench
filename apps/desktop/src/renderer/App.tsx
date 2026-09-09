import type { ModelCatalog, ModelSelection, RunLimits, BudgetAction } from "@law/protocol";
import type { BrowserControl } from "@law/protocol";
import { useEffect, useRef, useState } from "react";
import { SetupPanel, type SetupState, type AccountState } from "./SetupPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import type { HistoryRow, HistoryDetail } from "./RunHistory";
import { PanelLayout } from "./PanelLayout";
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
      checkSetup(): Promise<SetupState>;
      loginCodex(): Promise<AccountState>;
      cancelLogin(): Promise<void>;
      retrySetup(): Promise<void>;
      onAccount(cb: (s: AccountState) => void): () => void;
      getModels(refresh?: boolean): Promise<ModelCatalog>;
      getRun(): Promise<{ run: RunView; goal: string; handoff: string | null; sequence: number }>;
      getHistory(): Promise<HistoryRow[]>;
      getRunDetail(id: string): Promise<HistoryDetail>;
      getChanges(): Promise<string>;
      showOutput(relative: string): Promise<void>;
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      getLease(): Promise<Leases>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      applyNetwork(): Promise<void>;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      terminalRefresh(): void;
      startRun(goal: string, opts?: { profile?: "quick" | "research" | "project"; maxTurns?: number; modelSelection?: ModelSelection; limits?: RunLimits }): Promise<void>;
      stopRun(): Promise<void>;
      continueBudget(runId: string, action: BudgetAction): Promise<void>;
      resumeRun(): Promise<void>;
      takeControl(surface?: "terminal" | "browser"): Promise<void>;
      releaseControl(surface?: "terminal" | "browser"): Promise<void>;
      decideApproval(id: string, decision: "once" | "session" | "deny"): Promise<void>;
      restoreRun(runId: string): Promise<void>;
      browserControl(command: BrowserControl): Promise<void>;
      getBrowser(): Promise<BrowserStatus>;
      startBrowser(): Promise<void>;
      stopBrowser(): Promise<void>;
      navigate(url: string): Promise<void>;
      browserInput(event: unknown): void;
      browserFrames(on: boolean): void;
      writeDiagnostics(): Promise<string>;
      getDiagnostics(): Promise<{ running: boolean; step: string; file?: string }>;
      cancelDiagnostics(): Promise<void>;
      onDiagnostics(cb: (s: { running: boolean; step: string; file?: string }) => void): () => void;
      browserFrameAck(id: number): void;
      getPolicy(): Promise<PolicySettings>;
      setPolicy(patch: Partial<PolicySettings>): Promise<PolicySettings>;
      onBrowserState(cb: (s: BrowserStatus) => void): () => void;
      onBrowserFrame(cb: (f: { id: number; generation: number; width: number; height: number; data: Uint8Array }) => void): () => void;
      onEvent(cb: (e: AgentdStatus) => void): () => void;
      onSession(cb: (s: SessionStatus) => void): () => void;
      onTerminalData(cb: (data: Uint8Array, consumed: () => void) => void): () => void;
      onRun(cb: (e: RunEvent) => void): () => void;
      onLease(cb: (l: LeaseState) => void): () => void;
    };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  const [session, setSession] = useState<SessionStatus>({ state: "idle" });
  const [network, setNetwork] = useState<"open" | "none">("open");
  const networkRequest = useRef(false);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const [networkApplying, setNetworkApplying] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [networkSaving, setNetworkSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicySettings>({ nestedAutonomy: true, domainMode: "open" });
  const [leases, setLeases] = useState<Leases>({ terminal: { surface: "terminal", owner: "human" }, browser: { surface: "browser", owner: "human" } });
  const lastSequence = useRef(0);
  const [runHydrated, setRunHydrated] = useState(false);
  const [activeGoal, setActiveGoal] = useState("");
  const [providerReady, setProviderReady] = useState(false);
  const [run, setRun] = useState<RunView>(emptyRun);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserStatus>({ state: "idle" });
  const [view, setView] = useState<"terminal" | "browser" | "both">("terminal");

  useEffect(() => {
    let hydrated = false;
    let disposed = false;
    let workspace: string | undefined;
    const pending: RunEvent[] = [];
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(s => { if (!disposed && workspace === undefined) { workspace = s.workspacePath; setSession(s); } });
    void window.workbench.getNetwork().then(setNetwork);
    void window.workbench.getPolicy().then(setPolicy);
    void window.workbench.getLease().then(setLeases);
    void window.workbench.getBrowser().then(setBrowser);
    const offs = [
      window.workbench.onBrowserState(setBrowser),
      window.workbench.onEvent((s) => {
        setStatus(s);
        if (s.type === "agentd.error" && networkRequest.current) { networkRequest.current = false; setNetworkApplying(false); setNetworkError(s.message); }
      }),
      window.workbench.onSession((s) => {
        if (workspace && s.workspacePath && workspace !== s.workspacePath) {
          setRun(emptyRun); setActiveGoal(""); setHandoff(null);
        }
        if (s.workspacePath) workspace = s.workspacePath;
        setSession(s);
        if (s.state === "ready" || s.state === "error") { networkRequest.current = false; setNetworkApplying(false); }
      }),
      window.workbench.onLease((l) => setLeases((prev) => ({ ...prev, [l.surface]: l }))),
      window.workbench.onRun((e) => {
        if (!hydrated) { pending.push(e); return; }
        if (e.type === "run.state" && e.goal !== undefined) setActiveGoal(e.goal);
        if (e.sequence !== undefined && e.sequence <= lastSequence.current) return;
        if (e.sequence !== undefined) lastSequence.current = e.sequence;
        setRun((v) => reduceRun(v, e));
        if (e.type === "run.handoff") setHandoff(e.reason);
        if (e.type === "run.state" && e.state !== "handoff") setHandoff(null);
      }),
    ];
    void window.workbench.getRun().then(snapshot => {
      if (disposed) return;
      let view = snapshot.run;
      let handoff = snapshot.handoff;
      let goal = snapshot.goal;
      lastSequence.current = snapshot.sequence;
      for (const e of pending) {
        if (e.sequence !== undefined && e.sequence <= lastSequence.current) continue;
        if (e.sequence !== undefined) lastSequence.current = e.sequence;
        view = reduceRun(view, e);
        if (e.type === "run.handoff") handoff = e.reason;
        if (e.type === "run.state") { if (e.state !== "handoff") handoff = null; if (e.goal !== undefined) goal = e.goal; }
      }
      hydrated = true;
      setRun(view); setActiveGoal(goal); setHandoff(handoff); setRunHydrated(true);
    }).catch(e => { if (!disposed) setStatus({ type: "agentd.error", message: `Cannot restore run: ${String(e)}` }); });
    return () => { disposed = true; offs.forEach((f) => f()); };

  }, []);

  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      const settings = settingsRef.current;
      if (settings?.open && !settings.contains(e.target as Node)) settings.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  const live = session.state === "ready";
  const agentOwns = leases.terminal.owner === "agent";
  const agentOwnsBrowser = leases.browser.owner === "agent";
  const anyAgent = agentOwns || agentOwnsBrowser;
  const runActive = run.state !== undefined && ["running", "awaiting_approval", "budget_paused"].includes(run.state);
  const approvalsPending = run.approvals.length > 0;
  const networkPending = !!session.sessionId && session.networkMode !== undefined && network !== session.networkMode;
  const canApplyNetwork = live && !browser.manual && !browser.transitioning && !runActive && run.state !== "handoff" && !approvalsPending && !networkApplying && !networkSaving;
  const saveNetwork = async (mode: "open" | "none") => {
    setNetworkSaving(true);
    setNetworkError("");
    try { setNetwork(await window.workbench.setNetwork(mode)); }
    catch (e) { setNetworkError(`Could not save network preference: ${String(e)}`); }
    finally { setNetworkSaving(false); }
  };
  const applyNetwork = async () => {
    if (!canApplyNetwork) return;
    networkRequest.current = true;
    setNetworkApplying(true);
    setNetworkError("");
    try { await window.workbench.applyNetwork(); }
    catch (e) { networkRequest.current = false; setNetworkApplying(false); setNetworkError(`Could not apply network preference: ${String(e)}`); }
  };

  // Esc stops the run while the agent has the terminal; when you hold the keyboard, Esc belongs to the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settingsRef.current?.open) {
        e.preventDefault();
        e.stopPropagation();
        settingsRef.current.open = false;
        settingsRef.current.querySelector("summary")?.focus();
        return;
      }
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
        <div className="workspace-bar">
        <span className="brand">Linux Agent Workbench</span>
        <button className="btn" disabled={networkApplying} onClick={() => void window.workbench.selectWorkspace()}>Open workspace…</button>
        <span className="path" title={session.workspacePath}>{session.workspacePath ?? "no workspace"}</span>
        <span className={`badge net-${live ? session.networkMode ?? "unknown" : "none"}`} title="Active sandbox network">
          NET {live ? (session.networkMode?.toUpperCase() ?? "UNKNOWN") : "INACTIVE"}
        </span>
        <details className="workspace-settings" ref={settingsRef}>
          <summary className="btn">Settings</summary>
          <div className="settings-content">
            <h2>Workspace settings</h2>
        <label className="network-setting">Next start
          <select aria-label="Network for next start" value={network} disabled={networkSaving || networkApplying} onChange={(e) => void saveNetwork(e.target.value as "open" | "none")}>
            <option value="open">open</option><option value="none">none</option>
          </select>
        </label>
        <span className={`badge pol-${policy.nestedAutonomy ? "auto" : "sup"}`} title="Autonomous: claude and codex start with their permission prompts skipped; the sandbox is the boundary. Supervised: a bypass flag needs your approval.">
          AGENTS
          <select aria-label="Nested agent permissions" value={policy.nestedAutonomy ? "auto" : "sup"} onChange={(e) => void window.workbench.setPolicy({ nestedAutonomy: e.target.value === "auto" }).then(setPolicy)}>
            <option value="auto">autonomous</option>
            <option value="sup">supervised</option>
          </select>
        </span>
        <span className={`badge pol-${policy.domainMode}`} title="ask: a card before the sandbox or the browser first talks to a new host during a run">
          DOMAINS
          <select aria-label="Domain access policy" value={policy.domainMode} onChange={(e) => void window.workbench.setPolicy({ domainMode: e.target.value as "open" | "ask" }).then(setPolicy)}>
            <option value="open">open</option>
            <option value="ask">ask</option>
          </select>
        </span>
            <div className="settings-actions">
        <DiagnosticsPanel />
        <button className="btn danger" disabled={!session.sessionId || networkApplying} onClick={destroy}>Destroy sandbox</button>
            </div>
          </div>
        </details>
        </div>
        <div className="workspace-toolbar">
        <span className="view-switch" role="tablist" aria-label="Panels">
          {(["terminal", "browser", "both"] as const).map((v) => (
            <button key={v} id={`view-${v}`} role="tab" aria-controls="workspace-panels" tabIndex={view === v ? 0 : -1} aria-selected={view === v}
              onKeyDown={(e) => {
                const views = ["terminal", "browser", "both"] as const;
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const index = e.key === "Home" ? 0 : e.key === "End" ? 2 : (views.indexOf(v) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                const next = views[index]!;
                setView(next);
                document.getElementById(`view-${next}`)?.focus();
              }} className={`btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              {v === "terminal" ? "Terminal" : v === "browser" ? "Browser" : "Both"}
            </button>
          ))}
        </span>
        <span className="spacer" />
        <span className="status" role="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state} · run ${label(STATE_LABEL, run.state) || "idle"}`}
          {status.type === "agentd.ready" && status.keyStore === "env" && (
            <span className="warn" title={`safeStorage backend: ${status.keyBackend ?? "unknown"}. Install gnome-keyring or kwallet so the key can be encrypted.`}> · key in plain .env</span>
          )}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        </div>
      </header>
      <SetupPanel onReady={setProviderReady} workspaceReady={live} />
      {(networkPending || networkError || networkApplying) && <div className="banner network-notice" role="status">
        <span>{networkError || (networkApplying ? "Applying network preference…" : `Pending: ${network.toUpperCase()}. ${live ? `This session still uses ${session.networkMode?.toUpperCase()}.` : "It will apply when the sandbox starts."}`)}{networkPending && (runActive || run.state === "handoff" || approvalsPending) && " Finish or stop the run before applying."}</span>
        {networkPending && <button className="btn" disabled={!canApplyNetwork} onClick={() => void applyNetwork()}>Apply to this session</button>}
      </div>}
      {handoff && (
        <div className="banner">
          <span>
            {approvalsPending ? "The agent is waiting for your decision on the right." : <>Agent paused and needs you: <b>{handoff}</b>. You have the keyboard.</>}
          </span>
          {!approvalsPending && <button className="btn primary" disabled={browser.manual || browser.transitioning} onClick={() => void window.workbench.resumeRun()}>Give control back to agent</button>}
        </div>
      )}
      <PanelLayout labelledBy={`view-${view}`} surfaces={<>
        {view !== "terminal" && <BrowserPanel status={browser} owner={agentOwnsBrowser ? "agent" : "human"} runActive={(runActive && run.state !== "budget_paused") || run.state === "handoff"} />}
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
      </>} drawer={<RunDrawer key={session.workspacePath ?? "none"} run={run} activeGoal={activeGoal} workspace={session.workspacePath} sandboxReady={live && !networkApplying && providerReady && runHydrated && !browser.manual && !browser.transitioning} />} />
      <footer className="bottombar">
        <span className={`owner ${leases.terminal.owner}`}>terminal: {leases.terminal.owner.toUpperCase()}</span>
        <span className={`owner ${leases.browser.owner}`}>browser: {leases.browser.owner.toUpperCase()}</span>
        {(leases.terminal.reason ?? leases.browser.reason) && <span className="hint">{leases.terminal.reason ?? leases.browser.reason}</span>}
        <span className="spacer" />
        {anyAgent ? (
          <button className="btn" onClick={() => void window.workbench.takeControl()}>Take control</button>
        ) : (
          runActive && run.state !== "budget_paused" && <button className="btn" onClick={() => void window.workbench.releaseControl()}>Give control back</button>
        )}
      </footer>
    </div>
  );
}
