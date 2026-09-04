import { describe, expect, it } from "vitest";
import { Envelope, ResultMessage } from "../src/messages.js";
import { KEY_BYTES, TERMINAL_TEXT_MAX, TerminalInput, TerminalObserveInput } from "../src/terminal.js";
import { DEFAULT_BUDGETS, RunState } from "../src/run.js";

describe("TerminalInput", () => {
  it("accepts plain text with newline and tab", () => {
    expect(TerminalInput.safeParse({ kind: "text", text: "ls -al\n\tx" }).success).toBe(true);
  });
  it("rejects NUL, escape, bell and DEL", () => {
    expect(TerminalInput.safeParse({ kind: "text", text: "a\x00b" }).success).toBe(false);
    expect(TerminalInput.safeParse({ kind: "text", text: "\x1b[A" }).success).toBe(false);
    expect(TerminalInput.safeParse({ kind: "text", text: "\x07" }).success).toBe(false);
    expect(TerminalInput.safeParse({ kind: "text", text: "x\x7f" }).success).toBe(false);
  });
  it("rejects text over the byte limit (multi-byte aware)", () => {
    const ok = "ę".repeat(TERMINAL_TEXT_MAX / 2); // 2 bytes each
    const tooBig = "ę".repeat(TERMINAL_TEXT_MAX / 2 + 1);
    expect(TerminalInput.safeParse({ kind: "text", text: ok }).success).toBe(true);
    expect(TerminalInput.safeParse({ kind: "text", text: tooBig }).success).toBe(false);
  });
  it("accepts only named keys", () => {
    expect(TerminalInput.safeParse({ kind: "key", key: "CTRL_C" }).success).toBe(true);
    expect(TerminalInput.safeParse({ kind: "key", key: "CTRL_Z" }).success).toBe(false);
    expect(KEY_BYTES.CTRL_C).toBe("\x03");
    expect(KEY_BYTES.ENTER).toBe("\r");
    expect(KEY_BYTES.UP).toBe("\x1b[A");
  });
  it("caps observe maxLines at 500", () => {
    expect(TerminalObserveInput.safeParse({ maxLines: 500 }).success).toBe(true);
    expect(TerminalObserveInput.safeParse({ maxLines: 501 }).success).toBe(false);
    expect(TerminalObserveInput.parse({})).toEqual({});
  });
});

describe("Envelope", () => {
  it("defaults payload and requires v=1", () => {
    expect(Envelope.parse({ v: 1, type: "x" })).toEqual({ v: 1, type: "x", payload: {} });
    expect(Envelope.safeParse({ v: 2, type: "x" }).success).toBe(false);
  });
  it("validates results with closed error codes", () => {
    expect(ResultMessage.safeParse({ v: 1, type: "result", id: "1", ok: false, error: { code: "TIMEOUT", message: "t" } }).success).toBe(true);
    expect(ResultMessage.safeParse({ v: 1, type: "result", id: "1", ok: false, error: { code: "NOPE", message: "t" } }).success).toBe(false);
  });
});

describe("run schemas", () => {
  it("has the closed state set and default budgets", () => {
    expect(RunState.options).toEqual([
      "idle", "running", "awaiting_approval", "handoff",
      "completed", "stopped", "failed", "budget_exceeded", "interrupted",
    ]);
    expect(DEFAULT_BUDGETS).toEqual({ maxTurns: 40, maxToolCalls: 200, maxDurationMs: 1_800_000, maxCostUsd: 10 });
  });
});
