import { z } from "zod";
import type { Store } from "./storage/store.js";

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

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

export type AgentdToMain = AgentdReady | AgentdError;

export type AgentdRuntime = { store: Store; model: string; apiKey: string };

let runtime: AgentdRuntime | null = null;
export const getRuntime = (): AgentdRuntime | null => runtime;

export function handleConfigInit(msg: unknown, openStore: (dbPath: string) => Store): AgentdToMain {
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
