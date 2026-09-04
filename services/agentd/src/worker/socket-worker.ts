import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import {
  ProtocolError,
  TerminalInputResult,
  TerminalObservation,
  TerminalWaitResult,
  WorkerHealth,
  type TerminalInput,
  type TerminalObserveInput,
  type TerminalResize,
  type TerminalWaitInput,
  type Envelope,
} from "@law/protocol";
import type { TerminalWorker } from "./types.js";

export class SocketTerminalWorker implements TerminalWorker {
  private readonly handlers = new Map<string, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>>();

  private constructor(
    private readonly conn: FramedConnection,
    private readonly requestTimeoutMs: number,
  ) {
    this.conn.on("message", (env: Envelope) => void this.dispatchRequest(env));
  }

  onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void {
    this.handlers.set(type, handler);
    return () => void this.handlers.delete(type);
  }

  private async dispatchRequest(env: Envelope): Promise<void> {
    if (!env.id) return;
    const h = this.handlers.get(env.type);
    if (!h) return this.conn.reply(env.id, { ok: false, error: { code: "INVALID_INPUT", message: `no handler for ${env.type}` } });
    try {
      this.conn.reply(env.id, { ok: true, payload: await h(env.payload) });
    } catch (e) {
      this.conn.reply(env.id, { ok: false, error: { code: "INVALID_INPUT", message: e instanceof Error ? e.message : String(e) } });
    }
  }

  static connect(socketPath: string, opts: { requestTimeoutMs?: number } = {}): Promise<SocketTerminalWorker> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(socketPath);
      const onError = (e: Error) => reject(new ProtocolError("WORKER_UNAVAILABLE", `cannot connect to ${socketPath}: ${e.message}`));
      socket.once("error", onError);
      socket.once("connect", () => {
        socket.off("error", onError);
        resolve(new SocketTerminalWorker(new FramedConnection(socket), opts.requestTimeoutMs ?? 30_000));
      });
    });
  }

  private req(type: string, payload: Record<string, unknown>, signal?: AbortSignal) {
    return this.conn.request(type, payload, { timeoutMs: this.requestTimeoutMs, ...(signal ? { signal } : {}) });
  }

  async observe(input: TerminalObserveInput, signal?: AbortSignal) {
    return TerminalObservation.parse(await this.req("terminal.observe", input, signal));
  }

  async input(input: TerminalInput, signal?: AbortSignal) {
    return TerminalInputResult.parse(await this.req("terminal.input", input, signal));
  }

  async wait(input: TerminalWaitInput, signal?: AbortSignal) {
    // The worker may legitimately hold this request for up to timeoutMs; give the socket the same slack.
    const timeoutMs = (input.timeoutMs ?? 60_000) + 5_000;
    return TerminalWaitResult.parse(await this.conn.request("terminal.wait", input, { timeoutMs, ...(signal ? { signal } : {}) }));
  }

  async interrupt(signal?: AbortSignal) {
    await this.req("terminal.interrupt", {}, signal);
  }

  async resize(size: TerminalResize) {
    await this.req("terminal.resize", size);
  }

  async health() {
    return WorkerHealth.parse(await this.req("worker.health", {}));
  }

  cancel() {
    this.conn.notify("worker.cancel");
  }

  writeRaw(bytes: Uint8Array) {
    this.conn.sendRaw(2, bytes);
  }

  onPtyData(cb: (bytes: Uint8Array) => void) {
    this.conn.on("pty", cb);
    return () => void this.conn.off("pty", cb);
  }

  onClose(cb: () => void) {
    this.conn.on("close", cb);
    return () => void this.conn.off("close", cb);
  }

  close() {
    this.conn.close();
  }
}
