import { EventEmitter } from "node:events";
import type net from "node:net";
import { FrameDecoder, FrameKind, decodeJson, encodeFrame, encodeJson, type Frame } from "../framing.js";
import { ProtocolError, type ProtocolErrorShape } from "../errors.js";
import { Envelope, ResultMessage, type Payload } from "../messages.js";

type Pending = {
  resolve: (p: Payload) => void;
  reject: (e: Error) => void;
  cleanup: () => void;
};

export class FramedConnection extends EventEmitter {
  private readonly decoder = new FrameDecoder();
  private readonly pending = new Map<string, Pending>();
  private seq = 0;
  closed = false;

  constructor(private readonly socket: net.Socket) {
    super();
    socket.on("data", (chunk: Buffer) => {
      let frames: Frame[];
      try {
        frames = this.decoder.push(chunk);
      } catch (e) {
        socket.destroy(e as Error);
        return;
      }
      for (const f of frames) this.dispatch(f);
    });
    socket.on("error", (e) => this.emit("error", e));
    socket.on("close", () => {
      this.closed = true;
      const err = new ProtocolError("CANCELLED", "connection closed");
      for (const p of this.pending.values()) {
        p.cleanup();
        p.reject(err);
      }
      this.pending.clear();
      this.emit("close");
    });
    // Without a listener, an "error" emit would throw; consumers may attach their own.
    this.on("error", () => {});
  }

  request(type: string, payload: Payload = {}, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Payload> {
    const id = String(++this.seq);
    const timeoutMs = opts.timeoutMs ?? 30_000;
    return new Promise<Payload>((resolve, reject) => {
      if (this.closed) return reject(new ProtocolError("CANCELLED", "connection closed"));
      if (opts.signal?.aborted) return reject(new ProtocolError("CANCELLED", "aborted"));
      const finish = (err: Error) => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        cleanup();
        reject(err);
      };
      const timer = setTimeout(() => finish(new ProtocolError("TIMEOUT", `${type} timed out after ${timeoutMs}ms`)), timeoutMs);
      const onAbort = () => finish(new ProtocolError("CANCELLED", "aborted"));
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      const cleanup = () => {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
      };
      this.pending.set(id, { resolve, reject, cleanup });
      this.writeJson({ v: 1, type, id, payload });
    });
  }

  notify(type: string, payload: Payload = {}): void {
    this.writeJson({ v: 1, type, payload });
  }

  reply(id: string, result: { ok: true; payload?: Payload } | { ok: false; error: ProtocolErrorShape }): void {
    const msg: ResultMessage = result.ok
      ? { v: 1, type: "result", id, ok: true, payload: result.payload ?? {} }
      : { v: 1, type: "result", id, ok: false, error: result.error };
    this.writeJson(msg);
  }

  sendRaw(kind: 1 | 2 | 3 | 4, bytes: Uint8Array): void {
    if (this.closed) return;
    this.socket.write(encodeFrame(kind, bytes));
  }

  close(): void {
    if (this.closed) return;
    this.socket.end();
    this.socket.destroy();
  }

  private writeJson(msg: unknown): void {
    if (this.closed) return;
    this.socket.write(encodeFrame(FrameKind.Json, encodeJson(msg)));
  }

  private dispatch(frame: Frame): void {
    if (frame.kind === FrameKind.PtyOut) return void this.emit("pty", frame.payload);
    if (frame.kind === FrameKind.KeyIn) return void this.emit("keys", frame.payload);
    if (frame.kind === FrameKind.BrowserFrame) return void this.emit("browser-frame", frame.payload);
    if (frame.kind === FrameKind.BrowserInput) return void this.emit("browser-input", frame.payload);
    let raw: unknown;
    try {
      raw = decodeJson(frame.payload);
    } catch (e) {
      this.socket.destroy(e as Error);
      return;
    }
    const result = ResultMessage.safeParse(raw);
    if (result.success) {
      const p = this.pending.get(result.data.id);
      if (!p) return;
      this.pending.delete(result.data.id);
      p.cleanup();
      if (result.data.ok) p.resolve(result.data.payload ?? {});
      else p.reject(new ProtocolError(result.data.error!.code, result.data.error!.message));
      return;
    }
    const env = Envelope.safeParse(raw);
    if (!env.success) {
      this.socket.destroy(new Error("invalid envelope"));
      return;
    }
    this.emit("message", env.data);
  }
}
