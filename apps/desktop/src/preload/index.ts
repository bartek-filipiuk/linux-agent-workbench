import type { ModelCatalog, ModelSelection, RunLimits, BudgetAction } from "@law/protocol";
import { contextBridge, ipcRenderer } from "electron";

const on = <T,>(channel: string) => (cb: (payload: T) => void) => {
  const handler = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

const api = {
  checkSetup: () => ipcRenderer.invoke("setup:check"),
  loginCodex: () => ipcRenderer.invoke("setup:login"),
  cancelLogin: () => ipcRenderer.invoke("setup:cancel"),
  retrySetup: () => ipcRenderer.invoke("setup:retry"),
  onAccount: on<unknown>("setup:account"),
  getModels: (refresh?: boolean): Promise<ModelCatalog> => ipcRenderer.invoke("models:list", refresh),
  getRun: () => ipcRenderer.invoke("run:get"),
  getHistory: () => ipcRenderer.invoke("run:history"),
  getRunDetail: (id: string) => ipcRenderer.invoke("run:detail", id),
  getChanges: () => ipcRenderer.invoke("workspace:changes"),
  showOutput: (relative: string) => ipcRenderer.invoke("workspace:output", relative),
  getStatus: () => ipcRenderer.invoke("agentd:status"),
  getSession: () => ipcRenderer.invoke("session:get"),
  selectWorkspace: () => ipcRenderer.invoke("workspace:select"),
  reopenLast: () => ipcRenderer.invoke("workspace:reopen"),
  applyNetwork: () => ipcRenderer.invoke("network:apply"),
  getNetwork: () => ipcRenderer.invoke("network:get"),
  setNetwork: (mode: "open" | "none") => ipcRenderer.invoke("network:set", mode),
  destroySandbox: () => ipcRenderer.invoke("sandbox:destroy"),
  terminalWrite: (data: string) => ipcRenderer.send("terminal:write", data),
  terminalResize: (cols: number, rows: number) => ipcRenderer.send("terminal:resize", cols, rows),
  terminalRefresh: () => ipcRenderer.send("terminal:refresh"),
  getLease: () => ipcRenderer.invoke("lease:get"),
  startRun: (goal: string, opts?: { profile?: "quick" | "research" | "project"; maxTurns?: number; modelSelection?: ModelSelection; limits?: RunLimits }) => ipcRenderer.invoke("run:start", goal, opts),
  stopRun: () => ipcRenderer.invoke("run:stop"),
  continueBudget: (runId: string, action: BudgetAction) => ipcRenderer.invoke("run:budget", runId, action),
  resumeRun: () => ipcRenderer.invoke("run:resume"),
  takeControl: (surface?: "terminal" | "browser") => ipcRenderer.invoke("lease:take", "human", surface),
  releaseControl: (surface?: "terminal" | "browser") => ipcRenderer.invoke("lease:take", "agent", surface),
  decideApproval: (id: string, decision: "once" | "session" | "deny") => ipcRenderer.invoke("approval:decide", id, decision),
  restoreRun: (runId: string) => ipcRenderer.invoke("run:restore", runId),
  browserControl: (command: unknown) => ipcRenderer.invoke("browser:control", command),
  getBrowser: () => ipcRenderer.invoke("browser:get"),
  startBrowser: () => ipcRenderer.invoke("browser:start"),
  stopBrowser: () => ipcRenderer.invoke("browser:stop"),
  navigate: (url: string) => ipcRenderer.invoke("browser:navigate", url),
  browserInput: (event: unknown) => ipcRenderer.send("browser:input", event),
  browserFrames: (on: boolean) => ipcRenderer.send("browser:frames", on),
  writeDiagnostics: (): Promise<string> => ipcRenderer.invoke("diagnostics:write"),
  getDiagnostics: () => ipcRenderer.invoke("diagnostics:get"),
  cancelDiagnostics: () => ipcRenderer.invoke("diagnostics:cancel"),
  onDiagnostics: on<unknown>("diagnostics:state"),
  browserFrameAck: (id: number) => ipcRenderer.send("browser:frameAck", id),
  getPolicy: () => ipcRenderer.invoke("policy:get"),
  setPolicy: (patch: { nestedAutonomy?: boolean; domainMode?: "open" | "ask" }) => ipcRenderer.invoke("policy:set", patch),
  onBrowserState: on<unknown>("browser:state"),
  onBrowserFrame: on<{ id: number; generation: number; width: number; height: number; data: Uint8Array }>("browser:frame"),
  onRun: on<unknown>("run:event"),
  onLease: on<unknown>("lease:state"),
  onEvent: on<unknown>("agentd:event"),
  onSession: on<unknown>("session:state"),
  onTerminalData: (cb: (data: Uint8Array, consumed: () => void) => void) => {
    const listener = (_e: unknown, chunk: { id: number; data: Uint8Array }) => cb(chunk.data, () => ipcRenderer.send("terminal:ack", chunk.id));
    ipcRenderer.on("terminal:data", listener);
    ipcRenderer.send("terminal:subscribe", true);
    return () => { ipcRenderer.removeListener("terminal:data", listener); ipcRenderer.send("terminal:subscribe", false); };
  },
};

contextBridge.exposeInMainWorld("workbench", api);
export type WorkbenchApi = typeof api;
