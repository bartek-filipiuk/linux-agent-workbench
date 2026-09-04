import { describe, expect, it } from "vitest";
import { NestedPromptPolicy, composePolicies, detectNestedPrompt } from "../src/policy/nested-prompts.js";
import { allowAllPolicy } from "../src/policy/types.js";

describe("detectNestedPrompt", () => {
  it.each([
    ["Claude wants to run `rm -rf dist`\n\nDo you want to proceed?\n❯ 1. Yes\n  2. Yes, and don't ask again\n  3. No, and tell Claude what to do differently (esc)", "claude-proceed"],
    ["Allow command?\n  [y] yes  [n] no", "codex-allow"],
    ["[sudo] password for agent:", "sudo-password"],
    ["Password:", "password"],
  ])("matches %j", (screen, id) => {
    expect(detectNestedPrompt(screen)?.id).toBe(id);
  });
  it("ignores normal output", () => {
    expect(detectNestedPrompt("agent@law:/workspace$ ls\nREADME.md\nagent@law:/workspace$ ")).toBeNull();
    expect(detectNestedPrompt("Would you like fries with that? no")).toBeNull();
  });
});

describe("NestedPromptPolicy", () => {
  const ctx = { runId: "r", networkMode: "open" as const };
  it("blocks terminal_input with a handoff reason while a prompt is visible; other tools pass", async () => {
    let screen = "Do you want to proceed?\n❯ 1. Yes";
    const p = new NestedPromptPolicy(async () => ({ screen }));
    const d = await p.authorize({ callId: "1", name: "terminal_input", args: { kind: "key", key: "ENTER" } }, ctx);
    expect(d).toMatchObject({ allow: false, code: "LEASE_DENIED", handoff: expect.stringMatching(/permission prompt/) });
    expect(await p.authorize({ callId: "2", name: "terminal_observe", args: {} }, ctx)).toEqual({ allow: true });
    screen = "$ ";
    expect(await p.authorize({ callId: "3", name: "terminal_input", args: { kind: "text", text: "ls" } }, ctx)).toEqual({ allow: true });
  });
  it("composePolicies returns the first denial", async () => {
    const deny = { authorize: async () => ({ allow: false as const, code: "POLICY_DENIED" as const, reason: "no" }) };
    expect(await composePolicies(allowAllPolicy, deny).authorize({ callId: "1", name: "x", args: {} }, ctx)).toMatchObject({ allow: false, reason: "no" });
    expect(await composePolicies(allowAllPolicy, allowAllPolicy).authorize({ callId: "1", name: "x", args: {} }, ctx)).toEqual({ allow: true });
  });
});
