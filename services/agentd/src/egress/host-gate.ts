// Decides, for the egress proxy, whether the sandbox may talk to a host. Mode "open" allows all;
// mode "ask" allows listed hosts and asks the human through an approval card for the rest while a
// run is active. Without a run the human is at the keyboard, so their own traffic is not questioned.
import type { ApprovalManager } from "../policy/approvals.js";
import type { DomainMode } from "../policy/browser-policy.js";
import type { HostAllowlist } from "../policy/host-allowlist.js";
import type { Rule } from "../policy/rules.js";
import type { EgressDecision } from "./proxy.js";

export const EGRESS_RULE: Rule = { id: "egress-host", category: "external_side_effect", pattern: /./, summary: "connect to a new host from the sandbox" };

export type HostGateDeps = {
  mode: () => DomainMode;
  allowlist: () => HostAllowlist | undefined;
  approvals: Pick<ApprovalManager, "request">;
  currentRunId: () => string | undefined;
};

export function makeEgressDecider(deps: HostGateDeps): (host: string, port: number) => Promise<EgressDecision> {
  const pending = new Map<string, Promise<EgressDecision>>(); // one card per host, however many sockets a page opens
  return async (host, port) => {
    if (deps.mode() !== "ask") return { allow: true };
    const list = deps.allowlist();
    const key = host.toLowerCase();
    if (list?.has(key)) return { allow: true };
    const runId = deps.currentRunId();
    if (!runId) return { allow: true };
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const p = deps.approvals
      .request({ runId, command: `connect to ${host}:${port} from the sandbox`, rule: EGRESS_RULE })
      .then((outcome): EgressDecision => {
        if (outcome === "deny") return { allow: false, reason: `the human declined ${host}` };
        list?.add(key, { persist: outcome === "session" });
        return { allow: true };
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
  };
}
