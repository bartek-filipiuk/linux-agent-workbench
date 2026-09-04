import { z } from "zod";

export const BrowserNavigate = z.object({ url: z.string().min(1).max(4096) });
export type BrowserNavigate = z.infer<typeof BrowserNavigate>;

export const BrowserInfo = z.object({
  url: z.string(),
  title: z.string(),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
});
export type BrowserInfo = z.infer<typeof BrowserInfo>;

export const BrowserScreencastOptions = z.object({
  quality: z.number().int().min(1).max(100).optional(),
  size: z.object({ width: z.number().int().min(64).max(4096), height: z.number().int().min(64).max(4096) }).optional(),
});
export type BrowserScreencastOptions = z.infer<typeof BrowserScreencastOptions>;

const coord = z.number().min(-10_000).max(10_000);
export const BrowserInputEvent = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mousemove"), x: coord, y: coord }),
  z.object({ kind: z.literal("mousedown"), x: coord, y: coord, button: z.enum(["left", "middle", "right"]).optional() }),
  z.object({ kind: z.literal("mouseup"), x: coord, y: coord, button: z.enum(["left", "middle", "right"]).optional() }),
  z.object({ kind: z.literal("wheel"), x: coord, y: coord, deltaX: coord.optional(), deltaY: coord.optional() }),
  z.object({ kind: z.literal("keydown"), key: z.string().min(1).max(32) }),
  z.object({ kind: z.literal("keyup"), key: z.string().min(1).max(32) }),
  z.object({ kind: z.literal("insert"), text: z.string().min(1).max(4096) }),
]);
export type BrowserInputEvent = z.infer<typeof BrowserInputEvent>;

/** Only the schemes a model or a human may navigate to through the sandbox browser. */
export function normaliseNavigableUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

// kind-3 frame payload: u16 width, u16 height (big-endian), then JPEG bytes.
export function encodeBrowserFrame(width: number, height: number, jpeg: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + jpeg.length);
  new DataView(out.buffer).setUint16(0, width);
  new DataView(out.buffer).setUint16(2, height);
  out.set(jpeg, 4);
  return out;
}

export function decodeBrowserFrame(bytes: Uint8Array): { width: number; height: number; jpeg: Uint8Array } {
  if (bytes.length < 4) throw new RangeError("browser frame too short");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: dv.getUint16(0), height: dv.getUint16(2), jpeg: bytes.subarray(4) };
}
