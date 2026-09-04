import { describe, expect, it } from "vitest";
import { FrameDecoder, FrameKind, MAX_FRAME_BYTES, decodeJson, encodeFrame, encodeJson } from "../src/framing.js";

describe("framing", () => {
  it("round-trips a json frame", () => {
    const payload = encodeJson({ v: 1, type: "ping", payload: {} });
    const bytes = encodeFrame(FrameKind.Json, payload);
    expect(bytes.length).toBe(5 + payload.length);
    const frames = new FrameDecoder().push(bytes);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.kind).toBe(0);
    expect(decodeJson(frames[0]!.payload)).toEqual({ v: 1, type: "ping", payload: {} });
  });

  it("reassembles frames split across arbitrary chunk boundaries", () => {
    const a = encodeFrame(FrameKind.PtyOut, new TextEncoder().encode("hello"));
    const b = encodeFrame(FrameKind.KeyIn, new Uint8Array([0x03]));
    const all = new Uint8Array(a.length + b.length);
    all.set(a, 0);
    all.set(b, a.length);
    for (let cut = 1; cut < all.length; cut++) {
      const dec = new FrameDecoder();
      const frames = [...dec.push(all.subarray(0, cut)), ...dec.push(all.subarray(cut))];
      expect(frames.map((f) => f.kind)).toEqual([1, 2]);
      expect(new TextDecoder().decode(frames[0]!.payload)).toBe("hello");
      expect(Array.from(frames[1]!.payload)).toEqual([0x03]);
    }
  });

  it("handles an empty payload", () => {
    const frames = new FrameDecoder().push(encodeFrame(FrameKind.Json, new Uint8Array()));
    expect(frames[0]!.payload.length).toBe(0);
  });

  it("rejects oversized frames on encode and decode", () => {
    expect(() => encodeFrame(FrameKind.PtyOut, new Uint8Array(MAX_FRAME_BYTES))).toThrow(RangeError);
    const bad = new Uint8Array(5);
    new DataView(bad.buffer).setUint32(0, MAX_FRAME_BYTES + 1);
    expect(() => new FrameDecoder().push(bad)).toThrow(RangeError);
  });

  it("rejects zero-length and unknown kinds", () => {
    const zero = new Uint8Array(4);
    expect(() => new FrameDecoder().push(zero)).toThrow(RangeError);
    const unknown = encodeFrame(FrameKind.Json, new Uint8Array());
    unknown[4] = 9;
    expect(new FrameDecoder().push(encodeFrame(FrameKind.BrowserFrame, new Uint8Array([1])))[0]!.kind).toBe(3);
    expect(() => new FrameDecoder().push(unknown)).toThrow(RangeError);
  });
});
