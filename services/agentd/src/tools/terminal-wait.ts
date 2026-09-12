import type { TerminalObservation, TerminalWaitInput } from "@law/protocol";
import type { TerminalWorker } from "../worker/types.js";

/** Only the current prompt, not a previous user message containing a pasted-text label. */
export function hasPendingPaste(obs: TerminalObservation): boolean {
  if (obs.hint?.state !== "nested_agent_idle") return false;
  const prompts = obs.screen.split("\n").slice(-8).filter(line => /^\s*[❯›>]\s*/u.test(line));
  return /^\s*[❯›>]\s*\[Pasted text #\d+/u.test(prompts.at(-1) ?? "");
}

/** Long marker waits yield early when a nested TUI needs input, without sending any keys. */
export async function waitForTerminal(worker: TerminalWorker, input: TerminalWaitInput, signal: AbortSignal) {
  const deadline = Date.now() + (input.timeoutMs ?? 60_000);
  for (;;) {
    signal.throwIfAborted();
    const timeoutMs = Math.max(500, Math.min(2000, deadline - Date.now()));
    const obs = await worker.wait({ ...input, timeoutMs, scrollback: false }, signal);
    signal.throwIfAborted();
    const pending = hasPendingPaste(obs);
    const needsHuman = obs.hint?.state === "permission_prompt" || obs.hint?.state === "password_prompt";
    const question = obs.hint?.state === "question_menu";
    const expired = Date.now() >= deadline;
    if (pending || needsHuman || question || obs.matched || !obs.timedOut || obs.exited || expired) {
      const result = input.scrollback ? { ...obs, ...await worker.observe({ scrollback: true }, signal) } : obs;
      return {
        ...result,
        timedOut: expired && obs.timedOut,
        ...(pending ? { matched: false, inputStatus: "pending", note: "A pasted draft is still visible in the current prompt. No extra ENTER was sent. Inspect the current prompt before submitting it; do not paste the task again." } : {}),
        ...(needsHuman || question ? { matched: false, note: "The terminal is waiting for input, not completion. Inspect hint.state before continuing; permission and password prompts belong to the human." } : {}),
      };
    }
  }
}
