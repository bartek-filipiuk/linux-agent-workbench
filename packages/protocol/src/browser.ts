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

// ---- B3: semantic observation and structured actions ----

export const BrowserElement = z.object({
  ref: z.string().regex(/^e\d+$/),
  role: z.string(),
  name: z.string().max(120),
  text: z.string().max(120).optional(),
  value: z.string().max(120).optional(),
  href: z.string().max(400).optional(),
  enabled: z.boolean(),
  editable: z.boolean(),
  inViewport: z.boolean(),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
});
export type BrowserElement = z.infer<typeof BrowserElement>;

export const BrowserPageInfo = z.object({ id: z.string(), url: z.string(), title: z.string() });
export type BrowserPageInfo = z.infer<typeof BrowserPageInfo>;

export const BrowserObservation = z.object({
  revision: z.number().int().nonnegative(),
  activePageId: z.string(),
  url: z.string(),
  title: z.string(),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  scroll: z.object({ x: z.number(), y: z.number(), maxY: z.number() }),
  elements: z.array(BrowserElement).max(200),
  pages: z.array(BrowserPageInfo),
  screenshotJpegBase64: z.string().optional(),
  lastDialog: z.object({ type: z.string(), message: z.string() }).optional(),
});
export type BrowserObservation = z.infer<typeof BrowserObservation>;

export const BrowserObserveInput = z.object({ screenshot: z.boolean().optional(), maxElements: z.number().int().min(1).max(200).optional() });
export type BrowserObserveInput = z.infer<typeof BrowserObserveInput>;

const ref = z.string().regex(/^e\d+$/);
const revision = z.number().int().nonnegative();
export const BrowserAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("navigate"), url: z.string().min(1).max(4096) }),
  z.object({ kind: z.literal("click"), ref, revision }),
  z.object({ kind: z.literal("type"), ref, revision, text: z.string().max(4096), submit: z.boolean().optional() }),
  z.object({ kind: z.literal("press"), key: z.string().min(1).max(32) }),
  z.object({ kind: z.literal("select"), ref, revision, values: z.array(z.string().max(200)).min(1).max(20) }),
  z.object({ kind: z.literal("mouse"), x: coord, y: coord, action: z.enum(["move", "down", "up", "wheel"]), deltaY: coord.optional() }),
  z.object({ kind: z.literal("switchPage"), pageId: z.string().min(1) }),
  z.object({ kind: z.literal("closePage"), pageId: z.string().min(1) }),
  z.object({ kind: z.literal("upload"), ref, revision, workspacePaths: z.array(z.string()).min(1).max(10) }),
  z.object({ kind: z.literal("wait"), ms: z.number().int().min(0).max(10_000) }),
]);
export type BrowserAction = z.infer<typeof BrowserAction>;

export const BrowserActResult = z.object({ url: z.string(), title: z.string(), activePageId: z.string() });
export type BrowserActResult = z.infer<typeof BrowserActResult>;

export const BrowserWaitInput = z.object({
  text: z.string().max(200).optional(),
  selector: z.string().max(400).optional(),
  state: z.enum(["load", "networkidle"]).optional(),
  timeoutMs: z.number().int().min(100).max(60_000).optional(),
});
export type BrowserWaitInput = z.infer<typeof BrowserWaitInput>;

export const BrowserWaitResult = z.object({ matched: z.boolean(), timedOut: z.boolean(), url: z.string(), title: z.string() });
export type BrowserWaitResult = z.infer<typeof BrowserWaitResult>;

export const BrowserDownload = z.object({ name: z.string(), bytes: z.number().int().nonnegative(), pageUrl: z.string() });
export type BrowserDownload = z.infer<typeof BrowserDownload>;
