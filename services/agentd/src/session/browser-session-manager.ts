import { EventEmitter } from "node:events";
import { spawn as nodeSpawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { FramedConnection } from "@law/protocol/node";
import {
  BrowserActResult,
  BrowserDownload,
  BrowserInfo,
  BrowserObservation,
  BrowserWaitResult,
  ProtocolError,
  decodeBrowserFrame,
  type BrowserAction,
  type BrowserInputEvent,
  type BrowserObserveInput,
  type BrowserWaitInput,
  type NetworkMode,
} from "@law/protocol";
import { z } from "zod";
import { browserContainerName, buildBrowserRunArgs, type PodmanRuntime } from "../runtime/podman.js";

export type BrowserState = "idle" | "starting" | "ready" | "stopped" | "error";
export type BrowserStatus = { state: BrowserState; url?: string; title?: string; message?: string };
export type BrowserFrame = { width: number; height: number; jpeg: Uint8Array };

/** Whatever runs the worker: a host process (B1) or a container (B2). The socket contract is the same. */
export type LaunchHandle = {
  alive(): boolean;
  detach(): Promise<void>;
  destroy(): Promise<void>;
  logs(): Promise<string>;
  /** Restart the worker process without touching its state store (container only). */
  restartWorker?(): Promise<void>;
};
export type BrowserLauncher = (ctx: { socketDir: string; socketPath: string }) => Promise<LaunchHandle>;

export type BrowserManagerDeps = {
  socketDir: string;
  launcher: BrowserLauncher;
  connectTimeoutMs?: number;
};

export function hostLauncher(opts: { workerEntry: string; profileDir: string; spawn?: typeof nodeSpawn }): BrowserLauncher {
  return async ({ socketPath }) => {
    fs.mkdirSync(opts.profileDir, { recursive: true, mode: 0o700 });
    const spawn = opts.spawn ?? nodeSpawn;
    const child = spawn(process.execPath, [opts.workerEntry], {
      // Inside an Electron utilityProcess execPath is Electron itself; ELECTRON_RUN_AS_NODE makes it behave as plain Node.
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ELECTRON_RUN_AS_NODE: "1", LAW_BROWSER_SOCKET: socketPath, LAW_BROWSER_PROFILE: opts.profileDir },
      stdio: ["ignore", "inherit", "inherit"],
    });
    let exited = false;
    child.on("exit", () => (exited = true));
    const kill = async () => {
      if (exited) return;
      child.kill("SIGTERM");
      await Promise.race([new Promise<void>((r) => child.once("exit", () => r())), sleep(5000)]);
      if (!exited) child.kill("SIGKILL");
    };
    return { alive: () => !exited, detach: kill, destroy: kill, logs: async () => "(host worker: see the agentd console)" };
  };
}

export function podmanLauncher(opts: {
  runtime: PodmanRuntime;
  sessionId: string;
  imageId: string;
  networkMode: NetworkMode;
  downloadsDir: string;
}): BrowserLauncher {
  return async ({ socketDir }) => {
    fs.mkdirSync(opts.downloadsDir, { recursive: true, mode: 0o700 });
    const name = browserContainerName(opts.sessionId);
    const result = await opts.runtime.ensureRunningWith(
      name,
      buildBrowserRunArgs({ sessionId: opts.sessionId, runtimeDir: socketDir, downloadsDir: opts.downloadsDir, imageId: opts.imageId, networkMode: opts.networkMode }),
    );
    console.error(`[agentd] browser container ${name}: ${result}`);
    let running = true;
    return {
      alive: () => running,
      // Detach keeps the container (and the profile session) for the next connection, like the terminal sandbox.
      detach: async () => {},
      destroy: async () => {
        running = false;
        await opts.runtime.destroyByName(name);
      },
      logs: () => opts.runtime.logsOf(name),
      // The supervisor loop in the image brings the worker back with a fresh socket file.
      restartWorker: () => opts.runtime.execIn(name, ["pkill", "-f", "worker/main.js"]),
    };
  };
}

export class BrowserSessionManager extends EventEmitter {
  private _status: BrowserStatus = { state: "idle" };
  private handle: LaunchHandle | undefined;
  private conn: FramedConnection | undefined;

  constructor(private readonly deps: BrowserManagerDeps) {
    super();
  }

  get status(): BrowserStatus {
    return this._status;
  }

  async start(): Promise<BrowserStatus> {
    if (this._status.state === "ready" || this._status.state === "starting") return this._status;
    this.setStatus({ state: "starting" });
    try {
      fs.mkdirSync(this.deps.socketDir, { recursive: true, mode: 0o700 });
      fs.chmodSync(this.deps.socketDir, 0o700);
      const socketPath = path.join(this.deps.socketDir, "browser.sock");
      // Never unlink a stale-looking socket here: a reused container's worker may still be listening on it.
      // A freshly started worker replaces its own socket file when it binds.
      if (!this.handle?.alive()) this.handle = await this.deps.launcher({ socketDir: this.deps.socketDir, socketPath });
      const conn = await this.waitForSocket(socketPath);
      this.conn = conn;
      conn.on("browser-frame", (bytes: Uint8Array) => this.emit("frame", decodeBrowserFrame(bytes)));
      conn.on("close", () => {
        if (this.conn === conn && this._status.state === "ready") this.setStatus({ state: "error", message: "browser worker connection closed" });
      });
      const info = BrowserInfo.parse(await conn.request("browser.info", {}));
      return this.setStatus({ state: "ready", url: info.url, title: info.title });
    } catch (e) {
      const logs = await this.handle?.logs().catch(() => "");
      await this.stop("error");
      return this.setStatus({ state: "error", message: `${e instanceof Error ? e.message : String(e)}${logs ? `\n${logs}` : ""}` });
    }
  }

  async navigate(url: string): Promise<BrowserInfo> {
    const info = BrowserInfo.parse(await this.requireConn().request("browser.navigate", { url }, { timeoutMs: 40_000 }));
    this.setStatus({ state: "ready", url: info.url, title: info.title });
    return info;
  }

  input(event: BrowserInputEvent): void {
    this.conn?.notify("browser.input", event);
  }

  async observe(input: BrowserObserveInput = {}, signal?: AbortSignal): Promise<BrowserObservation> {
    return BrowserObservation.parse(await this.requireConn().request("browser.observe", input, { timeoutMs: 30_000, ...(signal ? { signal } : {}) }));
  }

  async act(action: BrowserAction, signal?: AbortSignal): Promise<BrowserActResult> {
    const r = BrowserActResult.parse(await this.requireConn().request("browser.act", action, { timeoutMs: 45_000, ...(signal ? { signal } : {}) }));
    this.setStatus({ state: "ready", url: r.url, title: r.title });
    return r;
  }

  async wait(input: BrowserWaitInput, signal?: AbortSignal): Promise<BrowserWaitResult> {
    const timeoutMs = (input.timeoutMs ?? 15_000) + 5_000;
    return BrowserWaitResult.parse(await this.requireConn().request("browser.wait", input, { timeoutMs, ...(signal ? { signal } : {}) }));
  }

  async downloads(): Promise<BrowserDownload[]> {
    return z.object({ downloads: z.array(BrowserDownload) }).parse(await this.requireConn().request("browser.downloads", {})).downloads;
  }

  /** Close the connection; a container keeps running for the next start, a host process is stopped. */
  async stop(finalState: BrowserState = "stopped"): Promise<void> {
    const conn = this.conn;
    this.conn = undefined;
    conn?.close();
    await this.handle?.detach();
    if (finalState === "stopped") this.setStatus({ state: "stopped" });
  }

  /** Stop and remove the worker (container or process) for good. */
  async destroy(): Promise<void> {
    const conn = this.conn;
    this.conn = undefined;
    conn?.close();
    await this.handle?.destroy();
    this.handle = undefined;
    this.setStatus({ state: "stopped" });
  }

  private async waitForSocket(socketPath: string): Promise<FramedConnection> {
    const deadline = Date.now() + (this.deps.connectTimeoutMs ?? 30_000);
    const kickAt = Date.now() + 5_000;
    let kicked = false;
    while (Date.now() < deadline) {
      // A reused container whose socket file vanished (e.g. an older client unlinked it) needs a fresh worker.
      if (!kicked && Date.now() > kickAt && this.handle?.restartWorker) {
        kicked = true;
        console.error("[agentd] browser worker socket missing on a reused container; restarting the worker");
        await this.handle.restartWorker().catch(() => {});
      }
      if (fs.existsSync(socketPath)) {
        const conn = await new Promise<FramedConnection | null>((resolve) => {
          const s = net.createConnection(socketPath);
          s.once("error", () => resolve(null));
          s.once("connect", () => resolve(new FramedConnection(s)));
        });
        if (conn) return conn;
      }
      if (!this.handle?.alive()) throw new ProtocolError("WORKER_UNAVAILABLE", "browser worker exited before listening");
      await sleep(250);
    }
    throw new ProtocolError("WORKER_UNAVAILABLE", "browser worker socket not ready");
  }

  private requireConn(): FramedConnection {
    if (!this.conn) throw new ProtocolError("WORKER_UNAVAILABLE", "browser not started");
    return this.conn;
  }

  private setStatus(s: BrowserStatus): BrowserStatus {
    console.error(`[agentd] browser ${s.state}${s.message ? `: ${s.message}` : ""}`);
    this._status = s;
    this.emit("status", s);
    return s;
  }
}
