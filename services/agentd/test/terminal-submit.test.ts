import { afterEach, expect, it, vi } from "vitest";
import { executeTerminalTool, HandoffRequested } from "../src/tools/terminal-tools.js";
import { hasPendingPaste, waitForTerminal } from "../src/tools/terminal-wait.js";
import type { TerminalWorker } from "../src/worker/types.js";
import type { TerminalWaitResult } from "@law/protocol";
const sig = new AbortController().signal;
const observation = (screen = "$ ", state: "idle_shell" | "nested_agent_idle" | "permission_prompt" | "busy" = "idle_shell"): TerminalWaitResult => ({ revision: 1, screen, cursor: { row: 0, col: 0 }, size: { rows: 24, cols: 80 }, idleMs: 1500, exited: false, hint: { state }, timedOut: false, matched: false });
afterEach(() => vi.useRealTimers());

it("separates paste and ENTER and never sends it after cancellation during settling", async () => {
  vi.useFakeTimers();
  const calls: unknown[] = [];
  const worker = { input: vi.fn(async v => { calls.push(v); return { revision: 1 }; }), wait: vi.fn(async () => observation()) } as unknown as TerminalWorker;
  const controller = new AbortController();
  const result = executeTerminalTool({ callId: "1", name: "terminal_input", args: { kind: "paste", text: "A prompt", submit: true } }, worker, controller.signal);
  const rejection = expect(result).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(200);
  expect(calls).toHaveLength(1);
  controller.abort();
  await rejection;
  await vi.advanceTimersByTimeAsync(500);
  expect(calls).toHaveLength(1);
});
it("does not press ENTER into a permission prompt or a terminal that failed to settle", async () => {
  vi.useFakeTimers();
  const input = vi.fn(async () => ({ revision: 1 }));
  const wait = vi.fn(async () => observation("Do you want to proceed?", "permission_prompt"));
  const worker = { input, wait } as unknown as TerminalWorker;
  const result = executeTerminalTool({ callId: "1", name: "terminal_input", args: { kind: "text", text: "task", submit: true } }, worker, sig);
  const rejection = expect(result).rejects.toBeInstanceOf(HandoffRequested);
  await vi.advanceTimersByTimeAsync(300); await rejection;
  expect(input).toHaveBeenCalledTimes(1);
  wait.mockResolvedValue({ ...observation(), timedOut: true });
  const unsettled = executeTerminalTool({ callId: "2", name: "terminal_input", args: { kind: "text", text: "task", submit: true } }, worker, sig);
  await vi.advanceTimersByTimeAsync(300);
  expect(JSON.parse(await unsettled).inputStatus).toBe("not_submitted");
  expect(input).toHaveBeenCalledTimes(2);
});
it("returns a pending pasted draft promptly instead of waiting three minutes for a completion marker", async () => {
  const wait = vi.fn(async () => ({ ...observation("❯ [Pasted text #1 +1 lines]\n────────\n? for shortcuts", "nested_agent_idle"), timedOut: true }));
  const worker = { wait } as unknown as TerminalWorker;
  const result = await waitForTerminal(worker, { until: "LANDING_COMPLETE", timeoutMs: 180000 }, sig);
  expect(result).toMatchObject({ inputStatus: "pending", matched: false, timedOut: false });
  expect(wait).toHaveBeenCalledTimes(1);
  expect(wait.mock.calls[0]).toEqual([{ until: "LANDING_COMPLETE", timeoutMs: 2000, scrollback: false }, sig]);
  expect(hasPendingPaste(observation("❯ [Pasted text #1 +1 lines]\nCompleted result\n❯ \n? for shortcuts", "nested_agent_idle"))).toBe(false);
  expect(hasPendingPaste(observation("❯ [Pasted text #1 +1 lines]\nEsc to interrupt", "busy"))).toBe(false);
});
it("keeps waiting through timed-out slices and returns actual completion", async () => {
  const wait = vi.fn().mockResolvedValueOnce({ ...observation("Thinking...", "busy"), timedOut: true }).mockResolvedValueOnce({ ...observation("LANDING_COMPLETE"), matched: true });
  const result = await waitForTerminal({ wait } as unknown as TerminalWorker, { until: "LANDING_COMPLETE", timeoutMs: 10000 }, sig);
  expect(result).toMatchObject({ matched: true, timedOut: false }); expect(wait).toHaveBeenCalledTimes(2);
});
