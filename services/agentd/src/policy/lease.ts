import { EventEmitter } from "node:events";
import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ToolCall } from "../provider/types.js";

export type LeaseOwner = "agent" | "human";
export type LeaseState = { owner: LeaseOwner; reason?: string; since: number };

export class Lease extends EventEmitter {
  private _state: LeaseState = { owner: "human", since: Date.now() };

  get state(): LeaseState {
    return this._state;
  }

  take(owner: LeaseOwner, reason?: string): LeaseState {
    if (this._state.owner === owner) return this._state;
    this._state = { owner, since: Date.now(), ...(reason ? { reason } : {}) };
    this.emit("change", this._state);
    return this._state;
  }
}

export type Surface = "terminal" | "browser";

export class LeasePolicy implements Policy {
  constructor(
    private readonly lease: Lease,
    private readonly surface: Surface = "terminal",
  ) {}

  async authorize(call: ToolCall, _ctx: PolicyContext): Promise<PolicyDecision> {
    const prefix = this.surface === "browser" ? "browser_" : "terminal_";
    if (!call.name.startsWith(prefix)) return { allow: true };
    if (this.lease.state.owner !== "agent") {
      return { allow: false, code: "LEASE_DENIED", reason: `the human holds the ${this.surface}; wait for control to be handed back` };
    }
    return { allow: true };
  }
}
