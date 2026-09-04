// Runs inside the container. Serves /run/law/worker.sock; the tmux server outlives this process.
import path from "node:path";
import { startEgressForwarder } from "@law/protocol/node";
import { TerminalSession } from "./terminal-session.js";
import { WorkerServer } from "./server.js";
import { GateServer } from "./gate-server.js";

const socketDir = process.env.LAW_SOCKET_DIR ?? "/run/law";
const tmuxSocket = process.env.LAW_TMUX_SOCKET ?? "/tmp/law-tmux.sock";
const cwd = process.env.LAW_WORKDIR ?? "/workspace";

// The container has no network of its own; tools reach the world through this loopback proxy port (B6 H1).
if (process.env.LAW_EGRESS_SOCKET) {
  await startEgressForwarder({ socketPath: process.env.LAW_EGRESS_SOCKET, port: Number(process.env.LAW_EGRESS_PORT ?? 3128) });
}

const session = new TerminalSession({ tmuxSocket, cwd, cols: 120, rows: 36 });
const server = new WorkerServer(path.join(socketDir, "worker.sock"), session);

// The gate socket must exist before the shell starts: bashrc installs the DEBUG trap only when it sees it.
const gate = new GateServer(path.join(socketDir, "gate.sock"), (req) => server.forwardGate(req));
await gate.listen();
console.log(`terminal-worker gate on ${path.join(socketDir, "gate.sock")}`);
await session.start();
await server.listen();
console.log(`terminal-worker listening on ${path.join(socketDir, "worker.sock")}`);

const shutdown = () => {
  void Promise.all([server.close(), gate.close()]).finally(() => {
    session.dispose();
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
