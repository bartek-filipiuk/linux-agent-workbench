import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SocketTerminalWorker } from "@law/agentd";
import { TerminalSession } from "../src/terminal-session.js";
import { WorkerServer } from "../src/server.js";

let server: WorkerServer | undefined;
let session: TerminalSession | undefined;
let tmuxSocket = "";

async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-ws-"));
  tmuxSocket = path.join(dir, "t.sock");
  session = new TerminalSession({ tmuxSocket, cwd: dir, cols: 80, rows: 24, env: { PS1: "$ ", TERM: "xterm-256color", PATH: process.env.PATH ?? "" } });
  await session.start();
  const sockPath = path.join(dir, "w.sock");
  server = new WorkerServer(sockPath, session);
  await server.listen();
  return sockPath;
}
const until = async (pred: () => Promise<boolean> | boolean, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("condition not met in time");
};
afterEach(async () => {
  await server?.close();
  session?.dispose();
  try { execFileSync("tmux", ["-S", tmuxSocket, "kill-server"], { stdio: "ignore" }); } catch {}
  server = undefined;
  session = undefined;
});

describe("WorkerServer", () => {
  it("serves observe/input/resize/health and streams pty bytes", async () => {
    const sock = await boot();
    const w = await SocketTerminalWorker.connect(sock);
    let streamed = "";
    w.onPtyData((b) => (streamed += new TextDecoder().decode(b)));
    await until(async () => (await w.observe({})).screen.includes("$"));
    await w.input({ kind: "text", text: "echo VIA_SOCKET" });
    await w.input({ kind: "key", key: "ENTER" });
    await until(async () => (await w.observe({})).screen.includes("VIA_SOCKET"));
    expect(streamed).toContain("VIA_SOCKET");
    await w.resize({ cols: 90, rows: 20 });
    await until(async () => (await w.observe({})).size.cols === 90);
    expect(await w.health()).toMatchObject({ ptyAlive: true, tmuxAlive: true });
    w.close();
  });

  it("accepts raw keystrokes (kind 2) from the human", async () => {
    const sock = await boot();
    const w = await SocketTerminalWorker.connect(sock);
    await until(async () => (await w.observe({})).screen.includes("$"));
    w.writeRaw(new TextEncoder().encode("echo RAW_KEYS\r"));
    await until(async () => (await w.observe({})).screen.includes("RAW_KEYS"));
    w.close();
  });

  it("replaces the previous client when a new one connects", async () => {
    const sock = await boot();
    const a = await SocketTerminalWorker.connect(sock);
    const aClosed = new Promise<void>((r) => a.onClose(r));
    const b = await SocketTerminalWorker.connect(sock);
    await aClosed;
    expect(server!.clients).toBe(1);
    expect((await b.observe({})).size.rows).toBe(24);
    b.close();
  });
});
