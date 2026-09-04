import { z } from "zod";
import { ApprovalDecision, BrowserInputEvent, NetworkMode, type ApprovalRequest, type RunState } from "@law/protocol";
import type { BrowserSessionManager, BrowserStatus } from "./session/browser-session-manager.js";
import type { Store } from "./storage/store.js";
import type { SessionStatus, TerminalSessionManager } from "./session/terminal-session-manager.js";
import type { ModelAdapter } from "./provider/types.js";
import { RunController } from "./orchestrator/run-controller.js";
import { Lease, LeasePolicy, type LeaseOwner, type Surface } from "./policy/lease.js";
import { BrowserActionPolicy, type DomainMode } from "./policy/browser-policy.js";
import { browserExecutor } from "./tools/browser-tools.js";
import { terminalExecutor } from "./tools/terminal-tools.js";
import { composeExecutors } from "./provider/types.js";
import type { PriceTable } from "./orchestrator/budgets.js";
import { ApprovalManager } from "./policy/approvals.js";
import { CommandGate, type GateEvent } from "./policy/gate.js";
import { NestedPromptPolicy, composePolicies } from "./policy/nested-prompts.js";
import type { Policy } from "./policy/types.js";
import { restoreSnapshot, snapshotWorkspace, type Snapshot } from "./session/snapshot.js";

const Prices = z.object({ inputUsdPerMTok: z.number().nonnegative(), outputUsdPerMTok: z.number().nonnegative() });

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
  imageId: z.string().min(1),
  runtimeRoot: z.string().min(1),
  prices: Prices.optional(),
  browserImageId: z.string().min(1).optional(),
  browserDomainMode: z.enum(["open", "ask"]).optional(),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

export const SessionStart = z.object({ type: z.literal("session.start"), workspacePath: z.string().min(1), networkMode: NetworkMode });
export const SessionStop = z.object({ type: z.literal("session.stop"), destroy: z.boolean() });
export const TerminalWrite = z.object({ type: z.literal("terminal.write"), data: z.instanceof(Uint8Array) });
export const TerminalResizeMsg = z.object({ type: z.literal("terminal.resize"), cols: z.number().int().min(20).max(500), rows: z.number().int().min(5).max(200) });
export const RunStart = z.object({ type: z.literal("run.start"), goal: z.string().min(1).max(4000) });
export const RunStop = z.object({ type: z.literal("run.stop") });
export const RunResume = z.object({ type: z.literal("run.resume") });
export const LeaseTake = z.object({ type: z.literal("lease.take"), owner: z.enum(["agent", "human"]), surface: z.enum(["terminal", "browser"]).optional() });
export const ApprovalDecide = z.object({ type: z.literal("approval.decide"), id: z.string().min(1), decision: ApprovalDecision });
export const RunRestore = z.object({ type: z.literal("run.restore"), runId: z.string().min(1) });
export const BrowserStart = z.object({ type: z.literal("browser.start") });
export const BrowserStop = z.object({ type: z.literal("browser.stop") });
export const BrowserNavigateMsg = z.object({ type: z.literal("browser.navigate"), url: z.string().min(1).max(4096) });
export const BrowserInputMsg = z.object({ type: z.literal("browser.input"), event: BrowserInputEvent });

export const MainToAgentd = z.discriminatedUnion("type", [
  ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg, RunStart, RunStop, RunResume, LeaseTake, ApprovalDecide, RunRestore,
  BrowserStart, BrowserStop, BrowserNavigateMsg, BrowserInputMsg,
]);
export type MainToAgentd = z.infer<typeof MainToAgentd>;

export const AgentdReady = z.object({
  type: z.literal("agentd.ready"),
  schemaVersion: z.number().int(),
  dbPath: z.string(),
  model: z.string(),
  interruptedRuns: z.number().int(),
});
export type AgentdReady = z.infer<typeof AgentdReady>;
export const AgentdError = z.object({ type: z.literal("agentd.error"), message: z.string() });
export type AgentdError = z.infer<typeof AgentdError>;
export type SessionStateMsg = { type: "session.state" } & SessionStatus;
export type TerminalData = { type: "terminal.data"; data: Uint8Array };
export type RunStateMsg = { type: "run.state"; runId: string; state: RunState; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null; snapshot: boolean };
export type RunCommentary = { type: "run.commentary"; runId: string; text: string };
export type RunTool = { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; preview: string; turns: number; toolCalls: number; costUsd: number | null };
export type RunHandoff = { type: "run.handoff"; runId: string; reason: string };
export type LeaseStateMsg = { type: "lease.state"; surface: Surface; owner: LeaseOwner; reason?: string };
export type ApprovalRequestMsg = { type: "approval.request" } & ApprovalRequest;
export type ApprovalResolved = { type: "approval.resolved"; id: string; decision: ApprovalDecision };
export type GateEventMsg = { type: "gate.event" } & GateEvent;
export type RunRestored = { type: "run.restored"; runId: string; ok: boolean; message?: string };
export type BrowserStateMsg = { type: "browser.state" } & BrowserStatus;
export type BrowserFrameMsg = { type: "browser.frame"; width: number; height: number; data: Uint8Array };
export type AgentdToMain =
  | AgentdReady | AgentdError | SessionStateMsg | TerminalData | RunStateMsg | RunCommentary | RunTool | RunHandoff | LeaseStateMsg
  | ApprovalRequestMsg | ApprovalResolved | GateEventMsg | RunRestored | BrowserStateMsg | BrowserFrameMsg;

export type AgentdRuntime = { store: Store; model: string; apiKey: string; prices: PriceTable };

export function handleConfigInit(msg: unknown, openStore: (dbPath: string) => Store): { reply: AgentdReady | AgentdError; runtime?: AgentdRuntime } {
  const parsed = ConfigInit.safeParse(msg);
  if (!parsed.success) return { reply: { type: "agentd.error", message: "invalid config.init" } };
  const { apiKey, model, dbPath, prices } = parsed.data;
  try {
    const store = openStore(dbPath);
    const interruptedRuns = store.markInterruptedRuns("agentd_restart");
    const runtime: AgentdRuntime = { store, model, apiKey, prices: prices ? { [model]: prices } : {} };
    return { reply: { type: "agentd.ready", schemaVersion: store.schemaVersion, dbPath, model, interruptedRuns }, runtime };
  } catch (e) {
    return { reply: { type: "agentd.error", message: e instanceof Error ? e.message : String(e) } };
  }
}

export type BrowserContext = { runtimeRoot: string; sessionId: string; networkMode: NetworkMode; browserImageId?: string };
export type DaemonDeps = {
  openStore: (dbPath: string) => Store;
  makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager;
  makeBrowser?: (ctx: BrowserContext) => BrowserSessionManager;
  makeAdapter: (model: string, apiKey: string) => ModelAdapter;
  post: (msg: AgentdToMain) => void;
};

const TERMINAL: ReadonlySet<RunState> = new Set(["completed", "stopped", "failed", "budget_exceeded", "interrupted"]);

export class Daemon {
  private runtime: AgentdRuntime | undefined;
  private manager: TerminalSessionManager | undefined;
  private readonly lease = new Lease();
  private readonly browserLease = new Lease();
  private domainMode: DomainMode = "open";
  private run: RunController | undefined;
  private approvals: ApprovalManager | undefined;
  private gate: CommandGate | undefined;
  private unhookGate: (() => void) | undefined;
  private browser: BrowserSessionManager | undefined;
  private browserSessionId: string | undefined;
  private browserImageId: string | undefined;
  private runtimeRoot = "";

  constructor(private readonly deps: DaemonDeps) {
    for (const [surface, lease] of [["terminal", this.lease], ["browser", this.browserLease]] as const) {
      lease.on("change", (s: { owner: LeaseOwner; reason?: string }) =>
        this.deps.post({ type: "lease.state", surface, owner: s.owner, ...(s.reason ? { reason: s.reason } : {}) }),
      );
    }
  }

  private takeBoth(owner: LeaseOwner, reason: string): void {
    this.lease.take(owner, reason);
    this.browserLease.take(owner, reason);
  }

  async handle(raw: unknown): Promise<void> {
    const parsed = MainToAgentd.safeParse(raw);
    if (!parsed.success) {
      this.deps.post({ type: "agentd.error", message: `invalid message: ${parsed.error.issues[0]?.message ?? "unknown"}` });
      return;
    }
    const msg = parsed.data;
    if (msg.type !== "terminal.write") console.error(`[agentd] <- ${msg.type}`);
    switch (msg.type) {
      case "config.init": {
        const { reply, runtime } = handleConfigInit(msg, this.deps.openStore);
        if (runtime) {
          this.runtime = runtime;
          this.manager = this.deps.makeManager(msg.imageId, msg.runtimeRoot);
          this.manager.on("data", (data: Uint8Array) => this.deps.post({ type: "terminal.data", data }));
          this.manager.on("status", (s: SessionStatus) => this.deps.post({ type: "session.state", ...s }));
          this.approvals = new ApprovalManager(runtime.store);
          this.approvals.on("request", (r: ApprovalRequest) => this.deps.post({ type: "approval.request", ...r }));
          this.approvals.on("resolved", (r: { id: string; decision: ApprovalDecision }) => this.deps.post({ type: "approval.resolved", ...r }));
          this.gate = new CommandGate({
            lease: this.lease,
            approvals: this.approvals,
            store: runtime.store,
            currentRunId: () => (this.run && !TERMINAL.has(this.run.state) ? this.run.runId : undefined),
            networkMode: () => this.manager?.status.networkMode ?? "open",
          });
          this.gate.on("event", (e: GateEvent) => this.deps.post({ type: "gate.event", ...e }));
          this.browserImageId = msg.browserImageId;
          this.domainMode = msg.browserDomainMode ?? "open";
          this.runtimeRoot = msg.runtimeRoot;
          this.manager.on("status", (s: SessionStatus) => {
            if (s.state === "ready" && s.sessionId) this.ensureBrowserManager(s.sessionId, s.networkMode ?? "open");
            if (s.state !== "ready" || !this.manager?.worker || !this.gate) return;
            this.unhookGate?.();
            const gate = this.gate;
            this.unhookGate = this.manager.worker.onRequest("gate.check", (p) =>
              gate.check({ command: String(p.command ?? ""), cwd: String(p.cwd ?? ""), pid: Number(p.pid ?? 0) }),
            );
          });
        }
        this.deps.post(reply);
        return;
      }
      case "session.start":
        await this.requireManager().start(msg.workspacePath, msg.networkMode);
        return;
      case "session.stop":
        this.run?.stop();
        if (msg.destroy) {
          await this.browser?.destroy();
          this.browser = undefined;
          await this.requireManager().destroy();
        } else {
          await this.browser?.stop();
          this.requireManager().detach();
        }
        return;
      case "terminal.write":
        if (this.lease.state.owner === "human") this.requireManager().write(msg.data);
        return;
      case "terminal.resize":
        await this.requireManager().resize(msg.cols, msg.rows);
        return;
      case "run.start":
        await this.startRun(msg.goal);
        return;
      case "browser.start": {
        const st = this.manager?.status;
        if (!this.deps.makeBrowser) return this.deps.post({ type: "agentd.error", message: "browser support not configured" });
        if (!st || st.state !== "ready" || !st.sessionId) return this.deps.post({ type: "agentd.error", message: "open a workspace first; the browser belongs to the sandbox session" });
        this.ensureBrowserManager(st.sessionId, st.networkMode ?? "open");
        await this.browser!.start();
        return;
      }
      case "browser.stop":
        await this.browser?.stop();
        return;
      case "browser.navigate":
        if (!this.browser || this.browserLease.state.owner !== "human") return;
        try {
          await this.browser.navigate(msg.url);
        } catch (e) {
          this.deps.post({ type: "browser.state", ...this.browser.status, message: e instanceof Error ? e.message : String(e) });
        }
        return;
      case "browser.input":
        if (this.browserLease.state.owner === "human") this.browser?.input(msg.event);
        return;
      case "approval.decide":
        if (!this.approvals?.decide(msg.id, msg.decision)) this.deps.post({ type: "agentd.error", message: "approval not pending" });
        return;
      case "run.restore": {
        const run = this.runtime?.store.getRun(msg.runId);
        const workspacePath = this.manager?.status.workspacePath;
        if (!run?.snapshot_json || !workspacePath) {
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: "no snapshot for this run" });
          return;
        }
        if (this.run && !TERMINAL.has(this.run.state)) {
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: "stop the run first" });
          return;
        }
        try {
          await restoreSnapshot(workspacePath, JSON.parse(run.snapshot_json) as Snapshot);
          this.runtime!.store.appendEvent(msg.runId, "run.restored", {});
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: true });
        } catch (e) {
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: e instanceof Error ? e.message : String(e) });
        }
        return;
      }
      case "run.stop":
        this.run?.stop();
        return;
      case "run.resume":
        if (this.run?.state === "handoff") {
          this.takeBoth("agent", "resumed by human");
          this.run.resumeFromHandoff();
        }
        return;
      case "lease.take": {
        const leases = msg.surface === "terminal" ? [this.lease] : msg.surface === "browser" ? [this.browserLease] : [this.lease, this.browserLease];
        for (const l of leases) {
          if (msg.owner === "human") l.take("human", "taken by human");
          else if (this.run && this.run.state !== "handoff" && !TERMINAL.has(this.run.state)) l.take("agent", "given back by human");
        }
        return;
      }
    }
  }

  private ensureBrowserManager(sessionId: string, networkMode: NetworkMode): void {
    if (!this.deps.makeBrowser) return;
    if (this.browser && this.browserSessionId === sessionId) return;
    void this.browser?.stop();
    this.browserSessionId = sessionId;
    this.browser = this.deps.makeBrowser({ runtimeRoot: this.runtimeRoot, sessionId, networkMode, ...(this.browserImageId ? { browserImageId: this.browserImageId } : {}) });
    this.browser.on("status", (s: BrowserStatus) => this.deps.post({ type: "browser.state", ...s }));
    this.browser.on("frame", (f: { width: number; height: number; jpeg: Uint8Array }) => this.deps.post({ type: "browser.frame", width: f.width, height: f.height, data: f.jpeg }));
  }

  private async startRun(goal: string): Promise<void> {
    const manager = this.manager;
    const runtime = this.runtime;
    const status = manager?.status;
    if (!manager || !runtime || !status || status.state !== "ready" || !manager.worker || !status.workspacePath) {
      this.deps.post({ type: "agentd.error", message: "no ready sandbox session; open a workspace first" });
      return;
    }
    if (this.run && !TERMINAL.has(this.run.state)) {
      this.deps.post({ type: "agentd.error", message: "a run is already running; stop it first" });
      return;
    }
    const workspaceId = runtime.store.createWorkspace(status.workspacePath);
    const worker = manager.worker;
    const snapshot = await snapshotWorkspace(status.workspacePath);
    const browser = this.browser;
    const policies: Policy[] = [new LeasePolicy(this.lease, "terminal"), new NestedPromptPolicy(() => worker.observe({}))];
    const executors = [terminalExecutor(worker)];
    if (browser && this.approvals) {
      const approvals = this.approvals;
      policies.push(new LeasePolicy(this.browserLease, "browser"));
      policies.push(new BrowserActionPolicy({ lastObservation: () => browser.lastObservation, approvals, domainMode: () => this.domainMode }));
      executors.push(browserExecutor(browser));
    }
    const rc = new RunController(
      {
        store: runtime.store,
        adapter: this.deps.makeAdapter(runtime.model, runtime.apiKey),
        worker,
        tools: composeExecutors(...executors),
        policy: composePolicies(...policies),
        prices: runtime.prices,
      },
      { workspaceId, goal, networkMode: status.networkMode ?? "open", ...(snapshot ? { snapshot } : {}) },
    );
    this.run = rc;
    const postState = (state: RunState, extra: { endReason?: string; finalText?: string } = {}) =>
      this.deps.post({ type: "run.state", runId: rc.runId, state, ...extra, ...rc.stats, snapshot: snapshot !== null });
    rc.on("state", (state: RunState) => {
      if (state === "handoff" || TERMINAL.has(state)) this.takeBoth("human", state === "handoff" ? "agent asked for help" : `run ${state}`);
      if (!TERMINAL.has(state)) postState(state);
    });
    rc.on("commentary", (text: string) => this.deps.post({ type: "run.commentary", runId: rc.runId, text }));
    rc.on("tool", (t: { name: string; status: RunTool["status"]; callId: string; preview: string }) => this.deps.post({ type: "run.tool", runId: rc.runId, ...t, ...rc.stats }));
    rc.on("handoff", (h: { reason: string }) => this.deps.post({ type: "run.handoff", runId: rc.runId, reason: h.reason }));
    this.takeBoth("agent", "run started");
    void rc.start().then((out) =>
      postState(out.state, { ...(out.endReason ? { endReason: out.endReason } : {}), ...(out.finalText !== undefined ? { finalText: out.finalText } : {}) }),
    );
  }

  private requireManager(): TerminalSessionManager {
    if (!this.manager) throw new Error("agentd not initialised (config.init missing)");
    return this.manager;
  }
}
