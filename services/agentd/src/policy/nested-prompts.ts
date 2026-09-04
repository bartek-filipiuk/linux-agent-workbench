import { classifyScreen, type ScreenHint } from "@law/protocol";
import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ToolCall } from "../provider/types.js";

// Kept for callers that only need a yes/no: a prompt the human must answer.
export function detectNestedPrompt(screen: string): { id: string } | null {
  const hint: ScreenHint = classifyScreen(screen);
  return hint.state === "permission_prompt" || hint.state === "password_prompt" ? { id: hint.state } : null;
}

// Screen regexes decide when to stop the agent's keystrokes; the human answers the prompt.
export class NestedPromptPolicy implements Policy {
  constructor(private readonly observe: () => Promise<{ screen: string }>) {}

  async authorize(call: ToolCall, _ctx: PolicyContext): Promise<PolicyDecision> {
    if (call.name !== "terminal_input") return { allow: true };
    const { screen } = await this.observe();
    const hit = detectNestedPrompt(screen);
    if (!hit) return { allow: true };
    const what = hit.id === "password_prompt" ? "password prompt" : "permission prompt";
    return {
      allow: false,
      code: "LEASE_DENIED",
      reason: `a ${what} is on screen; the human must answer it`,
      handoff: `${what} on screen; answer it in the terminal, then give control back`,
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
