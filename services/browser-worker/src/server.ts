import fs from "node:fs";
import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import { BrowserInputEvent, BrowserNavigate, ProtocolError, encodeBrowserFrame, type Envelope } from "@law/protocol";
import type { BrowserSession } from "./browser-session.js";

export class BrowserWorkerServer {
  private readonly server = net.createServer();
  private current: FramedConnection | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly socketPath: string,
    private readonly session: BrowserSession,
  ) {
    this.server.on("connection", (s) => this.accept(s));
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

  private accept(socket: net.Socket): void {
    this.unsubscribe?.();
    this.current?.close();
    const conn = new FramedConnection(socket);
    this.current = conn;
    this.unsubscribe = this.session.onFrame((f) => conn.sendRaw(3, encodeBrowserFrame(f.width, f.height, f.jpeg)));
    conn.on("message", (env: Envelope) => void this.handle(conn, env));
  }

  private async handle(conn: FramedConnection, env: Envelope): Promise<void> {
    if (env.type === "browser.input") {
      const parsed = BrowserInputEvent.safeParse(env.payload);
      if (parsed.success) await this.session.input(parsed.data).catch(() => {});
      return;
    }
    const id = env.id;
    if (!id) return;
    try {
      switch (env.type) {
        case "browser.navigate":
          return conn.reply(id, { ok: true, payload: await this.session.navigate(BrowserNavigate.parse(env.payload).url) });
        case "browser.info":
          return conn.reply(id, { ok: true, payload: await this.session.info() });
        default:
          return conn.reply(id, { ok: false, error: { code: "INVALID_INPUT", message: `unknown request ${env.type}` } });
      }
    } catch (e) {
      const err = ProtocolError.is(e) ? e.toJSON() : { code: "INVALID_INPUT" as const, message: e instanceof Error ? e.message : String(e) };
      conn.reply(id, { ok: false, error: err });
    }
  }
}
