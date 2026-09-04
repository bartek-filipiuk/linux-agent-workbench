import { EventEmitter } from "node:events";
import type { NetworkMode } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { Lease } from "./lease.js";
import type { ApprovalManager } from "./approvals.js";
import { RULES, classify, type Bucket } from "./rules.js";

export type GateEvent = { command: string; bucket: Bucket; actor: "human" | "agent"; decision: "allow" | "deny"; ruleId?: string; reason?: string };

export class CommandGate extends EventEmitter {
  constructor(
    private readonly deps: {
      lease: Lease;
      approvals: ApprovalManager;
      store: Store;
      currentRunId: () => string | undefined;
      networkMode: () => NetworkMode;
    },
  ) {
    super();
  }

  async check(req: { command: string; cwd: string; pid: number }): Promise<{ decision: "allow" | "deny"; reason?: string }> {
    const actor = this.deps.lease.state.owner;
    const c = classify(req.command, { networkMode: this.deps.networkMode() });
    const runId = this.deps.currentRunId();
    const done = (decision: "allow" | "deny", reason?: string) => {
      const ev: GateEvent = { command: req.command, bucket: c.bucket, actor, decision, ...(c.ruleId ? { ruleId: c.ruleId } : {}), ...(reason ? { reason } : {}) };
      if (runId) this.deps.store.appendEvent(runId, "command.gate", { ...ev, cwd: req.cwd });
      this.emit("event", ev);
      return reason ? { decision, reason } : { decision };
    };
    if (actor === "human") return done("allow");
    switch (c.bucket) {
      case "auto":
      case "log":
        return done("allow");
      case "deny":
        return done("deny", `refused: ${c.summary ?? "policy"} (permission bypass flags are never allowed)`);
      case "approval": {
        const rule = RULES.find((r) => r.id === c.ruleId)!;
        if (!runId) return done("deny", "no active run to attach an approval to");
        if (this.deps.approvals.isSessionAllowed(runId, rule.id)) return done("allow");
        const outcome = await this.deps.approvals.request({ runId, command: req.command, rule });
        return outcome === "allow" ? done("allow") : done("deny", `denied by the human: ${rule.summary}`);
      }
    }
  }
}
