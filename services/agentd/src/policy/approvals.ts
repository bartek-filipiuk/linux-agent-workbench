import { EventEmitter } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import type { ApprovalDecision, ApprovalRequest } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { Rule } from "./rules.js";

export type ApprovalOutcome = "allow" | "deny";

type Pending = { request: ApprovalRequest; resolve: (o: ApprovalOutcome) => void; timer: NodeJS.Timeout; ruleId: string; runId: string };

export class ApprovalManager extends EventEmitter {
  private readonly pendingMap = new Map<string, Pending>();
  private readonly sessionAllowed = new Map<string, Set<string>>(); // runId -> ruleIds
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly store: Store,
    opts: { ttlMs?: number; now?: () => number } = {},
  ) {
    super();
    this.ttlMs = opts.ttlMs ?? 120_000;
    this.now = opts.now ?? Date.now;
  }

  get pending(): ApprovalRequest[] {
    return [...this.pendingMap.values()].map((p) => p.request);
  }

  isSessionAllowed(runId: string, ruleId: string): boolean {
    return this.sessionAllowed.get(runId)?.has(ruleId) ?? false;
  }

  request(input: { runId: string; command: string; rule: Rule }): Promise<ApprovalOutcome> {
    const id = randomUUID();
    const request: ApprovalRequest = {
      id,
      runId: input.runId,
      category: input.rule.category,
      command: input.command,
      commandHash: createHash("sha256").update(input.command).digest("hex"),
      ruleId: input.rule.id,
      summary: input.rule.summary,
      expiresAt: this.now() + this.ttlMs,
    };
    this.store.createApproval(request);
    this.store.appendEvent(input.runId, "approval.requested", { id, command: input.command, ruleId: input.rule.id, category: input.rule.category });
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.finish(id, "deny"), this.ttlMs);
      this.pendingMap.set(id, { request, resolve, timer, ruleId: input.rule.id, runId: input.runId });
      this.emit("request", request);
    });
  }

  decide(id: string, decision: ApprovalDecision): boolean {
    if (!this.pendingMap.has(id)) return false;
    this.finish(id, decision);
    return true;
  }

  private finish(id: string, decision: ApprovalDecision): void {
    const p = this.pendingMap.get(id);
    if (!p) return;
    this.pendingMap.delete(id);
    clearTimeout(p.timer);
    if (decision === "session") {
      const set = this.sessionAllowed.get(p.runId) ?? new Set<string>();
      set.add(p.ruleId);
      this.sessionAllowed.set(p.runId, set);
    }
    this.store.decideApproval(id, decision);
    this.store.appendEvent(p.runId, "approval.decided", { id, decision, ruleId: p.ruleId });
    this.emit("resolved", { id, decision });
    p.resolve(decision === "deny" ? "deny" : "allow");
  }
}
