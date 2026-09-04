import { z } from "zod";
import { NetworkMode, type RunState } from "@law/protocol";
import type { Store } from "./storage/store.js";
import type { SessionStatus, TerminalSessionManager } from "./session/terminal-session-manager.js";
import type { ModelAdapter } from "./provider/types.js";
import { RunController } from "./orchestrator/run-controller.js";
import { Lease, LeasePolicy, type LeaseOwner } from "./policy/lease.js";
import type { PriceTable } from "./orchestrator/budgets.js";

const Prices = z.object({ inputUsdPerMTok: z.number().nonnegative(), outputUsdPerMTok: z.number().nonnegative() });

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
  imageId: z.string().min(1),
  runtimeRoot: z.string().min(1),
  prices: Prices.optional(),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

export const SessionStart = z.object({ type: z.literal("session.start"), workspacePath: z.string().min(1), networkMode: NetworkMode });
export const SessionStop = z.object({ type: z.literal("session.stop"), destroy: z.boolean() });
export const TerminalWrite = z.object({ type: z.literal("terminal.write"), data: z.instanceof(Uint8Array) });
export const TerminalResizeMsg = z.object({ type: z.literal("terminal.resize"), cols: z.number().int().min(20).max(500), rows: z.number().int().min(5).max(200) });
export const RunStart = z.object({ type: z.literal("run.start"), goal: z.string().min(1).max(4000) });
export const RunStop = z.object({ type: z.literal("run.stop") });
export const RunResume = z.object({ type: z.literal("run.resume") });
export const LeaseTake = z.object({ type: z.literal("lease.take"), owner: z.enum(["agent", "human"]) });

export const MainToAgentd = z.discriminatedUnion("type", [ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg, RunStart, RunStop, RunResume, LeaseTake]);
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
export type RunStateMsg = { type: "run.state"; runId: string; state: RunState; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null };
export type RunCommentary = { type: "run.commentary"; runId: string; text: string };
export type RunTool = { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string; turns: number; toolCalls: number; costUsd: number | null };
export type RunHandoff = { type: "run.handoff"; runId: string; reason: string };
export type LeaseStateMsg = { type: "lease.state"; owner: LeaseOwner; reason?: string };
export type AgentdToMain = AgentdReady | AgentdError | SessionStateMsg | TerminalData | RunStateMsg | RunCommentary | RunTool | RunHandoff | LeaseStateMsg;

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

export type DaemonDeps = {
  openStore: (dbPath: string) => Store;
  makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager;
  makeAdapter: (model: string, apiKey: string) => ModelAdapter;
  post: (msg: AgentdToMain) => void;
};

const TERMINAL: ReadonlySet<RunState> = new Set(["completed", "stopped", "failed", "budget_exceeded", "interrupted"]);

export class Daemon {
  private runtime: AgentdRuntime | undefined;
  private manager: TerminalSessionManager | undefined;
  private readonly lease = new Lease();
  private run: RunController | undefined;

  constructor(private readonly deps: DaemonDeps) {
    this.lease.on("change", (s: { owner: LeaseOwner; reason?: string }) =>
      this.deps.post({ type: "lease.state", owner: s.owner, ...(s.reason ? { reason: s.reason } : {}) }),
    );
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
        }
        this.deps.post(reply);
        return;
      }
      case "session.start":
        await this.requireManager().start(msg.workspacePath, msg.networkMode);
        return;
      case "session.stop":
        this.run?.stop();
        if (msg.destroy) await this.requireManager().destroy();
        else this.requireManager().detach();
        return;
      case "terminal.write":
        if (this.lease.state.owner === "human") this.requireManager().write(msg.data);
        return;
      case "terminal.resize":
        await this.requireManager().resize(msg.cols, msg.rows);
        return;
      case "run.start":
        this.startRun(msg.goal);
        return;
      case "run.stop":
        this.run?.stop();
        return;
      case "run.resume":
        if (this.run?.state === "handoff") {
          this.lease.take("agent", "resumed by human");
          this.run.resumeFromHandoff();
        }
        return;
      case "lease.take":
        if (msg.owner === "human") this.lease.take("human", "taken by human");
        else if (this.run && this.run.state !== "handoff" && !TERMINAL.has(this.run.state)) this.lease.take("agent", "given back by human");
        return;
    }
  }

  private startRun(goal: string): void {
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
    const rc = new RunController(
      {
        store: runtime.store,
        adapter: this.deps.makeAdapter(runtime.model, runtime.apiKey),
        worker: manager.worker,
        policy: new LeasePolicy(this.lease),
        prices: runtime.prices,
      },
      { workspaceId, goal, networkMode: status.networkMode ?? "open" },
    );
    this.run = rc;
    const postState = (state: RunState, extra: { endReason?: string; finalText?: string } = {}) =>
      this.deps.post({ type: "run.state", runId: rc.runId, state, ...extra, ...rc.stats });
    rc.on("state", (state: RunState) => {
      if (state === "handoff" || TERMINAL.has(state)) this.lease.take("human", state === "handoff" ? "agent asked for help" : `run ${state}`);
      if (!TERMINAL.has(state)) postState(state);
    });
    rc.on("commentary", (text: string) => this.deps.post({ type: "run.commentary", runId: rc.runId, text }));
    rc.on("tool", (t: { name: string; status: RunTool["status"]; callId: string }) => this.deps.post({ type: "run.tool", runId: rc.runId, ...t, ...rc.stats }));
    rc.on("handoff", (h: { reason: string }) => this.deps.post({ type: "run.handoff", runId: rc.runId, reason: h.reason }));
    this.lease.take("agent", "run started");
    void rc.start().then((out) =>
      postState(out.state, { ...(out.endReason ? { endReason: out.endReason } : {}), ...(out.finalText !== undefined ? { finalText: out.finalText } : {}) }),
    );
  }

  private requireManager(): TerminalSessionManager {
    if (!this.manager) throw new Error("agentd not initialised (config.init missing)");
    return this.manager;
  }
}
