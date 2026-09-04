import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import { KEY_BYTES, TerminalInput, TerminalObserveInput, type Envelope, type TerminalObservation } from "@law/protocol";

export class FakeWorker {
  revision = 0;
  screen = "$ ";
  hangInputs = false;
  received: Envelope[] = [];
  private conns = new Set<FramedConnection>();

  private constructor(private readonly server: net.Server) {}

  static listen(socketPath: string): Promise<FakeWorker> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      const fw = new FakeWorker(server);
      server.on("connection", (s) => fw.accept(s));
      server.once("error", reject);
      server.listen(socketPath, () => resolve(fw));
    });
  }

  private accept(socket: net.Socket) {
    const conn = new FramedConnection(socket);
    this.conns.add(conn);
    conn.on("close", () => this.conns.delete(conn));
    conn.on("message", (env: Envelope) => this.handle(conn, env));
    conn.on("keys", (bytes: Uint8Array) => {
      this.screen += new TextDecoder().decode(bytes);
      this.revision++;
    });
  }

  private observation(): TerminalObservation {
    return {
      revision: this.revision,
      screen: this.screen,
      scrollbackTail: "",
      cursor: { row: 0, col: this.screen.length },
      size: { rows: 24, cols: 80 },
      idleMs: 10,
      exited: false,
    };
  }

  private handle(conn: FramedConnection, env: Envelope) {
    this.received.push(env);
    const id = env.id;
    switch (env.type) {
      case "terminal.observe": {
        TerminalObserveInput.parse(env.payload);
        return conn.reply(id!, { ok: true, payload: this.observation() });
      }
      case "terminal.input": {
        if (this.hangInputs) return; // never reply; used to test cancellation
        const parsed = TerminalInput.safeParse(env.payload);
        if (!parsed.success) return conn.reply(id!, { ok: false, error: { code: "INVALID_INPUT", message: parsed.error.message } });
        const inp = parsed.data;
        if (inp.kind === "text" && inp.expectedRevision !== undefined && inp.expectedRevision !== this.revision) {
          return conn.reply(id!, { ok: false, error: { code: "STALE_REVISION", message: `expected ${inp.expectedRevision}, at ${this.revision}` } });
        }
        if (inp.kind === "key") this.screen += inp.key === "ENTER" ? "\n$ " : KEY_BYTES[inp.key];
        else this.screen += inp.text;
        this.revision++;
        return conn.reply(id!, { ok: true, payload: { revision: this.revision } });
      }
      case "terminal.interrupt":
        this.screen += "^C\n$ ";
        this.revision++;
        return conn.reply(id!, { ok: true });
      case "terminal.resize":
        return conn.reply(id!, { ok: true });
      case "worker.health":
        return conn.reply(id!, { ok: true, payload: { uptimeMs: 1, ptyAlive: true, tmuxAlive: true, bufferBytes: 0, droppedBytes: 0 } });
      case "worker.cancel":
        return; // notification
      default:
        if (id) conn.reply(id, { ok: false, error: { code: "INVALID_INPUT", message: `unknown type ${env.type}` } });
    }
  }

  emitPty(text: string) {
    const bytes = new TextEncoder().encode(text);
    for (const c of this.conns) c.sendRaw(1, bytes);
  }

  close(): Promise<void> {
    for (const c of this.conns) c.close();
    return new Promise((r) => this.server.close(() => r()));
  }
}
