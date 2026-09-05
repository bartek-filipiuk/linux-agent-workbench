import { z } from "zod";
import { ProtocolError, TerminalInput, TerminalObserveInput, TerminalWaitInput } from "@law/protocol";
import type { ToolCall, ToolExecutor, ToolSpec } from "../provider/types.js";
import type { TerminalWorker } from "../worker/types.js";

export const RequestHumanArgs = z.object({ reason: z.string().min(1).max(500) });
const NoArgs = z.object({}).strict();
// submit=true runs the line: ENTER is sent after the text or paste; wait={...} then waits for the result in
// the same call, so one command costs one model turn instead of two.
export const TerminalInputArgs = z.intersection(TerminalInput, z.object({ submit: z.boolean().optional(), wait: TerminalWaitInput.optional() }));
// scrollback=true adds the history tail (the worker only captures it when asked); by default only the visible screen travels.
export const TerminalObserveArgs = TerminalObserveInput;
export const TerminalWaitArgs = TerminalWaitInput;

/** Trailing whitespace and empty lines carry nothing; an empty scrollback tail is dropped. */
export function slimTerminal<T extends { screen: string; scrollbackTail?: string | undefined }>(obs: T, scrollback: boolean): T {
  const screen = obs.screen
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
  const out = { ...obs, screen };
  if (!scrollback || !out.scrollbackTail) delete out.scrollbackTail;
  return out;
}

export class HandoffRequested extends Error {
  constructor(readonly reason: string) {
    super(`handoff requested: ${reason}`);
    this.name = "HandoffRequested";
  }
}

// Refinements (byte limit, control chars) have no JSON Schema form; they still run in parseArgs.
const schema = (s: z.ZodType) => z.toJSONSchema(s, { target: "draft-7", unrepresentable: "any" }) as Record<string, unknown>;

export const TERMINAL_TOOLS: ToolSpec[] = [
  {
    name: "terminal_observe",
    description:
      "Read the current terminal screen (plain text, no ANSI), cursor, size and idle time. Call after sending input and before deciding the next step. scrollback=true adds the history tail (output that already scrolled off).",
    parameters: schema(TerminalObserveArgs),
  },
  {
    name: "terminal_input",
    description:
      "Send input to the terminal. kind=text types characters (no control characters); kind=key sends one named key (ENTER, TAB, ESC, CTRL_C, CTRL_D, arrows); kind=paste pastes a block. Set submit=true to press ENTER right after the text or paste, and wait={idleMs?, until?, timeoutMs?} to get the settled screen back in the same call (one call = type, run, read).",
    parameters: schema(TerminalInputArgs),
  },
  {
    name: "terminal_wait",
    description:
      "Wait for the terminal to settle, then return the observation. Returns when the screen has been quiet for idleMs (default 1500), when the regex `until` matches the screen, or after timeoutMs (default 60000, then timedOut=true). Use this after sending input instead of repeated observes. The result's hint.state tells you what the screen is: busy, idle_shell, nested_agent_idle, question_menu (answer with UP/DOWN/ENTER), permission_prompt or password_prompt (the human answers these).",
    parameters: schema(TerminalWaitArgs),
  },
  {
    name: "terminal_interrupt",
    description: "Send Ctrl-C to the foreground process.",
    parameters: schema(NoArgs),
  },
  {
    name: "request_human",
    description:
      "Pause and hand control to the human. Use for logins, permission prompts of nested tools, or when the state is unclear and continuing could cause harm.",
    parameters: schema(RequestHumanArgs),
  },
];

function parseArgs<T>(s: z.ZodType<T>, args: unknown, tool: string): T {
  const r = s.safeParse(args ?? {});
  if (!r.success) throw new ProtocolError("INVALID_INPUT", `${tool}: ${r.error.issues.map((i) => i.message).join("; ")}`);
  return r.data;
}

export async function executeTerminalTool(call: ToolCall, worker: TerminalWorker, signal: AbortSignal): Promise<string> {
  switch (call.name) {
    case "terminal_observe": {
      const input = parseArgs(TerminalObserveArgs, call.args, call.name);
      return JSON.stringify(slimTerminal(await worker.observe(input, signal), input.scrollback === true));
    }
    case "terminal_input": {
      const { submit, wait, ...input } = parseArgs(TerminalInputArgs, call.args, call.name);
      let result = await worker.input(input, signal);
      if (submit && input.kind !== "key") result = await worker.input({ kind: "key", key: "ENTER" }, signal);
      if (wait) return JSON.stringify(slimTerminal(await worker.wait(wait, signal), wait.scrollback === true));
      return JSON.stringify(result);
    }
    case "terminal_wait": {
      const input = parseArgs(TerminalWaitArgs, call.args, call.name);
      return JSON.stringify(slimTerminal(await worker.wait(input, signal), input.scrollback === true));
    }
    case "terminal_interrupt":
      parseArgs(NoArgs, call.args, call.name);
      await worker.interrupt(signal);
      return JSON.stringify({ ok: true });
    case "request_human":
      throw new HandoffRequested(parseArgs(RequestHumanArgs, call.args, call.name).reason);
    default:
      throw new ProtocolError("INVALID_INPUT", `unknown tool ${call.name}`);
  }
}

export function terminalExecutor(worker: TerminalWorker): ToolExecutor {
  return {
    specs: TERMINAL_TOOLS,
    execute: async (call, signal) => ({ output: await executeTerminalTool(call, worker, signal) }),
  };
}
