import { z } from "zod";

export const ScreenState = z.enum(["busy", "idle_shell", "nested_agent_idle", "question_menu", "permission_prompt", "password_prompt", "unknown"]);
export type ScreenState = z.infer<typeof ScreenState>;

export const ScreenHint = z.object({ state: ScreenState, options: z.array(z.string()).max(12).optional() });
export type ScreenHint = z.infer<typeof ScreenHint>;

const PASSWORD = /\[sudo\] password|^\s*password( for [^:]+)?:\s*$/im;
const PERMISSION = /do you want to proceed\?|yes, allow|don't ask again|allow command\?|would you like to run|\bapprove\b[^\n]*\?/i;
const OPTION_LINE = /^\s*(?:❯|>|›)?\s*(\d{1,2})[.)]\s+(\S.*?)\s*$/;
const MENU_FOOTER = /enter to select|use arrow keys|↑\/↓|\[y\/n\]|\(y\/n\)|\[yes\/no\]/i;
const BUSY = /esc to interrupt|\b(working|thinking|running|loading)(…|\.\.\.)|[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/i;
// Claude Code 2.x: "❯ Try ..." input line, footer "auto mode on (shift+tab to cycle)" / "? for shortcuts"; Codex: "› Ask Codex ...".
const NESTED_IDLE = /^\s*[│┃]?\s*[>›❯]\s*(\S.*)?[│┃]?\s*$|\? for shortcuts|shift\+tab to cycle|ask codex to do anything/im;
const SHELL_PROMPT = /(\$|#|%)\s*$/;

// Heuristics over the visible screen. The last 40 non-empty lines carry the state.
export function classifyScreen(screen: string): ScreenHint {
  const lines = screen.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim().length > 0).slice(-40);
  const text = lines.join("\n");
  if (lines.length === 0) return { state: "unknown" };
  if (PASSWORD.test(text)) return { state: "password_prompt" };
  if (PERMISSION.test(text)) return { state: "permission_prompt" };
  const options = lines.map((l) => OPTION_LINE.exec(l)).filter((m): m is RegExpExecArray => m !== null).map((m) => m[2]!);
  if (options.length >= 2 || MENU_FOOTER.test(text)) return { state: "question_menu", options: options.slice(0, 12) };
  const tail = lines.slice(-5).join("\n");
  if (BUSY.test(tail)) return { state: "busy" };
  if (NESTED_IDLE.test(tail)) return { state: "nested_agent_idle" };
  if (SHELL_PROMPT.test(lines[lines.length - 1]!)) return { state: "idle_shell" };
  return { state: "unknown" };
}
