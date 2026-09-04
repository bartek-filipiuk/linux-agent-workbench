import { contextBridge, ipcRenderer } from "electron";

const api = {
  getStatus: () => ipcRenderer.invoke("agentd:status"),
  onEvent: (cb: (e: unknown) => void) => {
    const handler = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("agentd:event", handler);
    return () => ipcRenderer.removeListener("agentd:event", handler);
  },
};

contextBridge.exposeInMainWorld("workbench", api);
export type WorkbenchApi = typeof api;
