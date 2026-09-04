import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ToolCall } from "../provider/types.js";

export const NESTED_PROMPT_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "claude-proceed", pattern: /do you want to proceed\?|yes, allow|don't ask again|esc to cancel/i },
  { id: "codex-allow", pattern: /allow command\?|would you like to run|\bapprove\b.*\?/i },
  { id: "sudo-password", pattern: /\[sudo\] password/i },
  { id: "password", pattern: /^\s*password( for [^:]+)?:\s*$/im },
];

export function detectNestedPrompt(screen: string): { id: string } | null {
  for (const p of NESTED_PROMPT_PATTERNS) if (p.pattern.test(screen)) return { id: p.id };
  return null;
}

// Screen regexes decide when to stop the agent's keystrokes; the human answers the prompt.
export class NestedPromptPolicy implements Policy {
  constructor(private readonly observe: () => Promise<{ screen: string }>) {}

  async authorize(call: ToolCall, _ctx: PolicyContext): Promise<PolicyDecision> {
    if (call.name !== "terminal_input") return { allow: true };
    const { screen } = await this.observe();
    const hit = detectNestedPrompt(screen);
    if (!hit) return { allow: true };
    return {
      allow: false,
      code: "LEASE_DENIED",
      reason: `a permission prompt (${hit.id}) is on screen; the human must answer it`,
      handoff: `nested permission prompt on screen (${hit.id}); answer it in the terminal, then give control back`,
    };
  }
}

export function composePolicies(...policies: Policy[]): Policy {
  return {
    async authorize(call, ctx) {
      for (const p of policies) {
        const d = await p.authorize(call, ctx);
        if (!d.allow) return d;
      }
      return { allow: true };
    },
  };
}
