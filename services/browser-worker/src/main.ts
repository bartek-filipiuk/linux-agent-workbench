// Browser worker entry. B1: runs on the host, spawned by agentd. B2 moves it into its own container.
import fs from "node:fs";
import { BrowserSession } from "./browser-session.js";
import { BrowserWorkerServer } from "./server.js";

const socketPath = process.env.LAW_BROWSER_SOCKET;
const profileDir = process.env.LAW_BROWSER_PROFILE;
if (!socketPath || !profileDir) {
  console.error("browser-worker: LAW_BROWSER_SOCKET and LAW_BROWSER_PROFILE are required");
  process.exit(2);
}
fs.mkdirSync(profileDir, { recursive: true, mode: 0o700 });

const session = new BrowserSession({ profileDir, ...(process.env.LAW_BROWSER_DOWNLOADS ? { downloadsDir: process.env.LAW_BROWSER_DOWNLOADS } : {}) });
const server = new BrowserWorkerServer(socketPath, session);
await session.start();
await server.listen();
console.log(`browser-worker listening on ${socketPath}`);

const shutdown = () => {
  void server.close().then(() => session.close()).finally(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
