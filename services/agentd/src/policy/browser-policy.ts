import type { ApprovalCategory, BrowserAction, BrowserObservation } from "@law/protocol";
import type { ToolCall } from "../provider/types.js";
import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ApprovalManager } from "./approvals.js";
import type { Rule } from "./rules.js";

// ---- private / link-local addresses the model may never open (the human still can) ----

const PRIVATE_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/i;

function ipv4Private(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function ipv6Private(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return h === "::1" || h === "::" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("::ffff:127.") || h.startsWith("::ffff:10.");
}

export function isPrivateAddress(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return true;
  }
  return PRIVATE_HOSTS.test(host) || ipv4Private(host) || ipv6Private(host);
}

// ---- consequential actions by element name ----

export const BROWSER_RULES: Rule[] = [
  { id: "browser-send", category: "send", pattern: /\b(send|reply|tweet|post|comment|submit message)\b/i, summary: "send a message or post" },
  { id: "browser-publish", category: "publish", pattern: /\b(publish|share|deploy|release)\b/i, summary: "publish or share" },
  { id: "browser-purchase", category: "purchase", pattern: /\b(pay|buy|purchase|checkout|place order|subscribe|add to cart)\b/i, summary: "payment or purchase", noSession: true },
  { id: "browser-delete", category: "delete", pattern: /\b(delete|remove|unsubscribe|deactivate|close account)\b/i, summary: "delete or remove", noSession: true },
  { id: "browser-permission", category: "permission_change", pattern: /\b(grant|allow|authorize|revoke|approve)\b/i, summary: "permission change" },
];
export const DOMAIN_RULE: Rule = { id: "browser-domain", category: "external_side_effect", pattern: /./, summary: "open a new domain" };

export type BrowserClassification = { kind: "allow" } | { kind: "deny"; reason: string } | { kind: "approval"; rule: Rule; command: string };

function findElement(obs: BrowserObservation | undefined, ref: string) {
  return obs?.elements.find((e) => e.ref === ref);
}

export function classifyBrowserAction(action: BrowserAction, obs: BrowserObservation | undefined, opts: { allowPrivate?: boolean } = {}): BrowserClassification {
  if (action.kind === "navigate") {
    if (!opts.allowPrivate && isPrivateAddress(action.url)) return { kind: "deny", reason: "the model may not open private or local addresses" };
    return { kind: "allow" };
  }
  if (action.kind === "type") {
    const el = findElement(obs, action.ref);
    if (el?.role === "password") return { kind: "deny", reason: "the model must not type into password fields; ask the human (request_human)" };
    if (!action.submit) return { kind: "allow" };
  }
  if (action.kind === "click" || action.kind === "type") {
    const el = findElement(obs, action.ref);
    const label = `${el?.name ?? ""} ${el?.text ?? ""}`;
    for (const rule of BROWSER_RULES) {
      if (rule.pattern.test(label)) {
        return { kind: "approval", rule, command: `${action.kind} "${(el?.name || el?.text || action.ref).slice(0, 80)}" on ${obs?.url ?? "the page"}` };
      }
    }
  }
  return { kind: "allow" };
}

export type DomainMode = "open" | "ask";

export type BrowserPolicyDeps = {
  lastObservation: () => BrowserObservation | undefined;
  approvals: Pick<ApprovalManager, "request" | "isSessionAllowed">;
  domainMode?: () => DomainMode;
  allowPrivate?: boolean;
};

/** Policy for browser_act: secrets stay with the human, private networks are off limits, consequential clicks and new domains ask. */
export class BrowserActionPolicy implements Policy {
  private readonly seenHosts = new Set<string>();

  constructor(private readonly deps: BrowserPolicyDeps) {}

  async authorize(call: ToolCall, ctx: PolicyContext): Promise<PolicyDecision> {
    if (call.name !== "browser_act") return { allow: true };
    const action = (call.args as { action?: BrowserAction } | undefined)?.action;
    if (!action || typeof action !== "object" || !("kind" in action)) return { allow: true }; // the executor rejects malformed args
    const c = classifyBrowserAction(action, this.deps.lastObservation(), { allowPrivate: this.deps.allowPrivate ?? false });
    if (c.kind === "deny") return { allow: false, code: "POLICY_DENIED", reason: c.reason };
    if (action.kind === "navigate" && (this.deps.domainMode?.() ?? "open") === "ask") {
      const host = new URL(action.url.includes("://") ? action.url : `https://${action.url}`).hostname;
      if (!this.seenHosts.has(host)) {
        if (!this.deps.approvals.isSessionAllowed(ctx.runId, DOMAIN_RULE.id)) {
          const outcome = await this.deps.approvals.request({ runId: ctx.runId, command: `open ${host}`, rule: DOMAIN_RULE });
          if (outcome === "deny") return { allow: false, code: "POLICY_DENIED", reason: `the human declined opening ${host}` };
        }
        this.seenHosts.add(host);
      }
    }
    if (c.kind === "approval") {
      if (!c.rule.noSession && this.deps.approvals.isSessionAllowed(ctx.runId, c.rule.id)) return { allow: true };
      const outcome = await this.deps.approvals.request({ runId: ctx.runId, command: c.command, rule: c.rule });
      if (outcome === "deny") return { allow: false, code: "POLICY_DENIED", reason: `the human declined: ${c.rule.summary}` };
    }
    return { allow: true };
  }
}
