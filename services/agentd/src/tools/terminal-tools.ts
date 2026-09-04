import { z } from "zod";
import { ProtocolError, TerminalInput, TerminalObserveInput, TerminalWaitInput } from "@law/protocol";
import type { ToolCall, ToolSpec } from "../provider/types.js";
import type { TerminalWorker } from "../worker/types.js";

export const RequestHumanArgs = z.object({ reason: z.string().min(1).max(500) });
const NoArgs = z.object({}).strict();

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
      "Read the current terminal screen (plain text, no ANSI), cursor, size and idle time. Call after sending input and before deciding the next step.",
    parameters: schema(TerminalObserveInput),
  },
  {
    name: "terminal_input",
    description:
      "Send input to the terminal. kind=text types characters (no control characters); kind=key sends one named key (ENTER, TAB, ESC, CTRL_C, CTRL_D, arrows); kind=paste pastes a block. Follow text with a separate ENTER key to run a command.",
    parameters: schema(TerminalInput),
  },
  {
    name: "terminal_wait",
    description:
      "Wait for the terminal to settle, then return the observation. Returns when the screen has been quiet for idleMs (default 1500), when the regex `until` matches the screen, or after timeoutMs (default 60000, then timedOut=true). Use this after sending input instead of repeated observes. The result's hint.state tells you what the screen is: busy, idle_shell, nested_agent_idle, question_menu (answer with UP/DOWN/ENTER), permission_prompt or password_prompt (the human answers these).",
    parameters: schema(TerminalWaitInput),
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
    case "terminal_observe":
      return JSON.stringify(await worker.observe(parseArgs(TerminalObserveInput, call.args, call.name), signal));
    case "terminal_input":
      return JSON.stringify(await worker.input(parseArgs(TerminalInput, call.args, call.name), signal));
    case "terminal_wait":
      return JSON.stringify(await worker.wait(parseArgs(TerminalWaitInput, call.args, call.name), signal));
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
