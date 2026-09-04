# T1 Milestone 2 — Terminal worker, container image, live xterm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The user picks a workspace directory, agentd starts a rootless Podman container from a pinned image, connects to the terminal worker inside it over a Unix socket, and the Electron window shows a live xterm.js terminal in which the user types into a tmux-backed shell. Closing and reopening the app reconnects to the same tmux session.

**Architecture:** `@law/terminal-worker` (runs inside the container) owns a node-pty → tmux session, mirrors output into an `@xterm/headless` screen model, and serves `terminal.*` requests plus raw PTY frames over `FramedConnection`. `@law/agentd` gains `PodmanRuntime` (fixed argument arrays, validated ids) and `TerminalSessionManager` (start/reconnect/stop, PTY fan-out to Electron). `@law/desktop` gains a workspace picker, an xterm.js panel wired to the worker via preload → main → MessagePort → agentd, and a network badge. No model calls yet; the human owns the terminal for the whole milestone.

**Tech Stack:** additions: `node-pty` 1.1.0, `@xterm/headless` 6.0.0 (worker), `@xterm/xterm` 6.0.0 + `@xterm/addon-fit` 0.11.0 (renderer), Podman 3.4.4 rootless, Ubuntu 24.04 base image, Node 24.20.0 tarball (sha256 `2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2`).

**Spec:** `docs/superpowers/specs/2026-09-04-terminal-stage-design.md` sections 3.4, 4.1, 5, 9 (terminal parts), 11 (container tests).

## Global Constraints

- Everything from the M1 plan's Global Constraints still applies (Node 24 via nvm, no AI footer in commits, key never leaves agentd, control chars as JS escapes in snippets).
- Verified on this host: `podman run --userns=keep-id --cap-drop=ALL --security-opt=no-new-privileges --read-only --tmpfs ... --volume $XDG_RUNTIME_DIR/x:/run/law --volume named:/data --network slirp4netns ubuntu:24.04` works; inside, uid is 1000 (`ubuntu`), `/run/law` is writable and files appear on the host as the user, root fs is read-only, DNS resolves, env has no `OPENAI_*`.
- Verified on this host: `node-pty@1.1.0` compiles under Node 24 (`pty.node`), `tmux -S <sock> new-session -A -s main` under node-pty keeps the server alive after the PTY client is killed, `@xterm/headless` is CommonJS (`import xterm from "@xterm/headless"; const { Terminal } = xterm;`).
- `sessionId = sha256(realpath(workspacePath)).slice(0, 16)`; container name `law-terminal-<sessionId>`; runtime dir `$XDG_RUNTIME_DIR/linux-agent-workbench/<sessionId>` mode 0700; socket `worker.sock` inside it, mounted at `/run/law` in the container.
- Image reference used at runtime is the local image **ID** recorded in `images/terminal/image.json` by `scripts/build-image.sh`; agentd never runs a floating tag.
- Every `podman` invocation is `execFile("podman", [...fixedArgs])` with a validated `sessionId` (`/^[a-f0-9]{16}$/`) and a validated absolute workspace path; no shell, no string interpolation of model output.
- Container workdir `/workspace`; home `/home/agent` is tmpfs; `~/.claude` and `~/.codex` are named volumes `law-auth-claude`, `law-auth-codex`.
- Worker message types on the wire (unchanged from M1): `terminal.observe`, `terminal.input`, `terminal.interrupt`, `terminal.resize`, `worker.health`, `worker.cancel`; raw frames kind 1 (PTY out), kind 2 (keys in).
- Stop of the app does **not** stop the container. Only "Destroy sandbox" runs `podman rm -f`.

---

## File structure

```
.containerignore                                   keep node_modules/.git/apps out of the build context
scripts/build-image.sh                             builds protocol+worker, podman build, writes images/terminal/image.json
images/terminal/Containerfile
images/terminal/opt-package.json                   deps installed inside the image: node-pty, @xterm/headless
images/terminal/bash.bashrc                        appended to /etc/bash.bashrc (prompt only; gate hook comes in M4)
images/terminal/image.json                         { "tag": "<git sha>", "id": "<podman image id>" } (committed pin)
services/terminal-worker/
  package.json                                     deps node-pty, @xterm/headless; build tsc
  src/terminal-session.ts                          TerminalSession: pty+tmux+headless screen, observe/input/resize
  src/server.ts                                    WorkerServer: FramedConnection handlers on a Unix socket
  src/main.ts                                      entry inside the container
  test/terminal-session.test.ts                    real tmux + node-pty on the host
  test/server.test.ts                              WorkerServer <-> SocketTerminalWorker over a tmp socket
services/agentd/src/
  runtime/podman.ts                                sessionIdFor, validateWorkspacePath, buildRunArgs, PodmanRuntime
  session/terminal-session-manager.ts              start/reconnect/stop/write/resize, emits data + state
  ipc.ts                                           extended MainToAgentd / AgentdToMain schemas
  main.ts                                          Daemon: routes port messages to store + session manager
  test/podman.test.ts                              arg building, id/path validation, state machine with fake exec
  test/terminal-session-manager.test.ts            with FakeWorker + fake runtime
tests/container/terminal-container.test.ts         real Podman, skipped unless LAW_CONTAINER_TESTS=1
apps/desktop/src/
  main/index.ts                                    workspace dialog, settings.json, IPC routing, MessagePort bridge
  main/settings.ts                                 readSettings/writeSettings (lastWorkspace, networkMode)
  preload/index.ts                                 full window.workbench API
  renderer/App.tsx                                 top bar, TerminalPanel, bottom bar
  renderer/TerminalPanel.tsx                       xterm.js + fit addon, blue outline
  renderer/styles.css
  test/settings.test.ts
```

---

### Task 1: TerminalSession (node-pty + tmux + headless screen)

**Files:**
- Modify: `services/terminal-worker/package.json`
- Create: `services/terminal-worker/src/terminal-session.ts`, `services/terminal-worker/test/terminal-session.test.ts`
- Modify: `vitest.config.ts` (nothing needed; `services/**/test` already included)

**Interfaces:**
- Produces:
  ```ts
  type TerminalSessionOptions = { tmuxSocket: string; sessionName?: string; cols?: number; rows?: number; cwd?: string; env?: Record<string,string>; scrollback?: number }
  class TerminalSession {
    constructor(opts: TerminalSessionOptions)
    start(): Promise<void>                       // spawns tmux via node-pty, disables the tmux status line
    readonly revision: number                     // increments on every PTY output chunk
    readonly exited: boolean; readonly exitCode: number | undefined
    onData(cb: (bytes: Uint8Array) => void): () => void
    writeRaw(bytes: Uint8Array): void            // human keystrokes
    input(input: TerminalInput): Promise<TerminalInputResult>   // throws ProtocolError STALE_REVISION
    interrupt(): void                             // writes "\x03"
    resize(size: TerminalResize): void
    observe(input?: TerminalObserveInput): Promise<TerminalObservation>
    health(): WorkerHealth
    dispose(): void                               // kills the PTY client only; tmux server keeps running
  }
  ```
  `observe` flushes pending headless writes (`term.write("", cb)` barrier) before reading. `screen` is the viewport with trailing blank lines trimmed; `scrollbackTail` is up to `maxLines` (default 200, max 500) lines above the viewport.

- [ ] **Step 1: Package manifest**

`services/terminal-worker/package.json`:
```json
{
  "name": "@law/terminal-worker",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@law/protocol": "workspace:*",
    "@xterm/headless": "6.0.0",
    "node-pty": "1.1.0"
  }
}
```
Add `node-pty` to `onlyBuiltDependencies` in `pnpm-workspace.yaml`, then `pnpm install`. Confirm `ls node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/build/Release/pty.node` exists (if not: `pnpm rebuild node-pty`).

- [ ] **Step 2: Failing test**

`services/terminal-worker/test/terminal-session.test.ts`:
```ts
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
    const obs = await s.observe({ maxLines: 10 });
    expect(obs.scrollbackTail.split("\n").length).toBeLessThanOrEqual(10);
    expect(obs.scrollbackTail + obs.screen).toContain("LINE_1");
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
```

- [ ] **Step 3: Run to see it fail**

Run: `pnpm vitest run services/terminal-worker/test/terminal-session.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement**

`services/terminal-worker/src/terminal-session.ts`:
```ts
import { execFile } from "node:child_process";
import pty from "node-pty";
import xtermHeadless from "@xterm/headless";
import {
  KEY_BYTES,
  ProtocolError,
  type TerminalInput,
  type TerminalInputResult,
  type TerminalObservation,
  type TerminalObserveInput,
  type TerminalResize,
  type WorkerHealth,
} from "@law/protocol";

const { Terminal } = xtermHeadless;

export type TerminalSessionOptions = {
  tmuxSocket: string;
  sessionName?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
  scrollback?: number;
};

type Listener = (bytes: Uint8Array) => void;

export class TerminalSession {
  private proc: pty.IPty | undefined;
  private readonly term: InstanceType<typeof Terminal>;
  private readonly listeners = new Set<Listener>();
  private readonly startedAt = Date.now();
  private lastDataAt = Date.now();
  private cols: number;
  private rows: number;
  revision = 0;
  exited = false;
  exitCode: number | undefined;

  constructor(private readonly opts: TerminalSessionOptions) {
    this.cols = opts.cols ?? 120;
    this.rows = opts.rows ?? 36;
    this.term = new Terminal({ cols: this.cols, rows: this.rows, scrollback: opts.scrollback ?? 5000, allowProposedApi: true });
  }

  async start(): Promise<void> {
    const name = this.opts.sessionName ?? "main";
    const args = ["-S", this.opts.tmuxSocket, "-f", "/dev/null", "new-session", "-A", "-s", name];
    if (this.opts.cwd) args.push("-c", this.opts.cwd);
    this.proc = pty.spawn("tmux", args, {
      name: "xterm-256color",
      cols: this.cols,
      rows: this.rows,
      ...(this.opts.cwd ? { cwd: this.opts.cwd } : {}),
      env: { ...(this.opts.env ?? (process.env as Record<string, string>)), TERM: "xterm-256color" },
    });
    this.proc.onData((data) => {
      this.lastDataAt = Date.now();
      this.revision++;
      this.term.write(data);
      const bytes = new TextEncoder().encode(data);
      for (const l of this.listeners) l(bytes);
    });
    this.proc.onExit(({ exitCode }) => {
      this.exited = true;
      this.exitCode = exitCode;
      this.revision++;
    });
    // ponytail: status line off so the model never reads tmux chrome as program output
    await new Promise<void>((resolve) =>
      execFile("tmux", ["-S", this.opts.tmuxSocket, "set-option", "-g", "status", "off"], () => resolve()),
    );
  }

  onData(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }

  writeRaw(bytes: Uint8Array): void {
    this.proc?.write(Buffer.from(bytes).toString("utf8"));
  }

  async input(input: TerminalInput): Promise<TerminalInputResult> {
    if (input.kind === "text" && input.expectedRevision !== undefined && input.expectedRevision !== this.revision) {
      throw new ProtocolError("STALE_REVISION", `expected revision ${input.expectedRevision}, current ${this.revision}`);
    }
    if (input.kind === "key") this.proc?.write(KEY_BYTES[input.key]);
    else if (input.kind === "paste") this.proc?.write(`\x1b[200~${input.text}\x1b[201~`);
    else this.proc?.write(input.text);
    return { revision: this.revision };
  }

  interrupt(): void {
    this.proc?.write("\x03");
  }

  resize(size: TerminalResize): void {
    this.cols = size.cols;
    this.rows = size.rows;
    this.proc?.resize(size.cols, size.rows);
    this.term.resize(size.cols, size.rows);
    this.revision++;
  }

  async observe(input: TerminalObserveInput = {}): Promise<TerminalObservation> {
    await new Promise<void>((resolve) => this.term.write("", resolve));
    const buf = this.term.buffer.active;
    const maxLines = input.maxLines ?? 200;
    const lines: string[] = [];
    for (let y = 0; y < this.term.rows; y++) lines.push(buf.getLine(buf.baseY + y)?.translateToString(true) ?? "");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const tail: string[] = [];
    for (let y = Math.max(0, buf.baseY - maxLines); y < buf.baseY; y++) tail.push(buf.getLine(y)?.translateToString(true) ?? "");
    return {
      revision: this.revision,
      screen: lines.join("\n"),
      scrollbackTail: tail.join("\n"),
      cursor: { row: buf.cursorY, col: buf.cursorX },
      size: { rows: this.term.rows, cols: this.term.cols },
      idleMs: Date.now() - this.lastDataAt,
      exited: this.exited,
      ...(this.exitCode !== undefined ? { exitCode: this.exitCode } : {}),
    };
  }

  health(): WorkerHealth {
    return {
      uptimeMs: Date.now() - this.startedAt,
      ptyAlive: this.proc !== undefined && !this.exited,
      tmuxAlive: !this.exited,
      bufferBytes: 0,
      droppedBytes: 0,
    };
  }

  dispose(): void {
    // Kill only the tmux client attached to our PTY; the tmux server (and the shell) live on.
    this.proc?.kill();
    this.proc = undefined;
  }
}
```

- [ ] **Step 5: Run to see it pass**

Run: `pnpm vitest run services/terminal-worker/test/terminal-session.test.ts && pnpm --filter @law/terminal-worker typecheck`
Expected: 6 passed. If `translateToString` for the viewport returns tmux's own status text, the `set-option status off` did not apply in time: move that `execFile` before the first `observe` in tests by awaiting `start()` (already done) or pass `-f /dev/null` plus `set-option` via `tmux new-session ... \; set-option -g status off` in the same command (`args.push(";", "set-option", "-g", "status", "off")`).

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml services/terminal-worker && git commit -m "Add TerminalSession over node-pty, tmux and a headless xterm screen"
```

---

### Task 2: WorkerServer and container entry point

**Files:**
- Create: `services/terminal-worker/src/server.ts`, `services/terminal-worker/src/main.ts`, `services/terminal-worker/test/server.test.ts`

**Interfaces:**
- Produces:
  ```ts
  class WorkerServer {
    constructor(socketPath: string, session: TerminalSession)
    listen(): Promise<void>          // unlinks a stale socket first, chmod 0600
    close(): Promise<void>
    readonly clients: number
  }
  ```
  One client at a time: a new connection closes the previous one. PTY bytes → kind 1 frames to the current client. Kind 2 frames → `session.writeRaw`. Requests map 1:1 to `TerminalSession` methods; `worker.cancel` is a no-op notification in M2.

- [ ] **Step 1: Failing test**

`services/terminal-worker/test/server.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/terminal-worker/test/server.test.ts`
Expected: FAIL, `../src/server.js` not found.

- [ ] **Step 3: Implement**

`services/terminal-worker/src/server.ts`:
```ts
import fs from "node:fs";
import net from "node:net";
import { FramedConnection } from "@law/protocol/node";
import { ProtocolError, TerminalInput, TerminalObserveInput, TerminalResize, type Envelope } from "@law/protocol";
import type { TerminalSession } from "./terminal-session.js";

export class WorkerServer {
  private readonly server = net.createServer();
  private current: FramedConnection | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly socketPath: string,
    private readonly session: TerminalSession,
  ) {
    this.server.on("connection", (s) => this.accept(s));
  }

  get clients(): number {
    return this.current && !this.current.closed ? 1 : 0;
  }

  listen(): Promise<void> {
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.socketPath, () => {
        fs.chmodSync(this.socketPath, 0o600);
        resolve();
      });
    });
  }

  close(): Promise<void> {
    this.unsubscribe?.();
    this.current?.close();
    return new Promise((r) => this.server.close(() => r()));
  }

  private accept(socket: net.Socket): void {
    this.unsubscribe?.();
    this.current?.close();
    const conn = new FramedConnection(socket);
    this.current = conn;
    this.unsubscribe = this.session.onData((bytes) => conn.sendRaw(1, bytes));
    conn.on("keys", (bytes: Uint8Array) => this.session.writeRaw(bytes));
    conn.on("message", (env: Envelope) => void this.handle(conn, env));
  }

  private async handle(conn: FramedConnection, env: Envelope): Promise<void> {
    const id = env.id;
    if (!id) return; // notifications (worker.cancel) need no reply in M2
    try {
      switch (env.type) {
        case "terminal.observe":
          return conn.reply(id, { ok: true, payload: await this.session.observe(TerminalObserveInput.parse(env.payload)) });
        case "terminal.input":
          return conn.reply(id, { ok: true, payload: await this.session.input(TerminalInput.parse(env.payload)) });
        case "terminal.interrupt":
          this.session.interrupt();
          return conn.reply(id, { ok: true });
        case "terminal.resize":
          this.session.resize(TerminalResize.parse(env.payload));
          return conn.reply(id, { ok: true });
        case "worker.health":
          return conn.reply(id, { ok: true, payload: this.session.health() });
        default:
          return conn.reply(id, { ok: false, error: { code: "INVALID_INPUT", message: `unknown request ${env.type}` } });
      }
    } catch (e) {
      const err = ProtocolError.is(e) ? e.toJSON() : { code: "INVALID_INPUT" as const, message: e instanceof Error ? e.message : String(e) };
      conn.reply(id, { ok: false, error: err });
    }
  }
}
```

`services/terminal-worker/src/main.ts`:
```ts
// Runs inside the container. Serves /run/law/worker.sock; the tmux server outlives this process.
import path from "node:path";
import { TerminalSession } from "./terminal-session.js";
import { WorkerServer } from "./server.js";

const socketDir = process.env.LAW_SOCKET_DIR ?? "/run/law";
const tmuxSocket = process.env.LAW_TMUX_SOCKET ?? "/tmp/law-tmux.sock";
const cwd = process.env.LAW_WORKDIR ?? "/workspace";

const session = new TerminalSession({ tmuxSocket, cwd, cols: 120, rows: 36 });
const server = new WorkerServer(path.join(socketDir, "worker.sock"), session);

await session.start();
await server.listen();
console.log(`terminal-worker listening on ${path.join(socketDir, "worker.sock")}`);

const shutdown = () => {
  void server.close().finally(() => {
    session.dispose();
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

Add `"exports": { ".": "./dist/index.js" }` is not needed; `src/index.ts` can re-export for tests:
```ts
export { TerminalSession } from "./terminal-session.js";
export { WorkerServer } from "./server.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/terminal-worker && pnpm --filter @law/terminal-worker typecheck && pnpm --filter @law/terminal-worker build && ls services/terminal-worker/dist/main.js`
Expected: 9 passed; build emits `dist/main.js`. For the `@law/agentd` import in the test, the vitest alias already points at agentd `src/index.ts`; if the alias misses `SocketTerminalWorker`, confirm it is exported from `services/agentd/src/index.ts` (it is, from M1 Task 7).

- [ ] **Step 5: Commit**

```bash
git add services/terminal-worker && git commit -m "Add worker socket server and container entry point"
```

---

### Task 3: Container image and build script

**Files:**
- Create: `.containerignore`, `images/terminal/Containerfile`, `images/terminal/opt-package.json`, `images/terminal/bash.bashrc`, `scripts/build-image.sh`
- Modify: root `package.json` (script `images:build`)

**Interfaces:**
- Produces: `images/terminal/image.json` with `{ "tag": "<git short sha>", "id": "<image id>" }`, the image `localhost/law-terminal:<sha>` and `:latest`.

- [ ] **Step 1: Files**

`.containerignore`:
```
node_modules
**/node_modules
.git
apps
out
docs
tests
*.md
.env
```

`images/terminal/opt-package.json`:
```json
{
  "name": "law-worker-runtime",
  "private": true,
  "type": "module",
  "dependencies": {
    "@xterm/headless": "6.0.0",
    "node-pty": "1.1.0"
  }
}
```

`images/terminal/bash.bashrc`:
```bash
# Linux Agent Workbench terminal image.
# The policy gate (preexec hook) is added here in Milestone 4.
if [ -n "$PS1" ]; then
  PS1='\[\e[1;34m\]agent@law\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
  export HISTFILE=/tmp/.bash_history
fi
```

`images/terminal/Containerfile`:
```Dockerfile
FROM docker.io/library/ubuntu:24.04

ARG NODE_VERSION=24.20.0
ARG NODE_SHA256=2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2
ARG CLAUDE_CODE_VERSION=2.1.260
ARG CODEX_VERSION=0.153.2

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils tmux git ripgrep jq less nano python3 build-essential locales \
 && rm -rf /var/lib/apt/lists/* \
 && locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

RUN curl -fsSLo /tmp/node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
 && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
 && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
 && rm /tmp/node.tar.xz \
 && npm install -g --no-audit --no-fund "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" "@openai/codex@${CODEX_VERSION}"

# uid 1000 is "ubuntu" in the base image; rename it so paths match the spec.
RUN usermod -l agent -d /home/agent -m ubuntu && groupmod -n agent ubuntu

COPY images/terminal/opt-package.json /opt/law/package.json
RUN cd /opt/law && npm install --omit=dev --no-audit --no-fund
COPY packages/protocol/package.json /opt/law/node_modules/@law/protocol/package.json
COPY packages/protocol/dist /opt/law/node_modules/@law/protocol/dist
COPY services/terminal-worker/dist /opt/law/worker
COPY images/terminal/bash.bashrc /tmp/law.bashrc
RUN cat /tmp/law.bashrc >> /etc/bash.bashrc && rm /tmp/law.bashrc && chown -R root:root /opt/law

USER agent
WORKDIR /workspace
ENV HOME=/home/agent TERM=xterm-256color LAW_SOCKET_DIR=/run/law
# ponytail: bash loop as supervisor; the tmux server is a separate process and survives worker restarts
CMD ["bash", "-c", "while true; do node /opt/law/worker/main.js; echo 'terminal-worker exited, restarting in 1s'; sleep 1; done"]
```

`scripts/build-image.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm --filter @law/protocol build
pnpm --filter @law/terminal-worker build
SHA="$(git rev-parse --short HEAD)"
podman build -f images/terminal/Containerfile -t "localhost/law-terminal:${SHA}" -t localhost/law-terminal:latest .
ID="$(podman image inspect "localhost/law-terminal:${SHA}" --format '{{.Id}}')"
printf '{ "tag": "%s", "id": "%s" }\n' "$SHA" "$ID" > images/terminal/image.json
echo "image localhost/law-terminal:${SHA} id=${ID}"
```
`chmod +x scripts/build-image.sh`. Root `package.json` script: `"images:build": "bash scripts/build-image.sh"`.

- [ ] **Step 2: Build and smoke-test the image**

Run:
```bash
pnpm images:build 2>&1 | tail -5 && cat images/terminal/image.json
ID=$(node -p "require('./images/terminal/image.json').id")
podman run --rm --userns=keep-id --read-only --tmpfs /tmp --tmpfs /run --tmpfs /home/agent "$ID" bash -lc 'id; node -v; tmux -V; claude --version; codex --version; env | grep -ci "openai\|anthropic" || true; ls /opt/law/worker/main.js'
```
Expected: image.json has a 64-hex id; the run prints `uid=1000(agent)`, `v24.20.0`, `tmux 3.4`, a Claude Code version, a Codex version, `0`, and the worker path. The first build takes several minutes (apt + npm).

- [ ] **Step 3: Commit**

```bash
git add .containerignore images scripts package.json && git commit -m "Add terminal container image and build script"
```

---

### Task 4: PodmanRuntime in agentd

**Files:**
- Create: `services/agentd/src/runtime/podman.ts`, `services/agentd/test/podman.test.ts`
- Modify: `services/agentd/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  function sessionIdFor(workspacePath: string): string                 // sha256(path).slice(0,16)
  function validateWorkspacePath(p: string): string                    // realpath; throws ProtocolError INVALID_INPUT
  type RunSpec = { sessionId: string; workspacePath: string; runtimeDir: string; imageId: string; networkMode: NetworkMode }
  function buildRunArgs(spec: RunSpec): string[]
  type Exec = (args: string[]) => Promise<{ stdout: string; stderr: string }>
  class PodmanRuntime {
    constructor(exec?: Exec)
    containerName(sessionId: string): string
    state(sessionId: string): Promise<"running" | "stopped" | "missing">
    ensureRunning(spec: RunSpec): Promise<"reused" | "started">
    destroy(sessionId: string): Promise<void>
    logs(sessionId: string, tail?: number): Promise<string>
    imageExists(imageId: string): Promise<boolean>
  }
  ```

- [ ] **Step 1: Failing test**

`services/agentd/test/podman.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PodmanRuntime, buildRunArgs, sessionIdFor, validateWorkspacePath } from "../src/runtime/podman.js";
import { ProtocolError } from "@law/protocol";

const spec = {
  sessionId: "0123456789abcdef",
  workspacePath: "/home/u/proj",
  runtimeDir: "/run/user/1000/linux-agent-workbench/0123456789abcdef",
  imageId: "sha256:deadbeef",
  networkMode: "open" as const,
};

describe("sessionIdFor / validateWorkspacePath", () => {
  it("derives a stable 16-hex id", () => {
    expect(sessionIdFor("/a/b")).toMatch(/^[a-f0-9]{16}$/);
    expect(sessionIdFor("/a/b")).toBe(sessionIdFor("/a/b"));
    expect(sessionIdFor("/a/b")).not.toBe(sessionIdFor("/a/c"));
  });
  it("rejects relative, root, home root and non-directories", () => {
    for (const p of ["rel", "/", os.homedir(), "/definitely/missing/dir"]) {
      expect(() => validateWorkspacePath(p), p).toThrow(ProtocolError);
    }
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-v-")), "file");
    fs.writeFileSync(f, "x");
    expect(() => validateWorkspacePath(f)).toThrow(ProtocolError);
  });
  it("returns the realpath of a directory", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "law-v-"));
    expect(validateWorkspacePath(d)).toBe(fs.realpathSync(d));
  });
});

describe("buildRunArgs", () => {
  it("produces the hardened argument array", () => {
    const args = buildRunArgs(spec);
    expect(args.slice(0, 3)).toEqual(["run", "-d", "--rm"]);
    expect(args).toContain("--name");
    expect(args[args.indexOf("--name") + 1]).toBe("law-terminal-0123456789abcdef");
    for (const flag of ["--userns=keep-id", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--read-only", "--pids-limit=512"]) {
      expect(args).toContain(flag);
    }
    expect(args).toContain("/home/u/proj:/workspace:rw");
    expect(args).toContain(`${spec.runtimeDir}:/run/law:rw`);
    expect(args).toContain("law-auth-claude:/home/agent/.claude");
    expect(args[args.indexOf("--network") + 1]).toBe("slirp4netns");
    expect(args.at(-1)).toBe("sha256:deadbeef");
    expect(args.join(" ")).not.toMatch(/OPENAI|ANTHROPIC/);
  });
  it("uses --network none when requested and rejects bad ids", () => {
    expect(buildRunArgs({ ...spec, networkMode: "none" })).toContain("none");
    expect(() => buildRunArgs({ ...spec, sessionId: "../x" })).toThrow(ProtocolError);
    expect(() => buildRunArgs({ ...spec, workspacePath: "relative" })).toThrow(ProtocolError);
  });
});

describe("PodmanRuntime", () => {
  function fakeExec(states: Record<string, string>, calls: string[][]) {
    return async (args: string[]) => {
      calls.push(args);
      if (args[0] === "inspect") {
        const name = args.at(-1)!;
        if (!(name in states)) throw new Error("no such container");
        return { stdout: states[name]! + "\n", stderr: "" };
      }
      if (args[0] === "run") return { stdout: "cid\n", stderr: "" };
      if (args[0] === "rm") return { stdout: "", stderr: "" };
      if (args[0] === "logs") return { stdout: "log lines", stderr: "" };
      if (args[0] === "image") return { stdout: "", stderr: "" };
      throw new Error(`unexpected ${args.join(" ")}`);
    };
  }

  it("reports state and reuses a running container", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "running" }, calls));
    expect(await rt.state(spec.sessionId)).toBe("running");
    expect(await rt.ensureRunning(spec)).toBe("reused");
    expect(calls.some((c) => c[0] === "run")).toBe(false);
  });

  it("removes a stopped container and starts a fresh one", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "exited" }, calls));
    expect(await rt.ensureRunning(spec)).toBe("started");
    expect(calls.map((c) => c[0])).toEqual(["inspect", "rm", "run"]);
  });

  it("starts when missing and destroys idempotently", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({}, calls));
    expect(await rt.state(spec.sessionId)).toBe("missing");
    expect(await rt.ensureRunning(spec)).toBe("started");
    await rt.destroy(spec.sessionId);
    expect(calls.at(-1)).toEqual(["rm", "-f", "--ignore", "law-terminal-0123456789abcdef"]);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/podman.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`services/agentd/src/runtime/podman.ts`:
```ts
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProtocolError, type NetworkMode } from "@law/protocol";

export type Exec = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

export const defaultExec: Exec = (args) =>
  new Promise((resolve, reject) => {
    execFile("podman", args, { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`podman ${args[0]} failed: ${stderr.trim() || err.message}`));
      else resolve({ stdout, stderr });
    });
  });

const SESSION_ID = /^[a-f0-9]{16}$/;

export function sessionIdFor(workspacePath: string): string {
  return createHash("sha256").update(workspacePath).digest("hex").slice(0, 16);
}

export function validateWorkspacePath(p: string): string {
  if (!path.isAbsolute(p)) throw new ProtocolError("INVALID_INPUT", "workspace path must be absolute");
  let real: string;
  try {
    real = fs.realpathSync(p);
  } catch {
    throw new ProtocolError("INVALID_INPUT", `workspace does not exist: ${p}`);
  }
  if (!fs.statSync(real).isDirectory()) throw new ProtocolError("INVALID_INPUT", "workspace must be a directory");
  if (real === "/" || real === fs.realpathSync(os.homedir())) {
    throw new ProtocolError("INVALID_INPUT", "workspace cannot be / or the home directory");
  }
  return real;
}

export type RunSpec = {
  sessionId: string;
  workspacePath: string;
  runtimeDir: string;
  imageId: string;
  networkMode: NetworkMode;
};

export function containerName(sessionId: string): string {
  if (!SESSION_ID.test(sessionId)) throw new ProtocolError("INVALID_INPUT", "invalid session id");
  return `law-terminal-${sessionId}`;
}

export function buildRunArgs(spec: RunSpec): string[] {
  const name = containerName(spec.sessionId);
  if (!path.isAbsolute(spec.workspacePath) || !path.isAbsolute(spec.runtimeDir)) {
    throw new ProtocolError("INVALID_INPUT", "workspace and runtime dir must be absolute");
  }
  return [
    "run", "-d", "--rm",
    "--name", name,
    "--label", "law.app=1",
    "--label", `law.session=${spec.sessionId}`,
    "--userns=keep-id",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--read-only",
    "--pids-limit=512",
    "--memory=4g",
    "--cpus=4",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=1g",
    "--tmpfs", "/run:rw,nosuid,nodev,size=64m",
    "--tmpfs", "/home/agent:rw,nosuid,nodev,size=512m",
    "--volume", "law-auth-claude:/home/agent/.claude",
    "--volume", "law-auth-codex:/home/agent/.codex",
    "--volume", `${spec.workspacePath}:/workspace:rw`,
    "--volume", `${spec.runtimeDir}:/run/law:rw`,
    "--network", spec.networkMode === "none" ? "none" : "slirp4netns",
    "--env", "TERM=xterm-256color",
    "--env", "HOME=/home/agent",
    "--workdir", "/workspace",
    spec.imageId,
  ];
}

export class PodmanRuntime {
  constructor(private readonly exec: Exec = defaultExec) {}

  containerName(sessionId: string): string {
    return containerName(sessionId);
  }

  async state(sessionId: string): Promise<"running" | "stopped" | "missing"> {
    try {
      const { stdout } = await this.exec(["inspect", "--type", "container", "--format", "{{.State.Status}}", containerName(sessionId)]);
      return stdout.trim() === "running" ? "running" : "stopped";
    } catch {
      return "missing";
    }
  }

  async ensureRunning(spec: RunSpec): Promise<"reused" | "started"> {
    const state = await this.state(spec.sessionId);
    if (state === "running") return "reused";
    if (state === "stopped") await this.exec(["rm", "-f", "--ignore", containerName(spec.sessionId)]);
    await this.exec(buildRunArgs(spec));
    return "started";
  }

  async destroy(sessionId: string): Promise<void> {
    await this.exec(["rm", "-f", "--ignore", containerName(sessionId)]);
  }

  async logs(sessionId: string, tail = 50): Promise<string> {
    try {
      const { stdout, stderr } = await this.exec(["logs", "--tail", String(tail), containerName(sessionId)]);
      return (stdout + stderr).trim();
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  async imageExists(imageId: string): Promise<boolean> {
    try {
      await this.exec(["image", "exists", imageId]);
      return true;
    } catch {
      return false;
    }
  }
}
```

Add to `services/agentd/src/index.ts`:
```ts
export { PodmanRuntime, buildRunArgs, sessionIdFor, validateWorkspacePath, containerName } from "./runtime/podman.js";
export type { RunSpec, Exec } from "./runtime/podman.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd/test/podman.test.ts && pnpm --filter @law/agentd typecheck`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Add Podman runtime with hardened fixed argument arrays"
```

---

### Task 5: TerminalSessionManager

**Files:**
- Create: `services/agentd/src/session/terminal-session-manager.ts`, `services/agentd/test/terminal-session-manager.test.ts`
- Modify: `services/agentd/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  type SessionState = "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"
  type SessionStatus = { state: SessionState; sessionId?: string; workspacePath?: string; networkMode?: NetworkMode; message?: string }
  type ManagerDeps = {
    runtime: Pick<PodmanRuntime, "ensureRunning" | "destroy" | "state" | "logs" | "imageExists">
    runtimeRoot: string
    imageId: string
    connect?: (socketPath: string) => Promise<TerminalWorker>       // default SocketTerminalWorker.connect
    connectTimeoutMs?: number                                          // default 20_000
  }
  class TerminalSessionManager extends EventEmitter {
    constructor(deps: ManagerDeps)
    readonly status: SessionStatus
    readonly worker: TerminalWorker | undefined
    start(workspacePath: string, networkMode: NetworkMode): Promise<SessionStatus>
    write(bytes: Uint8Array): void
    resize(cols: number, rows: number): Promise<void>
    detach(): void                     // close socket only; container keeps running
    destroy(): Promise<void>           // detach + podman rm -f
    // events: "data" (Uint8Array), "status" (SessionStatus)
  }
  ```

- [ ] **Step 1: Failing test**

`services/agentd/test/terminal-session-manager.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { sessionIdFor } from "../src/runtime/podman.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
afterEach(async () => {
  await fw?.close();
  fw = undefined;
});

function fakeRuntime(opts: { onEnsure?: (dir: string) => Promise<void>; imageOk?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    ensureRunning: async (spec: { runtimeDir: string }) => {
      calls.push("ensureRunning");
      await opts.onEnsure?.(spec.runtimeDir);
      return "started" as const;
    },
    destroy: async () => void calls.push("destroy"),
    state: async () => "running" as const,
    logs: async () => "container log",
    imageExists: async () => opts.imageOk ?? true,
  };
}

describe("TerminalSessionManager", () => {
  it("starts a session, connects to the worker socket and forwards data both ways", async () => {
    const runtimeRoot = tmpDir("law-rt-");
    const workspace = tmpDir("law-ws-");
    const runtime = fakeRuntime({
      onEnsure: async (dir) => {
        fw = await FakeWorker.listen(path.join(dir, "worker.sock"));
      },
    });
    const m = new TerminalSessionManager({ runtime, runtimeRoot, imageId: "sha256:x", connect: (p) => SocketTerminalWorker.connect(p) });
    const statuses: string[] = [];
    m.on("status", (s) => statuses.push(s.state));
    const got = new Promise<string>((r) => m.on("data", (b: Uint8Array) => r(new TextDecoder().decode(b))));
    const status = await m.start(workspace, "open");
    expect(status.state).toBe("ready");
    expect(status.sessionId).toBe(sessionIdFor(fs.realpathSync(workspace)));
    expect(fs.statSync(path.join(runtimeRoot, status.sessionId!)).mode & 0o777).toBe(0o700);
    fw!.emitPty("hello from pty");
    expect(await got).toBe("hello from pty");
    m.write(new TextEncoder().encode("ls\r"));
    await expect.poll(() => fw!.screen).toContain("ls");
    await m.resize(100, 30);
    expect(fw!.received.some((e) => e.type === "terminal.resize")).toBe(true);
    expect(statuses).toEqual(["starting", "ready"]);
    m.detach();
    expect(m.status.state).toBe("disconnected");
    expect(runtime.calls).toEqual(["ensureRunning"]);
  });

  it("reports error with container logs when the socket never appears", async () => {
    const m = new TerminalSessionManager({ runtime: fakeRuntime(), runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x", connectTimeoutMs: 400 });
    const status = await m.start(tmpDir("law-ws-"), "open");
    expect(status.state).toBe("error");
    expect(status.message).toContain("container log");
  });

  it("refuses to start when the image is missing", async () => {
    const m = new TerminalSessionManager({ runtime: fakeRuntime({ imageOk: false }), runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x" });
    const status = await m.start(tmpDir("law-ws-"), "open");
    expect(status).toMatchObject({ state: "error" });
    expect(status.message).toMatch(/image/i);
  });

  it("rejects an invalid workspace without touching the runtime", async () => {
    const runtime = fakeRuntime();
    const m = new TerminalSessionManager({ runtime, runtimeRoot: tmpDir("law-rt-"), imageId: "sha256:x" });
    const status = await m.start("/", "open");
    expect(status.state).toBe("error");
    expect(runtime.calls).toEqual([]);
  });

  it("destroy detaches and removes the container", async () => {
    const runtimeRoot = tmpDir("law-rt-");
    const runtime = fakeRuntime({ onEnsure: async (dir) => { fw = await FakeWorker.listen(path.join(dir, "worker.sock")); } });
    const m = new TerminalSessionManager({ runtime, runtimeRoot, imageId: "sha256:x" });
    await m.start(tmpDir("law-ws-"), "none");
    await m.destroy();
    expect(m.status.state).toBe("stopped");
    expect(runtime.calls).toEqual(["ensureRunning", "destroy"]);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/terminal-session-manager.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`services/agentd/src/session/terminal-session-manager.ts`:
```ts
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { ProtocolError, type NetworkMode } from "@law/protocol";
import { sessionIdFor, validateWorkspacePath, type PodmanRuntime } from "../runtime/podman.js";
import { SocketTerminalWorker } from "../worker/socket-worker.js";
import type { TerminalWorker } from "../worker/types.js";

export type SessionState = "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error";

export type SessionStatus = {
  state: SessionState;
  sessionId?: string;
  workspacePath?: string;
  networkMode?: NetworkMode;
  message?: string;
};

export type ManagerDeps = {
  runtime: Pick<PodmanRuntime, "ensureRunning" | "destroy" | "state" | "logs" | "imageExists">;
  runtimeRoot: string;
  imageId: string;
  connect?: (socketPath: string) => Promise<TerminalWorker>;
  connectTimeoutMs?: number;
};

export class TerminalSessionManager extends EventEmitter {
  private _status: SessionStatus = { state: "idle" };
  private _worker: TerminalWorker | undefined;
  private unsubscribe: Array<() => void> = [];

  constructor(private readonly deps: ManagerDeps) {
    super();
  }

  get status(): SessionStatus {
    return this._status;
  }

  get worker(): TerminalWorker | undefined {
    return this._worker;
  }

  async start(workspacePath: string, networkMode: NetworkMode): Promise<SessionStatus> {
    let real: string;
    try {
      real = validateWorkspacePath(workspacePath);
    } catch (e) {
      return this.setStatus({ state: "error", workspacePath, networkMode, message: e instanceof Error ? e.message : String(e) });
    }
    const sessionId = sessionIdFor(real);
    const base = { sessionId, workspacePath: real, networkMode };
    this.detach();
    this.setStatus({ state: "starting", ...base });
    try {
      if (!(await this.deps.runtime.imageExists(this.deps.imageId))) {
        throw new ProtocolError("WORKER_UNAVAILABLE", `terminal image ${this.deps.imageId} not found; run pnpm images:build`);
      }
      const runtimeDir = path.join(this.deps.runtimeRoot, sessionId);
      fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
      fs.chmodSync(runtimeDir, 0o700);
      await this.deps.runtime.ensureRunning({ sessionId, workspacePath: real, runtimeDir, imageId: this.deps.imageId, networkMode });
      const worker = await this.waitForWorker(path.join(runtimeDir, "worker.sock"), sessionId);
      this._worker = worker;
      this.unsubscribe.push(worker.onPtyData((b) => this.emit("data", b)));
      this.unsubscribe.push(
        worker.onClose(() => {
          if (this._worker === worker) {
            this._worker = undefined;
            if (this._status.state === "ready") this.setStatus({ state: "disconnected", ...base, message: "worker connection closed" });
          }
        }),
      );
      return this.setStatus({ state: "ready", ...base });
    } catch (e) {
      return this.setStatus({ state: "error", ...base, message: e instanceof Error ? e.message : String(e) });
    }
  }

  write(bytes: Uint8Array): void {
    this._worker?.writeRaw(bytes);
  }

  async resize(cols: number, rows: number): Promise<void> {
    await this._worker?.resize({ cols, rows });
  }

  detach(): void {
    for (const u of this.unsubscribe.splice(0)) u();
    const w = this._worker;
    this._worker = undefined;
    w?.close();
    if (this._status.state === "ready") this.setStatus({ ...this._status, state: "disconnected" });
  }

  async destroy(): Promise<void> {
    const sessionId = this._status.sessionId;
    this.detach();
    if (sessionId) await this.deps.runtime.destroy(sessionId);
    this.setStatus({ ...this._status, state: "stopped" });
  }

  private async waitForWorker(socketPath: string, sessionId: string): Promise<TerminalWorker> {
    const connect = this.deps.connect ?? ((p: string) => SocketTerminalWorker.connect(p));
    const deadline = Date.now() + (this.deps.connectTimeoutMs ?? 20_000);
    let lastError = "";
    while (Date.now() < deadline) {
      if (fs.existsSync(socketPath)) {
        try {
          return await connect(socketPath);
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
      await sleep(250);
    }
    const logs = await this.deps.runtime.logs(sessionId);
    throw new ProtocolError("WORKER_UNAVAILABLE", `worker socket not ready (${lastError || "no socket"}); container logs:\n${logs}`);
  }

  private setStatus(s: SessionStatus): SessionStatus {
    this._status = s;
    this.emit("status", s);
    return s;
  }
}
```

Add to `services/agentd/src/index.ts`:
```ts
export { TerminalSessionManager } from "./session/terminal-session-manager.js";
export type { SessionState, SessionStatus, ManagerDeps } from "./session/terminal-session-manager.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd/test/terminal-session-manager.test.ts && pnpm --filter @law/agentd typecheck`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Add terminal session manager with reconnect and PTY fan-out"
```

---

### Task 6: agentd IPC extension and daemon loop

**Files:**
- Modify: `services/agentd/src/ipc.ts`, `services/agentd/src/main.ts`, `services/agentd/test/ipc.test.ts`

**Interfaces:**
- Produces (Zod, exported from `ipc.ts`):
  ```ts
  ConfigInit = { type:"config.init", apiKey, model, dbPath, imageId, runtimeRoot }
  SessionStart = { type:"session.start", workspacePath, networkMode }
  SessionStop  = { type:"session.stop", destroy: boolean }
  TerminalWrite = { type:"terminal.write", data: Uint8Array }
  TerminalResizeMsg = { type:"terminal.resize", cols, rows }
  MainToAgentd = union of the above
  AgentdReady (unchanged), AgentdError, SessionStateMsg = { type:"session.state", ...SessionStatus }, TerminalData = { type:"terminal.data", data: Uint8Array }
  class Daemon {
    constructor(deps: { openStore: (p: string) => Store; makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager; post: (msg: AgentdToMain) => void })
    handle(msg: unknown): Promise<void>
  }
  ```

- [ ] **Step 1: Failing test (extend ipc.test.ts)**

Append to `services/agentd/test/ipc.test.ts`:
```ts
import { Daemon } from "../src/ipc.js";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";
import path from "node:path";

describe("Daemon", () => {
  it("routes config.init, session.start, terminal.write and session.stop", async () => {
    const posted: unknown[] = [];
    let fw: FakeWorker | undefined;
    const runtimeRoot = tmpDir("law-rt-");
    const runtime = {
      ensureRunning: async (spec: { runtimeDir: string }) => { fw = await FakeWorker.listen(path.join(spec.runtimeDir, "worker.sock")); return "started" as const; },
      destroy: async () => {},
      state: async () => "running" as const,
      logs: async () => "",
      imageExists: async () => true,
    };
    const d = new Daemon({
      openStore: (p) => new Store(p),
      makeManager: (imageId, root) => new TerminalSessionManager({ runtime, runtimeRoot: root, imageId, connect: (p) => SocketTerminalWorker.connect(p) }),
      post: (m) => posted.push(m),
    });
    await d.handle({ type: "config.init", apiKey: "sk-x", model: "m", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot });
    expect(posted[0]).toMatchObject({ type: "agentd.ready" });
    await d.handle({ type: "session.start", workspacePath: tmpDir("law-ws-"), networkMode: "open" });
    expect(posted.map((p) => (p as { type: string }).type)).toEqual(["agentd.ready", "session.state", "session.state"]);
    expect(posted[2]).toMatchObject({ type: "session.state", state: "ready" });
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("pwd\r") });
    await expect.poll(() => fw!.screen).toContain("pwd");
    fw!.emitPty("OUT");
    await expect.poll(() => posted.some((p) => (p as { type: string }).type === "terminal.data")).toBe(true);
    await d.handle({ type: "session.stop", destroy: false });
    expect(posted.at(-1)).toMatchObject({ type: "session.state", state: "disconnected" });
    await d.handle({ type: "bogus" });
    expect(posted.at(-1)).toMatchObject({ type: "agentd.error" });
    await fw?.close();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/ipc.test.ts`
Expected: FAIL, `Daemon` not exported.

- [ ] **Step 3: Implement**

Replace `services/agentd/src/ipc.ts` with:
```ts
import { z } from "zod";
import { NetworkMode } from "@law/protocol";
import type { Store } from "./storage/store.js";
import type { SessionStatus, TerminalSessionManager } from "./session/terminal-session-manager.js";

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
  imageId: z.string().min(1),
  runtimeRoot: z.string().min(1),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

export const SessionStart = z.object({ type: z.literal("session.start"), workspacePath: z.string().min(1), networkMode: NetworkMode });
export const SessionStop = z.object({ type: z.literal("session.stop"), destroy: z.boolean() });
export const TerminalWrite = z.object({ type: z.literal("terminal.write"), data: z.instanceof(Uint8Array) });
export const TerminalResizeMsg = z.object({ type: z.literal("terminal.resize"), cols: z.number().int().min(20).max(500), rows: z.number().int().min(5).max(200) });

export const MainToAgentd = z.discriminatedUnion("type", [ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg]);
export type MainToAgentd = z.infer<typeof MainToAgentd>;

export const AgentdReady = z.object({
  type: z.literal("agentd.ready"),
  schemaVersion: z.number().int(),
  dbPath: z.string(),
  model: z.string(),
  interruptedRuns: z.number().int(),
});
export type AgentdReady = z.infer<typeof AgentdReady>;
export const AgentdError = z.object({ type: z.literal("agentd.error"), message: z.string() });
export type AgentdError = z.infer<typeof AgentdError>;
export type SessionStateMsg = { type: "session.state" } & SessionStatus;
export type TerminalData = { type: "terminal.data"; data: Uint8Array };
export type AgentdToMain = AgentdReady | AgentdError | SessionStateMsg | TerminalData;

export type AgentdRuntime = { store: Store; model: string; apiKey: string };

let runtime: AgentdRuntime | null = null;
export const getRuntime = (): AgentdRuntime | null => runtime;

export function handleConfigInit(msg: unknown, openStore: (dbPath: string) => Store): AgentdReady | AgentdError {
  const parsed = ConfigInit.safeParse(msg);
  if (!parsed.success) return { type: "agentd.error", message: "invalid config.init" };
  const { apiKey, model, dbPath } = parsed.data;
  try {
    const store = openStore(dbPath);
    const interruptedRuns = store.markInterruptedRuns("agentd_restart");
    runtime = { store, model, apiKey };
    return { type: "agentd.ready", schemaVersion: store.schemaVersion, dbPath, model, interruptedRuns };
  } catch (e) {
    return { type: "agentd.error", message: e instanceof Error ? e.message : String(e) };
  }
}

export type DaemonDeps = {
  openStore: (dbPath: string) => Store;
  makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager;
  post: (msg: AgentdToMain) => void;
};

export class Daemon {
  private manager: TerminalSessionManager | undefined;

  constructor(private readonly deps: DaemonDeps) {}

  async handle(raw: unknown): Promise<void> {
    const parsed = MainToAgentd.safeParse(raw);
    if (!parsed.success) {
      this.deps.post({ type: "agentd.error", message: `invalid message: ${parsed.error.issues[0]?.message ?? "unknown"}` });
      return;
    }
    const msg = parsed.data;
    switch (msg.type) {
      case "config.init": {
        const reply = handleConfigInit(msg, this.deps.openStore);
        if (reply.type === "agentd.ready") {
          this.manager = this.deps.makeManager(msg.imageId, msg.runtimeRoot);
          this.manager.on("data", (data: Uint8Array) => this.deps.post({ type: "terminal.data", data }));
          this.manager.on("status", (s: SessionStatus) => this.deps.post({ type: "session.state", ...s }));
        }
        this.deps.post(reply);
        return;
      }
      case "session.start":
        await this.requireManager().start(msg.workspacePath, msg.networkMode);
        return;
      case "session.stop":
        if (msg.destroy) await this.requireManager().destroy();
        else this.requireManager().detach();
        return;
      case "terminal.write":
        this.requireManager().write(msg.data);
        return;
      case "terminal.resize":
        await this.requireManager().resize(msg.cols, msg.rows);
        return;
    }
  }

  private requireManager(): TerminalSessionManager {
    if (!this.manager) throw new Error("agentd not initialised (config.init missing)");
    return this.manager;
  }
}
```

Update the existing first test in `ipc.test.ts` to pass `imageId: "sha256:x", runtimeRoot: "/tmp"` in the `config.init` object.

Replace `services/agentd/src/main.ts` with:
```ts
// Entry point for Electron utilityProcess. Receives a MessagePort from main, then routes messages through Daemon.
import { Store } from "./storage/store.js";
import { Daemon } from "./ipc.js";
import { PodmanRuntime } from "./runtime/podman.js";
import { TerminalSessionManager } from "./session/terminal-session-manager.js";

type Port = {
  on(ev: "message", cb: (e: { data: unknown }) => void): void;
  postMessage(m: unknown): void;
  start(): void;
};
type ParentPort = { once(event: "message", cb: (e: { data: unknown; ports: Port[] }) => void): void };

const parentPort = (process as unknown as { parentPort?: ParentPort }).parentPort;
if (!parentPort) {
  console.error("agentd: must run inside Electron utilityProcess");
  process.exit(2);
}

parentPort.once("message", (e) => {
  const port = e.ports[0];
  if (!port) {
    console.error("agentd: no MessagePort received");
    process.exit(2);
  }
  const daemon = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, runtimeRoot) => new TerminalSessionManager({ runtime: new PodmanRuntime(), runtimeRoot, imageId }),
    post: (m) => port.postMessage(m),
  });
  port.on("message", ({ data }) => {
    daemon.handle(data).catch((err) => port.postMessage({ type: "agentd.error", message: err instanceof Error ? err.message : String(err) }));
  });
  port.start();
});
```

Export from `services/agentd/src/index.ts`:
```ts
export { Daemon, MainToAgentd, ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg, AgentdReady, AgentdError } from "./ipc.js";
export type { AgentdToMain, SessionStateMsg, TerminalData, DaemonDeps } from "./ipc.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd && pnpm --filter @law/agentd typecheck && pnpm --filter @law/agentd build`
Expected: all agentd suites pass (ipc now 3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Route session and terminal messages through an agentd daemon"
```

---

### Task 7: Electron: workspace picker, xterm panel, settings

**Files:**
- Create: `apps/desktop/src/main/settings.ts`, `apps/desktop/test/settings.test.ts`, `apps/desktop/src/renderer/TerminalPanel.tsx`
- Modify: `apps/desktop/package.json`, `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/renderer/App.tsx`, `apps/desktop/src/renderer/styles.css`, root `package.json` (`typecheck` also builds agentd)

**Interfaces:**
- Produces `window.workbench`:
  ```ts
  getStatus(): Promise<AgentdStatus>
  getSession(): Promise<SessionStatus>
  selectWorkspace(): Promise<void>                     // opens dialog, starts session
  reopenLast(): Promise<void>
  setNetwork(mode: "open" | "none"): Promise<void>     // stored; applied on next start
  destroySandbox(): Promise<void>
  terminalWrite(data: string): void
  terminalResize(cols: number, rows: number): void
  onEvent(cb: (e: AgentdStatus) => void): () => void
  onSession(cb: (s: SessionStatus) => void): () => void
  onTerminalData(cb: (data: Uint8Array) => void): () => void
  ```
  Settings file `<userData>/settings.json`: `{ lastWorkspace?: string; networkMode: "open" | "none" }`.

- [ ] **Step 1: Failing test**

`apps/desktop/test/settings.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readSettings, writeSettings } from "../src/main/settings";

describe("settings", () => {
  it("defaults, round-trips and ignores garbage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-set-"));
    const file = path.join(dir, "settings.json");
    expect(readSettings(file)).toEqual({ networkMode: "open" });
    writeSettings(file, { lastWorkspace: "/x", networkMode: "none" });
    expect(readSettings(file)).toEqual({ lastWorkspace: "/x", networkMode: "none" });
    fs.writeFileSync(file, "{not json");
    expect(readSettings(file)).toEqual({ networkMode: "open" });
    fs.writeFileSync(file, JSON.stringify({ networkMode: "weird", lastWorkspace: 5 }));
    expect(readSettings(file)).toEqual({ networkMode: "open" });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run apps/desktop/test/settings.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`apps/desktop/src/main/settings.ts`:
```ts
import fs from "node:fs";

export type Settings = { lastWorkspace?: string; networkMode: "open" | "none" };

export function readSettings(file: string): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const networkMode = raw.networkMode === "none" ? "none" : "open";
    const lastWorkspace = typeof raw.lastWorkspace === "string" && raw.lastWorkspace ? raw.lastWorkspace : undefined;
    return { networkMode, ...(lastWorkspace ? { lastWorkspace } : {}) };
  } catch {
    return { networkMode: "open" };
  }
}

export function writeSettings(file: string, s: Settings): void {
  fs.writeFileSync(file, JSON.stringify(s, null, 2));
}
```

`apps/desktop/package.json`: add dependencies `"@xterm/xterm": "6.0.0"`, `"@xterm/addon-fit": "0.11.0"`, and devDependency `"@law/agentd": "workspace:*"` (types only). Run `pnpm install`.

Root `package.json`: `"typecheck": "pnpm --filter @law/protocol build && pnpm --filter @law/agentd build && pnpm -r --if-present typecheck"`.

`apps/desktop/src/main/index.ts` (full replacement):
```ts
import { app, BrowserWindow, dialog, ipcMain, MessageChannelMain, utilityProcess, type MessagePortMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentdToMain, MainToAgentd, SessionStatus } from "@law/agentd";
import { parseEnvFile } from "./env-file";
import { readSettings, writeSettings, type Settings } from "./settings";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };

let status: AgentdStatus = { type: "agentd.starting" };
let session: SessionStatus = { state: "idle" };
let win: BrowserWindow | null = null;
let port: MessagePortMain | null = null;
let settings: Settings = { networkMode: "open" };

const repoRoot = () => path.resolve(__dirname, "..", "..", "..", "..");
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function loadEnv(): Record<string, string> {
  for (const p of [path.join(app.getPath("userData"), ".env"), path.join(repoRoot(), ".env")]) {
    if (fs.existsSync(p)) return parseEnvFile(fs.readFileSync(p, "utf8"));
  }
  return {};
}

function xdg(name: "XDG_DATA_HOME" | "XDG_RUNTIME_DIR", fallback: string): string {
  return process.env[name] || fallback;
}
const dbPath = () => path.join(xdg("XDG_DATA_HOME", path.join(os.homedir(), ".local", "share")), "linux-agent-workbench", "state.sqlite");
const runtimeRoot = () => path.join(xdg("XDG_RUNTIME_DIR", path.join(os.tmpdir(), `law-${os.userInfo().uid}`)), "linux-agent-workbench");

function readImageId(): string | undefined {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(repoRoot(), "images", "terminal", "image.json"), "utf8")) as { id?: string };
    return j.id;
  } catch {
    return undefined;
  }
}

const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);
const toAgentd = (msg: MainToAgentd) => port?.postMessage(msg);

function onAgentd(msg: AgentdToMain) {
  switch (msg.type) {
    case "agentd.ready":
    case "agentd.error":
      status = msg;
      send("agentd:event", status);
      if (msg.type === "agentd.ready" && settings.lastWorkspace) {
        toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
      }
      return;
    case "session.state": {
      const { type: _t, ...rest } = msg;
      session = rest;
      send("session:state", session);
      return;
    }
    case "terminal.data":
      send("terminal:data", msg.data);
      return;
  }
}

function startAgentd() {
  const env = loadEnv();
  const apiKey = env.OPENAI_API_KEY ?? "";
  const model = env.OPENAI_MODEL ?? "gpt-5.6-sol";
  const imageId = readImageId();
  if (!apiKey) return onAgentd({ type: "agentd.error", message: "OPENAI_API_KEY missing in .env" });
  if (!imageId) return onAgentd({ type: "agentd.error", message: "images/terminal/image.json missing; run pnpm images:build" });
  const entry = path.join(repoRoot(), "services", "agentd", "dist", "main.js");
  const child = utilityProcess.fork(entry, [], { serviceName: "agentd", stdio: "inherit" });
  const { port1, port2 } = new MessageChannelMain();
  child.postMessage({ type: "port" }, [port1]);
  port = port2;
  port2.on("message", (e) => onAgentd(e.data as AgentdToMain));
  port2.start();
  fs.mkdirSync(runtimeRoot(), { recursive: true, mode: 0o700 });
  toAgentd({ type: "config.init", apiKey, model, dbPath: dbPath(), imageId, runtimeRoot: runtimeRoot() });
  child.on("exit", (code) => onAgentd({ type: "agentd.error", message: `agentd exited with code ${code}` }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0b0d10",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

ipcMain.handle("agentd:status", () => status);
ipcMain.handle("session:get", () => session);
ipcMain.handle("workspace:select", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Choose workspace" });
  const dir = r.filePaths[0];
  if (r.canceled || !dir) return;
  settings = { ...settings, lastWorkspace: dir };
  writeSettings(settingsFile(), settings);
  toAgentd({ type: "session.start", workspacePath: dir, networkMode: settings.networkMode });
});
ipcMain.handle("workspace:reopen", () => {
  if (settings.lastWorkspace) toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
});
ipcMain.handle("network:set", (_e, mode: unknown) => {
  settings = { ...settings, networkMode: mode === "none" ? "none" : "open" };
  writeSettings(settingsFile(), settings);
  return settings.networkMode;
});
ipcMain.handle("network:get", () => settings.networkMode);
ipcMain.handle("sandbox:destroy", () => toAgentd({ type: "session.stop", destroy: true }));
ipcMain.on("terminal:write", (_e, data: unknown) => {
  if (typeof data === "string" && data.length <= 65_536) toAgentd({ type: "terminal.write", data: new TextEncoder().encode(data) });
});
ipcMain.on("terminal:resize", (_e, cols: unknown, rows: unknown) => {
  if (Number.isInteger(cols) && Number.isInteger(rows)) toAgentd({ type: "terminal.resize", cols: cols as number, rows: rows as number });
});

app.whenReady().then(() => {
  settings = readSettings(settingsFile());
  createWindow();
  startAgentd();
});

app.on("window-all-closed", () => app.quit());
```

`apps/desktop/src/preload/index.ts`:
```ts
import { contextBridge, ipcRenderer } from "electron";

const on = <T,>(channel: string) => (cb: (payload: T) => void) => {
  const handler = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

const api = {
  getStatus: () => ipcRenderer.invoke("agentd:status"),
  getSession: () => ipcRenderer.invoke("session:get"),
  selectWorkspace: () => ipcRenderer.invoke("workspace:select"),
  reopenLast: () => ipcRenderer.invoke("workspace:reopen"),
  getNetwork: () => ipcRenderer.invoke("network:get"),
  setNetwork: (mode: "open" | "none") => ipcRenderer.invoke("network:set", mode),
  destroySandbox: () => ipcRenderer.invoke("sandbox:destroy"),
  terminalWrite: (data: string) => ipcRenderer.send("terminal:write", data),
  terminalResize: (cols: number, rows: number) => ipcRenderer.send("terminal:resize", cols, rows),
  onEvent: on<unknown>("agentd:event"),
  onSession: on<unknown>("session:state"),
  onTerminalData: on<Uint8Array>("terminal:data"),
};

contextBridge.exposeInMainWorld("workbench", api);
export type WorkbenchApi = typeof api;
```

`apps/desktop/src/renderer/TerminalPanel.tsx`:
```tsx
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function TerminalPanel({ owner }: { owner: "human" | "agent" }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
      fontSize: 14,
      scrollback: 5000,
      theme: { background: "#0b0d10", foreground: "#e6e8eb", cursor: "#3b82f6" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    window.workbench.terminalResize(term.cols, term.rows);

    const offData = window.workbench.onTerminalData((data) => term.write(data));
    const inputDisposable = term.onData((d) => window.workbench.terminalWrite(d));
    const ro = new ResizeObserver(() => {
      fit.fit();
      window.workbench.terminalResize(term.cols, term.rows);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      inputDisposable.dispose();
      offData();
      term.dispose();
    };
  }, []);

  return <div ref={host} className={`terminal ${owner}`} />;
}
```

`apps/desktop/src/renderer/App.tsx`:
```tsx
import { useEffect, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };
type SessionStatus = { state: "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"; sessionId?: string; workspacePath?: string; networkMode?: "open" | "none"; message?: string };

declare global {
  interface Window {
    workbench: {
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      onEvent(cb: (e: AgentdStatus) => void): () => void;
      onSession(cb: (s: SessionStatus) => void): () => void;
      onTerminalData(cb: (data: Uint8Array) => void): () => void;
    };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  const [session, setSession] = useState<SessionStatus>({ state: "idle" });
  const [network, setNetwork] = useState<"open" | "none">("open");

  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(setSession);
    void window.workbench.getNetwork().then(setNetwork);
    const offA = window.workbench.onEvent(setStatus);
    const offB = window.workbench.onSession(setSession);
    return () => {
      offA();
      offB();
    };
  }, []);

  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  const live = session.state === "ready";

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">LINUX AGENT WORKBENCH</span>
        <button className="btn" onClick={() => void window.workbench.selectWorkspace()}>Open workspace…</button>
        <span className="path" title={session.workspacePath}>{session.workspacePath ?? "no workspace"}</span>
        <span className={`badge net-${network}`} title="Container network for the next start">
          NET {network.toUpperCase()}
          <select value={network} onChange={(e) => void window.workbench.setNetwork(e.target.value as "open" | "none").then(setNetwork)}>
            <option value="open">open</option>
            <option value="none">none</option>
          </select>
        </span>
        <span className="spacer" />
        <span className="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state}`}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        <button className="btn danger" disabled={!session.sessionId} onClick={() => void window.workbench.destroySandbox()}>Destroy sandbox</button>
      </header>
      <main className="main">
        {live ? (
          <TerminalPanel owner="human" />
        ) : (
          <div className="empty">
            {session.state === "error" && <pre className="error">{session.message}</pre>}
            {session.state === "starting" && <p>Starting sandbox…</p>}
            {session.state === "disconnected" && (
              <p>
                Disconnected from the sandbox. <button className="btn" onClick={() => void window.workbench.reopenLast()}>Reconnect</button>
              </p>
            )}
            {(session.state === "idle" || session.state === "stopped") && <p>Open a workspace to start a sandboxed terminal.</p>}
          </div>
        )}
      </main>
      <footer className="bottombar">
        <span className="owner human">HUMAN controls the terminal</span>
        <span className="hint">Agent control arrives in Milestone 3.</span>
      </footer>
    </div>
  );
}
```

Append to `apps/desktop/src/renderer/styles.css`:
```css
html, body, #root { height: 100%; }
.shell { display: flex; flex-direction: column; height: 100%; }
.main { flex: 1; min-height: 0; padding: 12px 16px; display: flex; }
.terminal { flex: 1; min-height: 0; padding: 6px; border: 2px solid var(--human); border-radius: 6px; background: var(--bg); }
.terminal.agent { border-color: var(--agent); }
.terminal .xterm { height: 100%; }
.bottombar { display: flex; gap: 16px; align-items: center; padding: 8px 16px; background: var(--panel); border-top: 1px solid #1f242b; font-size: 12px; }
.owner.human { color: var(--human); font-weight: 700; }
.owner.agent { color: var(--agent); font-weight: 700; }
.hint { color: var(--muted); }
.btn { background: #1f242b; color: var(--fg); border: 1px solid #2a3139; border-radius: 4px; padding: 6px 10px; font: inherit; cursor: pointer; }
.btn:hover { background: #2a3139; }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn.danger { border-color: var(--agent); color: var(--agent); }
.path { color: var(--muted); max-width: 40ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spacer { flex: 1; }
.badge { display: inline-flex; gap: 6px; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge.net-open { background: rgba(255, 59, 59, 0.15); color: var(--agent); border: 1px solid var(--agent); }
.badge.net-none { background: #1f242b; color: var(--muted); border: 1px solid #2a3139; }
.badge select { background: transparent; color: inherit; border: none; font: inherit; }
.empty { margin: auto; color: var(--muted); text-align: center; }
.error { color: var(--agent); text-align: left; white-space: pre-wrap; max-width: 80ch; }
```

- [ ] **Step 4: Verify**

Run:
```bash
pnpm install && pnpm vitest run apps/desktop && pnpm typecheck && pnpm dev
```
Expected in the window: top bar with "Open workspace…". Click it, choose the repo directory. Within a few seconds the terminal panel appears with a blue outline and a prompt `agent@law:/workspace$`. Type `ls -al` and Enter: the repo listing shows. Type `echo KEEP_ME`. Close the window, run `pnpm dev` again: the terminal reappears with `KEEP_ME` still on screen (reconnect to the same tmux). `podman ps` shows `law-terminal-<id>`.

Proof to capture: a screenshot after `ls -al` and, after the restart, `podman exec law-terminal-<id> tmux -S /tmp/law-tmux.sock capture-pane -p | grep KEEP_ME`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add workspace picker and live xterm panel wired to the sandbox worker"
```

---

### Task 8: Container tests

**Files:**
- Create: `tests/container/terminal-container.test.ts`
- Modify: `vitest.config.ts` (include `tests/**/*.test.ts`), root `package.json` (script `test:container`)

- [ ] **Step 1: Test**

`tests/container/terminal-container.test.ts`:
```ts
import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PodmanRuntime, TerminalSessionManager, containerName } from "@law/agentd";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const imageJson = path.resolve(__dirname, "../../images/terminal/image.json");
const imageId = fs.existsSync(imageJson) ? (JSON.parse(fs.readFileSync(imageJson, "utf8")) as { id: string }).id : "";

const until = async (pred: () => Promise<boolean> | boolean, ms = 15_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("condition not met in time");
};

describe.skipIf(!enabled || !imageId)("terminal container", () => {
  const runtimeRoot = fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-ct-"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "law-ctws-"));
  const runtime = new PodmanRuntime();
  let manager: TerminalSessionManager;
  let sessionId = "";

  afterAll(async () => {
    await manager?.destroy();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  });

  it("starts, has no provider keys in env and only /workspace writable", async () => {
    manager = new TerminalSessionManager({ runtime, runtimeRoot, imageId });
    const status = await manager.start(workspace, "none");
    expect(status.state, status.message).toBe("ready");
    sessionId = status.sessionId!;
    const name = containerName(sessionId);
    const env = execFileSync("podman", ["exec", name, "env"]).toString();
    expect(env).not.toMatch(/OPENAI|ANTHROPIC/);
    expect(() => execFileSync("podman", ["exec", name, "touch", "/etc/x"], { stdio: "ignore" })).toThrow();
    execFileSync("podman", ["exec", name, "touch", "/workspace/ok"]);
    expect(fs.existsSync(path.join(workspace, "ok"))).toBe(true);
  });

  it("runs a command typed by the human and observes it", async () => {
    const w = manager.worker!;
    await until(async () => (await w.observe({})).screen.includes("$"));
    manager.write(new TextEncoder().encode("echo IN_CONTAINER_$((6*7))\r"));
    await until(async () => (await w.observe({})).screen.includes("IN_CONTAINER_42"));
  });

  it("survives a worker crash: tmux keeps the screen and reconnect works", async () => {
    const name = containerName(sessionId);
    manager.write(new TextEncoder().encode("echo KEEP_ME\r"));
    await until(async () => (await manager.worker!.observe({})).screen.includes("KEEP_ME"));
    execFileSync("podman", ["exec", name, "pkill", "-f", "worker/main.js"]);
    await until(() => manager.status.state === "disconnected", 10_000);
    const status = await manager.start(workspace, "none");
    expect(status.state, status.message).toBe("ready");
    await until(async () => (await manager.worker!.observe({})).screen.includes("KEEP_ME"));
  });
});
```

Add `"tests/**/*.test.ts"` to vitest `include` and a root script `"test:container": "LAW_CONTAINER_TESTS=1 vitest run tests/container"`.

- [ ] **Step 2: Run**

Run: `pnpm test` (container suite skipped) then `pnpm test:container`.
Expected: `pnpm test` all green with the container file reported as skipped; `pnpm test:container` 3 passed in under a minute. The `pkill` inside the container works because `procps` is part of ubuntu:24.04; if it is missing, add `procps` to the apt list in the Containerfile and rebuild.

- [ ] **Step 3: Commit**

```bash
git add tests vitest.config.ts package.json && git commit -m "Add Podman-backed container tests for the terminal sandbox"
```

---

### Task 9: Wrap-up

- [ ] **Step 1: Full verification**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm test:container`
Expected: all green.

- [ ] **Step 2: README update**

Add to `README.md` under Development:
````markdown
### Sandbox image

```bash
pnpm images:build        # builds localhost/law-terminal and pins its id in images/terminal/image.json
pnpm test:container      # Podman-backed tests (needs the image)
```

The app starts one container per workspace (`law-terminal-<id>`), keeps it running when the window closes, and reconnects to the same tmux session on the next start. "Destroy sandbox" removes it.
````

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "Document sandbox image build and container tests"
```

---

## Self-review notes

- Spec coverage for M2: §3.4 worker (Tasks 1–2), §4.1 wire messages (Task 2), §5 image and launch args (Tasks 3–4), §9 UI terminal/network badge/owner bar (Task 7), §11 container tests (Task 8). Deferred to M3/M4: agent lease, policy gate in bashrc, `terminal.restart`, screen regexes.
- Names shared across tasks: `TerminalSession`, `WorkerServer`, `PodmanRuntime`, `buildRunArgs`, `sessionIdFor`, `validateWorkspacePath`, `containerName`, `TerminalSessionManager`, `SessionStatus`, `Daemon`, `MainToAgentd`, `AgentdToMain`.
- `@law/agentd` is imported by terminal-worker tests and by desktop main (types only); runtime code never crosses that boundary in the other direction.
