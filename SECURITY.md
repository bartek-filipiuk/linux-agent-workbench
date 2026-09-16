# Security

Linux Agent Workbench is an early local developer tool. It provides useful isolation and approval mechanisms, but has not undergone an independent penetration test. It is **not a hostile-code security boundary with a blanket safety guarantee**. Use dedicated workspaces and limited-privilege accounts.

The latest scoped source review is in [docs/security-review.md](docs/security-review.md).

## Trust model

The host user, application source/dependencies, Codex executable/configuration, Electron main process and `agentd` are trusted. Model output, website content and code running inside either container are untrusted inputs.

The agent can modify its mounted workspace and act through any website account available in the browser. A prompt-injected page can try to persuade it to misuse those capabilities. Approval prompts reduce accidental side effects; they do not make every model decision safe.

## Protections in the current implementation

- Electron uses an isolated, sandboxed renderer without Node integration. Privileged IPC requires the application's current top-level frame and exact entry document. Navigation, popups and webview attachment are restricted; remote websites run in the separate browser worker.
- Codex uses a dedicated home, ChatGPT-only sign-in and a read-only operator thread. Built-in host-action capabilities are disabled; unexpected host tool requests are rejected. Actual LAW actions pass through its tool policies and executors.
- Workers run in rootless Podman containers with dropped capabilities, no-new-privileges, read-only root filesystems, memory/PID limits and restricted mounts. Containers share the host kernel; this is not VM isolation.
- Containers use `--network none`. Proxy-aware traffic crosses a host-side egress proxy that checks hostnames and resolved addresses, blocks private/local ranges, and connects to the checked IP without a second DNS lookup. The September review fixed mapped/expanded IPv6 bypasses.
- Tool arguments are validated. Surface control leases, browser policy, nested-prompt detection and interactive-shell rules mediate normal agent actions. Pending approvals expire to denial.
- API keys remain in the host-side provider path. Strong OS-backed encryption is used when available; plaintext fallback is visibly reported. Codex credentials are managed by its dedicated runtime, not copied from the user's ordinary session.
- Budget continuation validates run identity/state, retains other limits and is blocked during manual login. Actions planned before a pause are invalidated rather than blindly replayed.
- Follow-ups validate the latest run against the open workspace, serialize interruption and preserve accumulated limits. Outstanding browser actions are tracked after cancellation; an unconfirmed timeout blocks continuation until browser recovery. Restored Codex threads retain LAW-only tooling and the read-only host sandbox.
- Browser restart replaces only the session's browser container and preserves its named profile volume. No agent actions are automatically replayed. Human input is best effort: consecutive moves and wheel ticks coalesce, releases are never dropped, and input meant for a page that has since navigated is discarded. A hung mode switch or recovery marks the worker unresponsive until a refresh probe succeeds or the browser is restarted.
- Diagnostics redact common credentials and OAuth parameters. Image cleanup is restricted to owned LAW-tagged images and preserves foreign/shared tags and unidentified cache.

These are specific controls, not a claim that all interactions or data are confidential.

## Important limitations

### Workspace and shell

The selected workspace is writable host data. Do not mount secrets or unrelated personal files. The app rejects `/` and the entire home directory, but selecting another sensitive directory is still possible. Git snapshots cover tracked state and do not reverse external side effects.

The Bash gate observes the instrumented interactive shell. Scripts, alternate shells, nested agents and deliberately evasive processes are not completely mediated. A process with access to the container's sockets can attack that protocol boundary. **Supervised** mode is a useful review setting, not a general child-process sandbox.

Nested-agent permissions default to **autonomous**, domain policy to **open** and network to **open**. Choose stricter settings before tasks requiring more review. Stop cancels the operator/current worker action, but previously detached processes may continue until separately stopped or the container is destroyed.

### Accounts and stored data

Browser cookies and nested-agent credentials are accessible to their container environment. The default browser profile and named authentication volumes are shared across workspaces. Switching workspace or destroying a container does not necessarily sign out or delete those volumes. A mounted host `.gitconfig` can contain more than name/email; inspect it first.

Task goals, tool output, commands, URLs and approvals can be stored locally without field-level encryption. Screenshots are not stored in the SQLite tool log, but may be sent to the selected model provider and exist in provider/runtime state. The API adapter uses stored Responses (`store: true`). Codex/provider retention and account data policies are outside LAW's control.

Durable Codex conversations are stored in LAW's private Codex home, separately from the user's normal Codex configuration. LAW's 30-day SQLite pruning does not erase those Codex conversation files. Continuation checkpoints omit screenshot bytes; they retain provider identifiers, textual tool results and accumulated limits. Follow-up drafts are saved locally, like initial task drafts.

Manual login parks the operator, but the preview still shows login UI to the local human. After resumption, the agent can use the saved account and observe page content. Use narrowly privileged test accounts where possible.

A local process running as the same host user is outside the threat model; directory modes and rootless containers do not isolate your account from itself. Keep the dedicated Codex home and private `.env` outside any workspace. Never expose Electron debugging ports to other machines or leave a debugging endpoint enabled in a release.

### Network, notifications and costs

Blocking private addresses protects the host/LAN path through the proxy; it does not prevent exfiltration to an allowed public endpoint. Public HTTP traffic is not encrypted, and a proxy-aware remote service can itself act as a relay. `NET none` applies to sandbox egress, not the host's model connection.

Optional ntfy notifications send task/command summaries to the configured server. Remote approval replies currently trust topic access plus a pending ID, without per-device authentication. Keep replies disabled unless the server/topics and phone are appropriately access-controlled. Do not consider an unguessable public topic equivalent to strong authentication.

Time and estimated-cost budgets are checked between calls, can overshoot during a call, and do not replace provider-side limits. “No limit” does not remove subscription quotas or tool timeouts. Unknown price data cannot enforce a dollar ceiling.

### Supply chain and releases

A clean npm audit is a point-in-time advisory result, not proof of safety. It does not certify container OS packages, installed Chromium, the external Codex CLI, native dependencies or future upstream changes. Build images and use dependencies from trusted sources. Release signing, hardened packaging/fuses and independently verified clean-machine support remain roadmap work.

## Reporting a vulnerability

Do not publish credentials, session cookies, private task output or a working exploit against a live account in a public issue.

Use [GitHub private vulnerability reporting](https://github.com/bartek-filipiuk/linux-agent-workbench/security/advisories/new), also available under **Security → Report a vulnerability**. This channel is enabled; its setting was verified through the GitHub API on September 9, 2026. If it is unavailable, request a private contact route with a minimal non-sensitive message. Do not put confidential material in a public issue.

Include the affected commit, impact, a minimal reproduction using synthetic data, and any proposed mitigation. Do not test against another person's live account. This is a small project with no guaranteed response time or bug bounty.

Include the affected revision, component, attacker prerequisites, minimal reproduction using synthetic data, expected boundary, observed impact and any suggested mitigation. This project currently has no LTS branches or formal response-time guarantee. Do not test against third-party accounts or infrastructure without authorization.
