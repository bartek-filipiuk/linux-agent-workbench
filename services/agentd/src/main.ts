// Entry point for Electron utilityProcess. Receives a MessagePort from main, then routes messages through Daemon.
import { Store } from "./storage/store.js";
import { Daemon } from "./ipc.js";
import { PodmanRuntime } from "./runtime/podman.js";
import { TerminalSessionManager } from "./session/terminal-session-manager.js";
import { OpenAIResponsesAdapter } from "./provider/openai.js";

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

// If Electron main dies without cleaning up (SIGKILL, crash), this utility process would linger and keep the
// worker socket busy. Reparenting to pid 1 is the signal to leave.
const parentPid = process.ppid;
setInterval(() => {
  if (process.ppid !== parentPid) process.exit(0);
}, 2000).unref();

parentPort.once("message", (e) => {
  const port = e.ports[0];
  if (!port) {
    console.error("agentd: no MessagePort received");
    process.exit(2);
  }
  const daemon = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, runtimeRoot) => new TerminalSessionManager({ runtime: new PodmanRuntime(), runtimeRoot, imageId }),
    makeAdapter: (model, apiKey) => new OpenAIResponsesAdapter({ model, apiKey }),
    post: (m) => port.postMessage(m),
  });
  port.on("message", ({ data }) => {
    daemon.handle(data).catch((err) => port.postMessage({ type: "agentd.error", message: err instanceof Error ? err.message : String(err) }));
  });
  port.start();
});
