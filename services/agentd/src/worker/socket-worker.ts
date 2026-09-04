import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import {
  ProtocolError,
  TerminalInputResult,
  TerminalObservation,
  WorkerHealth,
  type TerminalInput,
  type TerminalObserveInput,
  type TerminalResize,
} from "@law/protocol";
import type { TerminalWorker } from "./types.js";

export class SocketTerminalWorker implements TerminalWorker {
  private constructor(
    private readonly conn: FramedConnection,
    private readonly requestTimeoutMs: number,
  ) {}

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
