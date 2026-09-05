import { execFile } from "node:child_process";
import pty from "node-pty";
import xtermHeadless from "@xterm/headless";
import {
  KEY_BYTES,
  ProtocolError,
  classifyScreen,
  type TerminalInput,
  type TerminalInputResult,
  type TerminalObservation,
  type TerminalObserveInput,
  type TerminalResize,
  type TerminalWaitInput,
  type TerminalWaitResult,
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
    // -u: UTF-8 regardless of the locale, otherwise tmux replaces box drawing and cursor glyphs with "_".
    const args = ["-u", "-S", this.opts.tmuxSocket, "-f", "/dev/null", "new-session", "-A", "-s", name];
    if (this.opts.cwd) args.push("-c", this.opts.cwd);
    // Chained into the same tmux command so it cannot race the server start:
    // status line off so the model never reads tmux chrome as program output.
    args.push(";", "set-option", "-g", "status", "off");
    this.proc = pty.spawn("tmux", args, {
      name: "xterm-256color",
      cols: this.cols,
      rows: this.rows,
      ...(this.opts.cwd ? { cwd: this.opts.cwd } : {}),
      env: { ...(this.opts.env ?? (process.env as Record<string, string>)), TERM: "xterm-256color" },
      // Raw bytes: no decode-then-re-encode per chunk on the hottest loop; xterm keeps UTF-8 decoder state itself.
      encoding: null,
    });
    this.proc.onData((data: string | Buffer) => {
      this.lastDataAt = Date.now();
      this.revision++;
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      this.term.write(bytes);
      for (const l of this.listeners) l(bytes);
    });
    this.proc.onExit(({ exitCode }) => {
      this.exited = true;
      this.exitCode = exitCode;
      this.revision++;
    });
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

  /** Ask tmux to repaint the whole screen for our client: a freshly (re)attached UI starts from a blank xterm. */
  refresh(): Promise<void> {
    return new Promise((resolve) => {
      execFile("tmux", ["-S", this.opts.tmuxSocket, "list-clients", "-F", "#{client_name}"], (err, stdout) => {
        const clients = err ? [] : stdout.split("\n").map((s) => s.trim()).filter(Boolean);
        if (clients.length === 0) return resolve();
        let left = clients.length;
        for (const c of clients) execFile("tmux", ["-S", this.opts.tmuxSocket, "refresh-client", "-t", c], () => --left === 0 && resolve());
      });
    });
  }

  async observe(input: TerminalObserveInput = {}): Promise<TerminalObservation> {
    await new Promise<void>((resolve) => this.term.write("", resolve));
    const buf = this.term.buffer.active;
    const maxLines = input.maxLines ?? 200;
    const lines: string[] = [];
    for (let y = 0; y < this.term.rows; y++) lines.push(buf.getLine(buf.baseY + y)?.translateToString(true) ?? "");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const screen = lines.join("\n");
    return {
      revision: this.revision,
      screen,
      hint: classifyScreen(screen),
      // History means a tmux capture-pane fork; only when asked for, never on wait() polls.
      ...(input.scrollback ? { scrollbackTail: await this.history(maxLines) } : {}),
      cursor: { row: buf.cursorY, col: buf.cursorX },
      size: { rows: this.term.rows, cols: this.term.cols },
      idleMs: Date.now() - this.lastDataAt,
      exited: this.exited,
      ...(this.exitCode !== undefined ? { exitCode: this.exitCode } : {}),
    };
  }

  // Resolve when the output has been quiet for idleMs, when `until` matches the screen, or on timeout.
  async wait(input: TerminalWaitInput = {}): Promise<TerminalWaitResult> {
    const idleMs = input.idleMs ?? 1500;
    const timeoutMs = input.timeoutMs ?? 60_000;
    const until = input.until ? new RegExp(input.until, "im") : undefined;
    const deadline = Date.now() + timeoutMs;
    const finish = async (obs: TerminalObservation, timedOut: boolean, matched: boolean): Promise<TerminalWaitResult> =>
      input.scrollback ? { ...(await this.observe({ scrollback: true })), timedOut, matched } : { ...obs, timedOut, matched };
    for (;;) {
      const obs = await this.observe();
      if (until && until.test(obs.screen)) return finish(obs, false, true);
      const quietFor = Date.now() - this.lastDataAt;
      if (!until && quietFor >= idleMs) return finish(obs, false, false);
      if (until && this.exited) return finish(obs, false, false);
      const now = Date.now();
      if (now >= deadline) return finish(obs, true, false);
      const next = Math.min(deadline - now, Math.max(50, idleMs - quietFor), 500);
      await new Promise((r) => setTimeout(r, next));
    }
  }

  // tmux keeps its own history and repaints the pane instead of scrolling the outer terminal,
  // so the headless scrollback is incomplete; ask tmux for the lines above the viewport.
  private history(maxLines: number): Promise<string> {
    const name = this.opts.sessionName ?? "main";
    return new Promise((resolve) =>
      execFile("tmux", ["-S", this.opts.tmuxSocket, "capture-pane", "-p", "-t", name, "-S", `-${maxLines}`, "-E", "-1"], (err, stdout) =>
        resolve(err ? "" : stdout.replace(/\n+$/, "")),
      ),
    );
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
