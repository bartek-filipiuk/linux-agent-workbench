# Autonomy pack — plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Spec:** `docs/superpowers/specs/2026-09-04-autonomy-design.md`. Order: A1, A5, A4, then A3 if time allows.

## Tasks

1. **A1 nested autonomy**: `rules.ts` moves `nested-bypass` to the approval rules; `classify(cmd, { networkMode, nestedAutonomy })` returns `log` for it when autonomy is on; `CommandGate` deps gain `nestedAutonomy: () => boolean`; `buildSystemPrompt({ nestedAutonomy })` appends the paragraph; IPC `policy.set { nestedAutonomy?, domainMode? }`; desktop settings + top-bar selects "Nested agents" and "Domains"; `.env` `LAW_BROWSER_DOMAIN_MODE` retired. Tests: rules, gate, prompt.
2. **A5 host gate**: `ApprovalOutcome` becomes `"once" | "session" | "deny"`; migration `003_host_allowlist.sql`; `Store.listAllowedHosts/addAllowedHost`; `policy/host-allowlist.ts`; `egress/host-gate.ts` (`makeEgressDecider`, `EGRESS_RULE`, coalescing per host); `SessionEgress.ensure(sessionId, mode, decide)`; Daemon wires allowlist per session, passes decide, and `BrowserActionPolicy` uses the shared allowlist. Tests: allowlist persistence, decider once/session/deny/no-run/coalesce, browser policy unchanged behaviour.
3. **A4 notifications**: `.env` `LAW_NTFY_URL`, `LAW_NTFY_REPLY_URL`, `LAW_NTFY_TOKEN` → `config.init.notify`; `notify/notifier.ts` (`publish`, `subscribeReplies`, fake fetch seam); Daemon hooks approvals/handoff/run end; TTL 10 min when configured. Tests with fake fetch and a scripted reply stream. README section.
4. **A3 tabs (optional)**: `SessionRegistry` + `Session`, `sessionId` on every message, tab strip in the renderer. Separate plan if not started in this session.
