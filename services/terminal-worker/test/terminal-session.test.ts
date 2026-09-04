import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ProtocolError } from "@law/protocol";
import { TerminalSession } from "../src/terminal-session.js";

const sessions: TerminalSession[] = [];
const sockets: string[] = [];

function mk(extra: Partial<ConstructorParameters<typeof TerminalSession>[0]> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-tmux-"));
  const tmuxSocket = path.join(dir, "t.sock");
  sockets.push(tmuxSocket);
  const s = new TerminalSession({ tmuxSocket, cwd: dir, cols: 80, rows: 24, env: { PS1: "$ ", TERM: "xterm-256color", PATH: process.env.PATH ?? "" }, ...extra });
  sessions.push(s);
  return s;
}
const until = async (pred: () => Promise<boolean> | boolean, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("condition not met in time");
};
afterEach(() => {
  for (const s of sessions.splice(0)) s.dispose();
  for (const sock of sockets.splice(0)) {
    try { execFileSync("tmux", ["-S", sock, "kill-server"], { stdio: "ignore" }); } catch {}
  }
});

describe("TerminalSession", () => {
  it("runs a command and shows the output in the observed screen", async () => {
    const s = mk();
    await s.start();
    await until(async () => (await s.observe()).screen.includes("$"));
    const r0 = s.revision;
    await s.input({ kind: "text", text: "echo HELLO_$((6*7))" });
    await s.input({ kind: "key", key: "ENTER" });
    await until(async () => (await s.observe()).screen.includes("HELLO_42"));
    const obs = await s.observe();
    expect(obs.revision).toBeGreaterThan(r0);
    expect(obs.size).toEqual({ rows: 24, cols: 80 });
    expect(obs.exited).toBe(false);
    expect(obs.screen).not.toMatch(/\x1b/);
  });

  it("rejects stale expectedRevision", async () => {
    const s = mk();
    await s.start();
    await until(async () => (await s.observe()).screen.includes("$"));
    await expect(s.input({ kind: "text", text: "x", expectedRevision: s.revision + 100 })).rejects.toSatisfy((e) => ProtocolError.is(e, "STALE_REVISION"));
  });

  it("interrupts a foreground process with Ctrl-C", async () => {
    const s = mk();
    await s.start();
    await until(async () => (await s.observe()).screen.includes("$"));
    await s.input({ kind: "text", text: "sleep 30" });
    await s.input({ kind: "key", key: "ENTER" });
    await new Promise((r) => setTimeout(r, 300));
    s.interrupt();
    await until(async () => /\^C/.test((await s.observe()).screen));
  });

  it("resizes and reports the new size", async () => {
    const s = mk();
    await s.start();
    s.resize({ cols: 100, rows: 30 });
    await until(async () => (await s.observe()).size.cols === 100);
    expect((await s.observe()).size).toEqual({ rows: 30, cols: 100 });
  });

  it("keeps scrollback and caps maxLines", async () => {
    const s = mk();
    await s.start();
    await until(async () => (await s.observe()).screen.includes("$"));
    await s.input({ kind: "text", text: "for i in $(seq 1 60); do echo LINE_$i; done" });
    await s.input({ kind: "key", key: "ENTER" });
    await until(async () => (await s.observe()).screen.includes("LINE_60"));
    const capped = await s.observe({ maxLines: 10 });
    expect(capped.scrollbackTail.split("\n").length).toBeLessThanOrEqual(10);
    expect(capped.scrollbackTail).not.toContain("LINE_1\n");
    const full = await s.observe({ maxLines: 200 });
    expect(full.scrollbackTail + "\n" + full.screen).toContain("LINE_1\n");
  });

  it("survives dispose: the tmux server keeps the session", async () => {
    const s = mk();
    await s.start();
    await until(async () => (await s.observe()).screen.includes("$"));
    await s.input({ kind: "text", text: "echo KEEP_ME" });
    await s.input({ kind: "key", key: "ENTER" });
    await until(async () => (await s.observe()).screen.includes("KEEP_ME"));
    const sock = sockets.at(-1)!;
    s.dispose();
    await new Promise((r) => setTimeout(r, 200));
    const captured = execFileSync("tmux", ["-S", sock, "capture-pane", "-p", "-t", "main"]).toString();
    expect(captured).toContain("KEEP_ME");
  });
});
