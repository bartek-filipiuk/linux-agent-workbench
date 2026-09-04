import type { NetworkMode } from "@law/protocol";
import type { ToolCall } from "../provider/types.js";

export type PolicyDecision =
  | { allow: true }
  | { allow: false; code: "POLICY_DENIED" | "LEASE_DENIED"; reason: string };

export type PolicyContext = { runId: string; networkMode: NetworkMode };

export interface Policy {
  authorize(call: ToolCall, ctx: PolicyContext): Promise<PolicyDecision>;
}

// ponytail: M1 has no command gate yet; the real classifier and lease arrive in Milestone 4.
export const allowAllPolicy: Policy = {
  authorize: async () => ({ allow: true }),
};
