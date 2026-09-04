export const FrameKind = { Json: 0, PtyOut: 1, KeyIn: 2, BrowserFrame: 3, BrowserInput: 4 } as const;
export type FrameKind = (typeof FrameKind)[keyof typeof FrameKind];

export const MAX_FRAME_BYTES = 8 * 1024 * 1024;

export interface Frame {
  kind: FrameKind;
  payload: Uint8Array;
}

const HEADER = 5; // u32 length + u8 kind

export function encodeFrame(kind: FrameKind, payload: Uint8Array): Uint8Array {
  const length = payload.length + 1;
  if (length > MAX_FRAME_BYTES) throw new RangeError(`frame length ${length} exceeds ${MAX_FRAME_BYTES}`);
  const out = Buffer.allocUnsafe(HEADER + payload.length);
  out.writeUInt32BE(length, 0);
  out[4] = kind;
  out.set(payload, HEADER);
  return out;
}

function isFrameKind(n: number): n is FrameKind {
  return n >= 0 && n <= 4;
}

export class FrameDecoder {
  // ponytail: single growing buffer with concat; switch to a chunk list if PTY throughput ever shows it in a profile
  private buf: Buffer = Buffer.alloc(0);

  push(chunk: Uint8Array): Frame[] {
    this.buf = this.buf.length === 0 ? Buffer.from(chunk) : Buffer.concat([this.buf, chunk]);
    const frames: Frame[] = [];
    while (this.buf.length >= 4) {
      const length = this.buf.readUInt32BE(0);
      if (length < 1 || length > MAX_FRAME_BYTES) {
        throw new RangeError(`frame length ${length} out of range`);
      }
      if (this.buf.length < 4 + length) break;
      const kind = this.buf[4]!;
      if (!isFrameKind(kind)) throw new RangeError(`unknown frame kind ${kind}`);
      frames.push({ kind, payload: new Uint8Array(this.buf.subarray(HEADER, 4 + length)) });
      this.buf = this.buf.subarray(4 + length);
    }
    return frames;
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });

export function encodeJson(value: unknown): Uint8Array {
  return enc.encode(JSON.stringify(value));
}

export function decodeJson(payload: Uint8Array): unknown {
  return JSON.parse(dec.decode(payload));
}
