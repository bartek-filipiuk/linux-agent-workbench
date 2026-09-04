// Entry point for Electron utilityProcess. Receives a MessagePort from main,
// then config.init on that port. The API key never leaves this process.
import { Store } from "./storage/store.js";
import { handleConfigInit } from "./ipc.js";

type Port = {
  on(ev: "message", cb: (e: { data: unknown }) => void): void;
  postMessage(m: unknown): void;
  start(): void;
};
type ParentPort = {
  once(event: "message", cb: (e: { data: unknown; ports: Port[] }) => void): void;
};

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
  port.on("message", ({ data }) => {
    if (typeof data === "object" && data !== null && (data as { type?: string }).type === "config.init") {
      port.postMessage(handleConfigInit(data, (p) => new Store(p)));
    }
  });
  port.start();
});
