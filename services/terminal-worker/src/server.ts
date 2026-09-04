import fs from "node:fs";
import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import { ProtocolError, TerminalInput, TerminalObserveInput, TerminalResize, type Envelope } from "@law/protocol";
import type { TerminalSession } from "./terminal-session.js";

export class WorkerServer {
  private readonly server = net.createServer();
  private current: FramedConnection | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly socketPath: string,
    private readonly session: TerminalSession,
  ) {
    this.server.on("connection", (s) => this.accept(s));
  }

  get clients(): number {
    return this.current && !this.current.closed ? 1 : 0;
  }

  listen(): Promise<void> {
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.socketPath, () => {
        fs.chmodSync(this.socketPath, 0o600);
        resolve();
      });
    });
  }

  close(): Promise<void> {
    this.unsubscribe?.();
    this.current?.close();
    return new Promise((r) => this.server.close(() => r()));
  }

  async forwardGate(req: { command: string; cwd: string; pid: number }): Promise<{ decision: "allow" | "deny"; reason?: string }> {
    const conn = this.current;
    if (!conn || conn.closed) return { decision: "deny", reason: "no policy connection" };
    try {
      const r = await conn.request("gate.check", req, { timeoutMs: 180_000 });
      return r.decision === "allow" ? { decision: "allow" } : { decision: "deny", reason: typeof r.reason === "string" ? r.reason : "denied by policy" };
    } catch (e) {
      return { decision: "deny", reason: e instanceof Error ? e.message : String(e) };
    }
  }

  private accept(socket: net.Socket): void {
    console.log(`terminal-worker: client connected${this.clients ? " (replacing previous client)" : ""}`);
    this.unsubscribe?.();
    this.current?.close();
    const conn = new FramedConnection(socket);
    this.current = conn;
    this.unsubscribe = this.session.onData((bytes) => conn.sendRaw(1, bytes));
    conn.on("keys", (bytes: Uint8Array) => this.session.writeRaw(bytes));
    conn.on("message", (env: Envelope) => void this.handle(conn, env));
  }

  private async handle(conn: FramedConnection, env: Envelope): Promise<void> {
    const id = env.id;
    if (!id) return; // notifications (worker.cancel) need no reply in M2
    try {
      switch (env.type) {
        case "terminal.observe":
          return conn.reply(id, { ok: true, payload: await this.session.observe(TerminalObserveInput.parse(env.payload)) });
        case "terminal.input":
          return conn.reply(id, { ok: true, payload: await this.session.input(TerminalInput.parse(env.payload)) });
        case "terminal.interrupt":
          this.session.interrupt();
          return conn.reply(id, { ok: true });
        case "terminal.resize":
          this.session.resize(TerminalResize.parse(env.payload));
          return conn.reply(id, { ok: true });
        case "worker.health":
          return conn.reply(id, { ok: true, payload: this.session.health() });
        default:
          return conn.reply(id, { ok: false, error: { code: "INVALID_INPUT", message: `unknown request ${env.type}` } });
      }
    } catch (e) {
      const err = ProtocolError.is(e) ? e.toJSON() : { code: "INVALID_INPUT" as const, message: e instanceof Error ? e.message : String(e) };
      conn.reply(id, { ok: false, error: err });
    }
  }
}
