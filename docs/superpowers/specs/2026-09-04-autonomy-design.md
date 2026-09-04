# Autonomy pack — design

Date: 2026-09-04. After B6. Goal: the operator model pushes Claude Code / Codex work forward with
fewer stops, while the things that need a human reach the human wherever they are, and the risk
that autonomy opens (network reach from the sandbox) is closed by a host gate.

Items, in the order approved by the user: A1 nested agents without permission prompts, A5 host
gate for all sandbox traffic, A4 notifications with remote decisions, A3 (optional, last) several
projects side by side.

## A1 — Nested agents run without their own permission prompts

- The gate rule `nested-bypass` (`--dangerously-skip-permissions`, `--dangerously-bypass-approvals-and-sandbox`,
  `--yolo`) moves from `deny` to `approval` (category `permission_change`, "allow for this run"
  available). The container is the boundary: read-only root, `/workspace` only, egress through the
  proxy, capabilities dropped.
- Session setting `nestedAutonomy` (default **on**, persisted in `settings.json`, toggle in the top
  bar "Nested agents: autonomous | supervised"). When on, the system prompt tells the operator to
  start `claude` with `--dangerously-skip-permissions` and `codex` with
  `--dangerously-bypass-approvals-and-sandbox`, and the `nested-bypass` rule is treated as `log`.
  When off, the prompt says the opposite and the rule asks.
- `NestedPromptPolicy` is unchanged: a permission or password prompt that still appears hands off.
- Sent to agentd in `policy.set { nestedAutonomy?, domainMode? }`; the current values are applied to
  the next run (the prompt is built at run start) and to the gate immediately.

## A5 — Host gate on the egress proxy

- Domain mode `open | ask` (existing browser setting) now governs the egress proxy too, and moves
  from `.env` into `settings.json` with a top-bar dropdown "Domains: open | ask" (`policy.set`).
- `HostAllowlist` per session: in-memory set seeded from the store table `host_allowlist
  (workspace_id, host, added_at)`; `add(host, { persist })`, `has(host)`.
- Proxy `decide(host, port)`: mode `open` → allow. Mode `ask`: allowed if on the list; otherwise,
  when a run is active, `ApprovalManager.request({ runId, command: "connect to <host>:<port> from the
  sandbox", rule: EGRESS_RULE })` (`id: "egress-host"`, category `external_side_effect`);
  `once` → this connection only, `session` → added to the list and persisted, `deny` or timeout →
  403. When no run is active the human is driving: allow without persisting.
- Concurrent connections to one host share one pending approval (a page load opens dozens).
- `BrowserActionPolicy` uses the same `HostAllowlist` instead of its private `seenHosts`, so one
  answer covers the browser card and the proxy.
- Registrable-domain matching is not attempted: hosts are compared exactly, `www.x.com` and
  `api.x.com` are two entries. Documented ceiling.

## A4 — Notifications and remote decisions (ntfy)

- Configuration in `.env`: `LAW_NTFY_URL` (topic URL to publish to, e.g. `https://ntfy.sh/law-xxxx`),
  `LAW_NTFY_REPLY_URL` (second topic the phone publishes decisions to), optional
  `LAW_NTFY_TOKEN` (Bearer for both). Both topic names should be random strings: whoever knows
  them can see summaries and answer approvals. Passed to agentd in `config.init.notify`.
- `Notifier` (agentd) publishes:
  - approval requests: title `Approval: <summary>`, body = command line, priority `high`,
    ntfy actions `http` "Allow once" / "Allow for run" / "Deny" that POST `once <id>` / `session <id>`
    / `deny <id>` to the reply topic;
  - handoffs: title `Needs you`, body = reason, priority `high`;
  - run end: title `Run <state>`, body = final text or end reason, priority `default`.
- `Notifier` subscribes to the reply topic (`GET <reply>/json?since=<start>`, streaming, reconnect
  with backoff) and applies `once|session|deny <approvalId>` through `ApprovalManager.decide`.
  Unknown or expired ids are ignored and logged.
- Approval TTL becomes 10 minutes when notifications are configured (120 s otherwise); the card's
  countdown already follows `expiresAt`.
- Failure mode: publish errors are logged once per minute and never block the run.

## A3 — Several projects side by side (optional, after A1/A4/A5)

- One `Daemon` session per open workspace; the renderer shows tabs. Each session has its own
  containers, leases, proxy, run and approvals. `session.start` returns a `sessionId`; every
  message that today assumes the single session carries `sessionId`. UI: a tab strip above the
  panels, approvals badge per tab, "Open workspace…" adds a tab.
- This is a refactor of `Daemon` into `SessionRegistry` + `Session`; it lands only if A1/A4/A5 leave
  time in the session, else it gets its own plan.

## Tests

- rules: bypass flag classified as `approval`; with `nestedAutonomy` the gate logs instead.
- allowlist: persistence round-trip; proxy decide with a fake approvals object: once / session /
  deny / no-run; coalescing of concurrent requests.
- notifier: publishes the right headers/body via a fake fetch; parses reply messages; ignores
  unknown ids; TTL 10 min when configured.
