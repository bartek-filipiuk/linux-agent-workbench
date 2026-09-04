import { z } from "zod";
import { NetworkMode } from "@law/protocol";
import type { Store } from "./storage/store.js";
import type { SessionStatus, TerminalSessionManager } from "./session/terminal-session-manager.js";

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
  imageId: z.string().min(1),
  runtimeRoot: z.string().min(1),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

export const SessionStart = z.object({ type: z.literal("session.start"), workspacePath: z.string().min(1), networkMode: NetworkMode });
export const SessionStop = z.object({ type: z.literal("session.stop"), destroy: z.boolean() });
export const TerminalWrite = z.object({ type: z.literal("terminal.write"), data: z.instanceof(Uint8Array) });
export const TerminalResizeMsg = z.object({ type: z.literal("terminal.resize"), cols: z.number().int().min(20).max(500), rows: z.number().int().min(5).max(200) });

export const MainToAgentd = z.discriminatedUnion("type", [ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg]);
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
export type AgentdToMain = AgentdReady | AgentdError | SessionStateMsg | TerminalData;

export type AgentdRuntime = { store: Store; model: string; apiKey: string };

let runtime: AgentdRuntime | null = null;
export const getRuntime = (): AgentdRuntime | null => runtime;

export function handleConfigInit(msg: unknown, openStore: (dbPath: string) => Store): AgentdReady | AgentdError {
  const parsed = ConfigInit.safeParse(msg);
  if (!parsed.success) return { type: "agentd.error", message: "invalid config.init" };
  const { apiKey, model, dbPath } = parsed.data;
  try {
    const store = openStore(dbPath);
    const interruptedRuns = store.markInterruptedRuns("agentd_restart");
    runtime = { store, model, apiKey };
    return { type: "agentd.ready", schemaVersion: store.schemaVersion, dbPath, model, interruptedRuns };
  } catch (e) {
    return { type: "agentd.error", message: e instanceof Error ? e.message : String(e) };
  }
}

export type DaemonDeps = {
  openStore: (dbPath: string) => Store;
  makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager;
  post: (msg: AgentdToMain) => void;
};

export class Daemon {
  private manager: TerminalSessionManager | undefined;

  constructor(private readonly deps: DaemonDeps) {}

  async handle(raw: unknown): Promise<void> {
    const parsed = MainToAgentd.safeParse(raw);
    if (!parsed.success) {
      this.deps.post({ type: "agentd.error", message: `invalid message: ${parsed.error.issues[0]?.message ?? "unknown"}` });
      return;
    }
    const msg = parsed.data;
    switch (msg.type) {
      case "config.init": {
        const reply = handleConfigInit(msg, this.deps.openStore);
        if (reply.type === "agentd.ready") {
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
        if (msg.destroy) await this.requireManager().destroy();
        else this.requireManager().detach();
        return;
      case "terminal.write":
        this.requireManager().write(msg.data);
        return;
      case "terminal.resize":
        await this.requireManager().resize(msg.cols, msg.rows);
        return;
    }
  }

  private requireManager(): TerminalSessionManager {
    if (!this.manager) throw new Error("agentd not initialised (config.init missing)");
    return this.manager;
  }
}
