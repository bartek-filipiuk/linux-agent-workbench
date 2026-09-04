import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
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
      const gitconfigPath = path.join(os.homedir(), ".gitconfig");
      const started = await this.deps.runtime.ensureRunning({
        sessionId,
        workspacePath: real,
        runtimeDir,
        imageId: this.deps.imageId,
        networkMode,
        ...(fs.existsSync(gitconfigPath) ? { gitconfigPath } : {}),
      });
      const outdated = started === "outdated";
      if (outdated) console.error("[agentd] sandbox container runs an older image; destroy the sandbox to upgrade it");
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
      return this.setStatus({ state: "ready", ...base, ...(outdated ? { message: "sandbox runs an older image; Destroy sandbox and reopen to upgrade" } : {}) });
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
    console.error(`[agentd] session ${s.state}${s.message ? `: ${s.message}` : ""}`);
    this._status = s;
    this.emit("status", s);
    return s;
  }
}
