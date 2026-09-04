// Entry point for Electron utilityProcess. Receives a MessagePort from main, then routes messages through Daemon.
import { Store } from "./storage/store.js";
import { Daemon } from "./ipc.js";
import { PodmanRuntime } from "./runtime/podman.js";
import { TerminalSessionManager } from "./session/terminal-session-manager.js";

type Port = {
  on(ev: "message", cb: (e: { data: unknown }) => void): void;
  postMessage(m: unknown): void;
  start(): void;
};
type ParentPort = { once(event: "message", cb: (e: { data: unknown; ports: Port[] }) => void): void };

const parentPort = (process as unknown as { parentPort?: ParentPort }).parentPort;
if (!parentPort) {
  console.error("agentd: must run inside Electron utilityProcess");
  process.exit(2);
}

parentPort.once("message", (e) => {
  const port = e.ports[0];
  if (!port) {
    console.error("agentd: no MessagePort received");
    process.exit(2);
  }
  const daemon = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, runtimeRoot) => new TerminalSessionManager({ runtime: new PodmanRuntime(), runtimeRoot, imageId }),
    post: (m) => port.postMessage(m),
  });
  port.on("message", ({ data }) => {
    daemon.handle(data).catch((err) => port.postMessage({ type: "agentd.error", message: err instanceof Error ? err.message : String(err) }));
  });
  port.start();
});
