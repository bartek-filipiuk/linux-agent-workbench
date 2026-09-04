import { describe, expect, it } from "vitest";
import { classifyScreen } from "../src/screen-state.js";

const claudeMenu = `
? Which approach should I take?
❯ 1. Fast path
  2. Careful path
  3. Ask me later
Enter to select · ↑/↓ to move · Esc to cancel
`;
const claudePermission = `
Claude wants to run \`rm -rf dist\`

Do you want to proceed?
❯ 1. Yes
  2. Yes, and don't ask again this session
  3. No, and tell Claude what to do differently (esc)
`;
const claudeIdle = `
╭──────────────────────────────╮
│ >                            │
╰──────────────────────────────╯
  ? for shortcuts
`;
const claudeCodeReal = `
 Claude Code v2.1.260
 Opus 5 (1M context) · Claude Max
 /workspace

 ● Created /workspace/hello.txt containing hello\n (verified with cat -A).

 ✻ Brewed for 3s · done 11:21 AM

────────────────────────────────────────────────────
❯ Try "create a util logging.py that..."
────────────────────────────────────────────────────
  auto mode on (shift+tab to cycle) · ← for agents               /rc active
`;
const busy = `
⠋ Thinking… (esc to interrupt)
`;
const shell = `agent@law:/workspace$ ls
README.md
agent@law:/workspace$ `;

describe("classifyScreen", () => {
  it("question menu with options", () => {
    expect(classifyScreen(claudeMenu)).toEqual({ state: "question_menu", options: ["Fast path", "Careful path", "Ask me later"] });
  });
  it("permission prompt wins over its numbered options", () => {
    expect(classifyScreen(claudePermission).state).toBe("permission_prompt");
  });
  it.each([
    ["[sudo] password for agent:", "password_prompt"],
    ["Password:", "password_prompt"],
    ["Allow command?\n  [y] yes  [n] no", "permission_prompt"],
    [busy, "busy"],
    [claudeIdle, "nested_agent_idle"],
    [claudeCodeReal, "nested_agent_idle"],
    ["› Ask Codex to do anything\n  ? for shortcuts", "nested_agent_idle"],
    [shell, "idle_shell"],
    ["root@box:/# ", "idle_shell"],
    ["Reading package lists... Done\nDo you want to continue? [Y/n] ", "question_menu"],
    ["Compiling 3 of 10 files", "unknown"],
    ["", "unknown"],
  ])("%j → %s", (screen, state) => {
    expect(classifyScreen(screen).state).toBe(state);
  });
  it("caps options at 12 and ignores lines that are not options", () => {
    const many = Array.from({ length: 20 }, (_, i) => `  ${i + 1}. Option ${i + 1}`).join("\n") + "\n(Use arrow keys)";
    const h = classifyScreen(many);
    expect(h.state).toBe("question_menu");
    expect(h.options).toHaveLength(12);
  });
});
