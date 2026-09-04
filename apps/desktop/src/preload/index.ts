import { contextBridge, ipcRenderer } from "electron";

const on = <T,>(channel: string) => (cb: (payload: T) => void) => {
  const handler = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

const api = {
  getStatus: () => ipcRenderer.invoke("agentd:status"),
  getSession: () => ipcRenderer.invoke("session:get"),
  selectWorkspace: () => ipcRenderer.invoke("workspace:select"),
  reopenLast: () => ipcRenderer.invoke("workspace:reopen"),
  getNetwork: () => ipcRenderer.invoke("network:get"),
  setNetwork: (mode: "open" | "none") => ipcRenderer.invoke("network:set", mode),
  destroySandbox: () => ipcRenderer.invoke("sandbox:destroy"),
  terminalWrite: (data: string) => ipcRenderer.send("terminal:write", data),
  terminalResize: (cols: number, rows: number) => ipcRenderer.send("terminal:resize", cols, rows),
  getLease: () => ipcRenderer.invoke("lease:get"),
  startRun: (goal: string) => ipcRenderer.invoke("run:start", goal),
  stopRun: () => ipcRenderer.invoke("run:stop"),
  resumeRun: () => ipcRenderer.invoke("run:resume"),
  takeControl: () => ipcRenderer.invoke("lease:take", "human"),
  releaseControl: () => ipcRenderer.invoke("lease:take", "agent"),
  decideApproval: (id: string, decision: "once" | "session" | "deny") => ipcRenderer.invoke("approval:decide", id, decision),
  restoreRun: (runId: string) => ipcRenderer.invoke("run:restore", runId),
  getBrowser: () => ipcRenderer.invoke("browser:get"),
  startBrowser: () => ipcRenderer.invoke("browser:start"),
  stopBrowser: () => ipcRenderer.invoke("browser:stop"),
  navigate: (url: string) => ipcRenderer.invoke("browser:navigate", url),
  browserInput: (event: unknown) => ipcRenderer.send("browser:input", event),
  onBrowserState: on<unknown>("browser:state"),
  onBrowserFrame: on<{ width: number; height: number; data: Uint8Array }>("browser:frame"),
  onRun: on<unknown>("run:event"),
  onLease: on<unknown>("lease:state"),
  onEvent: on<unknown>("agentd:event"),
  onSession: on<unknown>("session:state"),
  onTerminalData: on<Uint8Array>("terminal:data"),
};

contextBridge.exposeInMainWorld("workbench", api);
export type WorkbenchApi = typeof api;
