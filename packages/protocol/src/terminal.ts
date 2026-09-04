import { z } from "zod";

export const TERMINAL_TEXT_MAX = 8192; // bytes

export const TerminalKey = z.enum(["ENTER", "TAB", "ESC", "CTRL_C", "CTRL_D", "UP", "DOWN", "LEFT", "RIGHT"]);
export type TerminalKey = z.infer<typeof TerminalKey>;

export const KEY_BYTES: Record<TerminalKey, string> = {
  ENTER: "\r",
  TAB: "\t",
  ESC: "\x1b",
  CTRL_C: "\x03",
  CTRL_D: "\x04",
  UP: "\x1b[A",
  DOWN: "\x1b[B",
  LEFT: "\x1b[D",
  RIGHT: "\x1b[C",
};

// Every C0 control except LF (0x0a) and TAB (0x09), plus DEL.
const CONTROL_EXCEPT_NL_TAB = /[\x00-\x08\x0b-\x1f\x7f]/;
const byteLength = (s: string) => new TextEncoder().encode(s).length;

export const SafeText = z
  .string()
  .refine((s) => !CONTROL_EXCEPT_NL_TAB.test(s), "control characters are not allowed; use kind=key")
  .refine((s) => byteLength(s) <= TERMINAL_TEXT_MAX, `text exceeds ${TERMINAL_TEXT_MAX} bytes`);

export const TerminalInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: SafeText, expectedRevision: z.number().int().nonnegative().optional() }),
  z.object({ kind: z.literal("key"), key: TerminalKey }),
  z.object({ kind: z.literal("paste"), text: SafeText }),
]);
export type TerminalInput = z.infer<typeof TerminalInput>;

export const TerminalInputResult = z.object({ revision: z.number().int().nonnegative() });
export type TerminalInputResult = z.infer<typeof TerminalInputResult>;

export const TerminalObserveInput = z.object({
  sinceRevision: z.number().int().nonnegative().optional(),
  maxLines: z.number().int().min(1).max(500).optional(),
});
export type TerminalObserveInput = z.infer<typeof TerminalObserveInput>;

export const TerminalObservation = z.object({
  revision: z.number().int().nonnegative(),
  screen: z.string(),
  scrollbackTail: z.string(),
  cursor: z.object({ row: z.number().int(), col: z.number().int() }),
  size: z.object({ rows: z.number().int().positive(), cols: z.number().int().positive() }),
  idleMs: z.number().nonnegative(),
  exited: z.boolean(),
  exitCode: z.number().int().optional(),
});
export type TerminalObservation = z.infer<typeof TerminalObservation>;

export const TerminalResize = z.object({
  cols: z.number().int().min(20).max(500),
  rows: z.number().int().min(5).max(200),
});
export type TerminalResize = z.infer<typeof TerminalResize>;

export const WorkerHealth = z.object({
  uptimeMs: z.number().nonnegative(),
  ptyAlive: z.boolean(),
  tmuxAlive: z.boolean(),
  bufferBytes: z.number().nonnegative(),
  droppedBytes: z.number().nonnegative(),
});
export type WorkerHealth = z.infer<typeof WorkerHealth>;
