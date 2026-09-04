// One egress proxy per sandbox session, listening where both containers mount /run/law.
import fs from "node:fs";
import path from "node:path";
import type { NetworkMode } from "@law/protocol";
import { EgressProxy, type EgressDecision, type EgressLogEntry } from "./proxy.js";

export type SessionEgressDeps = {
  runtimeRoot: string;
  log: (sessionId: string, entry: EgressLogEntry) => void;
  /** Host gate; absent = allow everything that is not private. */
  decide?: (host: string, port: number) => EgressDecision | Promise<EgressDecision>;
};

export function egressSocketPaths(runtimeRoot: string, sessionId: string): string[] {
  return [path.join(runtimeRoot, sessionId, "egress.sock"), path.join(runtimeRoot, sessionId, "browser", "egress.sock")];
}

export class SessionEgress {
  private proxy: EgressProxy | undefined;
  private sessionId: string | undefined;

  constructor(private readonly deps: SessionEgressDeps) {}

  get active(): boolean {
    return this.proxy !== undefined;
  }

  /** Mode "open": serve the session's sockets. Mode "none": serve nothing, so the forwarders fail fast. */
  async ensure(sessionId: string, networkMode: NetworkMode): Promise<void> {
    if (this.proxy && this.sessionId === sessionId) return;
    await this.close();
    for (const p of egressSocketPaths(this.deps.runtimeRoot, sessionId)) fs.rmSync(p, { force: true });
    if (networkMode !== "open") return;
    const proxy = new EgressProxy({
      decide: this.deps.decide ?? (() => ({ allow: true })),
      log: (e) => this.deps.log(sessionId, e),
    });
    for (const p of egressSocketPaths(this.deps.runtimeRoot, sessionId)) {
      fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
      await proxy.listen(p);
    }
    this.proxy = proxy;
    this.sessionId = sessionId;
  }

  async close(): Promise<void> {
    const proxy = this.proxy;
    this.proxy = undefined;
    this.sessionId = undefined;
    await proxy?.close();
  }
}
