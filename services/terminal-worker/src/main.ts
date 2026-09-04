// Runs inside the container. Serves /run/law/worker.sock; the tmux server outlives this process.
import path from "node:path";
import { TerminalSession } from "./terminal-session.js";
import { WorkerServer } from "./server.js";

const socketDir = process.env.LAW_SOCKET_DIR ?? "/run/law";
const tmuxSocket = process.env.LAW_TMUX_SOCKET ?? "/tmp/law-tmux.sock";
const cwd = process.env.LAW_WORKDIR ?? "/workspace";

const session = new TerminalSession({ tmuxSocket, cwd, cols: 120, rows: 36 });
const server = new WorkerServer(path.join(socketDir, "worker.sock"), session);

await session.start();
await server.listen();
console.log(`terminal-worker listening on ${path.join(socketDir, "worker.sock")}`);

const shutdown = () => {
  void server.close().finally(() => {
    session.dispose();
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
