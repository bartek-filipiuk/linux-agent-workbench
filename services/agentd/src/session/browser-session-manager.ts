import { EventEmitter } from "node:events";
import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { FramedConnection } from "@law/protocol/node";
import { BrowserInfo, ProtocolError, decodeBrowserFrame, type BrowserInputEvent } from "@law/protocol";

export type BrowserState = "idle" | "starting" | "ready" | "stopped" | "error";
export type BrowserStatus = { state: BrowserState; url?: string; title?: string; message?: string };
export type BrowserFrame = { width: number; height: number; jpeg: Uint8Array };

export type BrowserManagerDeps = {
  runtimeRoot: string;
  profileDir: string;
  workerEntry: string;
  spawn?: typeof nodeSpawn;
  connectTimeoutMs?: number;
};

// B1: the worker is a host process. B2 swaps the spawn for a container start; the socket contract stays.
export class BrowserSessionManager extends EventEmitter {
  private _status: BrowserStatus = { state: "idle" };
  private child: ChildProcess | undefined;
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
      fs.mkdirSync(this.deps.runtimeRoot, { recursive: true, mode: 0o700 });
      fs.mkdirSync(this.deps.profileDir, { recursive: true, mode: 0o700 });
      const socketPath = path.join(this.deps.runtimeRoot, "browser.sock");
      try {
        fs.unlinkSync(socketPath);
      } catch {}
      const spawn = this.deps.spawn ?? nodeSpawn;
      const child = spawn(process.execPath, [this.deps.workerEntry], {
        env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LAW_BROWSER_SOCKET: socketPath, LAW_BROWSER_PROFILE: this.deps.profileDir },
        stdio: ["ignore", "inherit", "inherit"],
      });
      this.child = child;
      child.on("exit", (code) => {
        if (this.child === child) {
          this.child = undefined;
          if (this._status.state !== "stopped") this.setStatus({ state: "error", message: `browser worker exited with code ${code}` });
        }
      });
      const conn = await this.waitForSocket(socketPath);
      this.conn = conn;
      conn.on("browser-frame", (bytes: Uint8Array) => this.emit("frame", decodeBrowserFrame(bytes)));
      conn.on("close", () => {
        if (this.conn === conn && this._status.state === "ready") this.setStatus({ state: "error", message: "browser worker connection closed" });
      });
      const info = BrowserInfo.parse(await conn.request("browser.info", {}));
      return this.setStatus({ state: "ready", url: info.url, title: info.title });
    } catch (e) {
      await this.stop("error");
      return this.setStatus({ state: "error", message: e instanceof Error ? e.message : String(e) });
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

  async stop(finalState: BrowserState = "stopped"): Promise<void> {
    const conn = this.conn;
    const child = this.child;
    this.conn = undefined;
    this.child = undefined;
    conn?.close();
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      const gone = new Promise<void>((r) => child.once("exit", () => r()));
      await Promise.race([gone, sleep(5000)]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    if (finalState === "stopped") this.setStatus({ state: "stopped" });
  }

  private async waitForSocket(socketPath: string): Promise<FramedConnection> {
    const deadline = Date.now() + (this.deps.connectTimeoutMs ?? 30_000);
    while (Date.now() < deadline) {
      if (fs.existsSync(socketPath)) {
        const conn = await new Promise<FramedConnection | null>((resolve) => {
          const s = net.createConnection(socketPath);
          s.once("error", () => resolve(null));
          s.once("connect", () => resolve(new FramedConnection(s)));
        });
        if (conn) return conn;
      }
      if (!this.child) throw new ProtocolError("WORKER_UNAVAILABLE", "browser worker exited before listening");
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
