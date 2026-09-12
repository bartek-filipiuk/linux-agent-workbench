import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { TerminalSession } from "../../terminal-worker/src/terminal-session.js";
import { executeTerminalTool } from "../src/tools/terminal-tools.js";
import type { TerminalWorker } from "../src/worker/types.js";

it("submits to a real PTY/tmux TUI as a distinct ENTER after its paste handling settles", async () => {
  const root = fs.mkdtempSync("/tmp/law-submit-pty-");
  const socket = path.join(root, "tmux.sock");
  fs.writeFileSync(path.join(root, "fixture.cjs"), `
process.stdin.setRawMode(true); process.stdin.resume();
let lastText = 0, submits = 0;
process.stdout.write('\\x1b[2J\\x1b[HRAW_READY');
process.stdin.on('data', data => {
 const text=data.toString();
 if(text.includes('\\r')) {
  if(text.replace(/\\r/g,'').length || Date.now()-lastText<100) process.stdout.write('\\x1b[2J\\x1b[H❯ [Pasted text #1 +1 lines]\\n? for shortcuts');
  else process.stdout.write('\\x1b[2J\\x1b[HACCEPTED_'+(++submits));
 } else { lastText=Date.now(); process.stdout.write('\\x1b[2J\\x1b[H❯ [Pasted text #1]\\n? for shortcuts'); }
});`);
  const session = new TerminalSession({ tmuxSocket: socket, cwd: root, env: { PATH: process.env.PATH ?? "", TERM: "xterm-256color", LANG: "C.UTF-8", PS1: "$ " } });
  try {
    await session.start();
    await session.wait({ idleMs: 200, timeoutMs: 3000 });
    await session.input({ kind: "text", text: `node ${path.join(root, "fixture.cjs")}` });
    await session.input({ kind: "key", key: "ENTER" });
    expect((await session.wait({ until: "RAW_READY", timeoutMs: 5000 })).matched).toBe(true);
    const result = JSON.parse(await executeTerminalTool({ callId: "submit", name: "terminal_input", args: { kind: "text", text: "A long prompt to a terminal UI. ".repeat(30), submit: true, wait: { until: "ACCEPTED_1", timeoutMs: 5000 } } }, session as unknown as TerminalWorker, new AbortController().signal));
    expect(result.matched).toBe(true); expect(result.screen).toContain("ACCEPTED_1");
    expect(result.screen).not.toContain("ACCEPTED_2");
  } finally {
    session.dispose();
    try { execFileSync("tmux", ["-S", socket, "kill-server"], { stdio: "ignore" }); } catch {}
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15000);
