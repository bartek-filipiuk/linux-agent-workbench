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
