import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { dataDir } from "../paths.js";

export type CodexOptions = { binary?: string | undefined; home?: string | undefined };
export function codexHome(options: CodexOptions = {}): string {
  return path.resolve(options.home ?? path.join(dataDir(), "codex"));
}

/** nvm switches PATH when LAW selects Node 24; Codex may be installed under another Node version. */
export function codexBinary(options: CodexOptions = {}): string {
  if (options.binary) return options.binary;
  const executable = (file: string) => {
    try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; }
  };
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, "codex");
    if (path.isAbsolute(candidate) && executable(candidate)) return candidate;
  }
  const versions = path.join(process.env.NVM_DIR || path.join(os.homedir(), ".nvm"), "versions", "node");
  try {
    for (const version of fs.readdirSync(versions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
      const candidate = path.join(versions, version, "bin", "codex");
      if (executable(candidate)) return candidate;
    }
  } catch { /* no nvm installation */ }
  return "codex"; // spawn reports a useful installation/configuration error
}

/** Separate login/config from the user's coding agent; never forward API credentials. */
export function codexEnvironment(options: CodexOptions = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CODEX_HOME: codexHome(options) };
  for (const key of ["OPENAI_API_KEY", "OPENAI_BASE_URL", "CODEX_API_KEY", "CODEX_ACCESS_TOKEN", "CODEX_THREAD_ID", "CODEX_INTERNAL_ORIGINATOR_OVERRIDE"]) delete env[key];
  return env;
}

export const CODEX_AUTH_ARGS = ["-c", 'forced_login_method="chatgpt"', "-c", 'cli_auth_credentials_store="auto"'];
export function prepareCodexHome(options: CodexOptions = {}): string {
  const home = codexHome(options);
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  return home;
}

export type RpcMessage = { id?: number | string; method?: string; params?: any; result?: any; error?: { message: string; code?: number } };

/** The app-server wire format is newline-delimited JSON-RPC (without a jsonrpc field). */
export class CodexProcess {
  private readonly child: ChildProcessWithoutNullStreams;
  private buffer = "";
  private sequence = 0;
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>();
  private events: RpcMessage[] = [];
  private wake: (() => void) | undefined;
  private failure: Error | undefined;

  constructor(options: CodexOptions = {}) {
    const home = prepareCodexHome(options);
    const cwd = path.join(home, "operator");
    fs.mkdirSync(cwd, { recursive: true, mode: 0o700 });
    // All actual actions go through LAW's tool executor and policy gate.
    const disabled = ["shell_tool", "unified_exec", "shell_snapshot", "view_image", "apps", "plugins", "hooks", "multi_agent", "browser_use", "computer_use", "image_generation", "memories", "goals", "sleep_tool", "tool_suggest", "code_mode"];
    this.child = spawn(codexBinary(options), [
      ...CODEX_AUTH_ARGS, "-c", 'model_provider="openai"', "-c", 'web_search="disabled"',
      ...disabled.flatMap((name) => ["-c", `features.${name}=false`]),
      // Current models route dynamic tools through this runtime even with code_mode=false.
      // It must run to deliver item/tool/call; the actual host action tools stay disabled above.
      "-c", "features.code_mode_host=true",
      "app-server", "--listen", "stdio://",
    ], { cwd, env: codexEnvironment(options), stdio: "pipe" });
    // Do not forward app-server stderr: authentication internals do not belong in LAW diagnostics.
    this.child.stderr.resume();
    this.child.stdout.on("data", (chunk: Buffer) => this.read(chunk.toString("utf8")));
    this.child.stdout.setEncoding("utf8");
    this.child.stdin.on("error", () => this.fail(new Error("Codex app-server connection closed")));
    this.child.on("error", (error) => this.fail(new Error(`Cannot start Codex CLI: ${error.message}. Install Codex or set LAW_CODEX_BIN.`)));
    this.child.on("exit", (code, signal) => this.fail(new Error(`Codex app-server exited (${code ?? signal}). Check pnpm codex:status and your Codex CLI version.`)));
  }

  private read(chunk: string): void {
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer) > 16 * 1024 * 1024) return this.close(new Error("Codex app-server message exceeds 16 MiB"));
    let end: number;
    while ((end = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      if (!line.trim()) continue;
      let msg: RpcMessage;
      try {
        msg = JSON.parse(line) as RpcMessage;
        if (!msg || typeof msg !== "object") throw new Error();
      } catch { return this.close(new Error("Invalid JSON from Codex app-server")); }
      if (msg.method) {
        this.events.push(msg);
        this.wake?.();
      } else if (typeof msg.id === "number") {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) pending?.reject(new Error(`Codex: ${msg.error.message}`));
        else pending?.resolve(msg.result);
      }
    }
  }

  send(message: RpcMessage): void {
    if (this.failure) throw this.failure;
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method: string, params: unknown, signal: AbortSignal): Promise<any> {
    if (signal.aborted) return Promise.reject(signal.reason);
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const abort = () => { this.pending.delete(id); reject(signal.reason); };
      const cleanup = () => signal.removeEventListener("abort", abort);
      this.pending.set(id, { resolve: (value) => { cleanup(); resolve(value); }, reject: (error) => { cleanup(); reject(error); } });
      signal.addEventListener("abort", abort, { once: true });
      try { this.send({ id, method, params }); }
      catch (error) { this.pending.delete(id); cleanup(); reject(error); }
    });
  }

  async next(signal: AbortSignal): Promise<RpcMessage> {
    for (;;) {
      signal.throwIfAborted();
      if (this.failure) throw this.failure;
      const event = this.events.shift();
      if (event) return event;
      await new Promise<void>((resolve) => {
        const done = () => { signal.removeEventListener("abort", done); this.wake = undefined; resolve(); };
        this.wake = done;
        signal.addEventListener("abort", done, { once: true });
      });
    }
  }

  private fail(error: Error): void {
    this.failure ??= error;
    for (const pending of this.pending.values()) pending.reject(this.failure);
    this.pending.clear();
    this.wake?.();
  }

  close(error = new Error("Codex connection closed")): void {
    this.fail(error);
    this.events = [];
    this.child.stdin.end();
    this.child.kill("SIGTERM");
    const timer = setTimeout(() => this.child.kill("SIGKILL"), 2000);
    timer.unref();
    this.child.once("exit", () => clearTimeout(timer));
  }
}
