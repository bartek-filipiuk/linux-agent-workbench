# T2 B4 — Browser tools for the model, prompt, policy, per-surface lease

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** One run, two surfaces. The model gets `browser_observe`, `browser_act`, `browser_wait`, `browser_downloads` next to the terminal tools, a prompt paragraph on when to use which, and every browser action passes through policy: the human types passwords, consequential clicks (send, publish, pay, delete, permission changes) wait for approval in the same card as shell commands, model-initiated navigation to private or link-local addresses is refused, and a session-level "ask on first visit of a domain" mode exists. The browser has its own lease; the human can hold the keyboard on one surface while the agent works on the other.

**Architecture:** `RunController` gains a `ToolExecutor` seam (`specs` + `execute`), the default being the terminal executor; the Daemon composes terminal + browser executors per run. `ToolResult` gains an optional JPEG image that the OpenAI adapter sends as an `input_image` part of the `function_call_output`. `BrowserActionPolicy` reads the manager's last observation to know element roles and names; approvals reuse `ApprovalManager` with browser rules. `LeasePolicy` becomes surface-aware; the Daemon holds two leases.

## Global Constraints

- Tool names: `browser_observe { screenshot?: boolean, maxElements? }`, `browser_act { action }`, `browser_wait { text?, selector?, state?, timeoutMs? }`, `browser_downloads {}`. Observation text output omits the screenshot; when `screenshot: true` the JPEG goes to the model as an image part.
- Browser policy order: lease → password/secret field deny → private-address deny for `navigate` → domain `ask` approval → consequential-action approval. Categories by element name: `send` /\b(send|reply|tweet|post|submit message|comment)\b/, `publish` /\b(publish|share|deploy|release)\b/, `purchase` /\b(pay|buy|purchase|checkout|place order|subscribe|add to cart)\b/ (never "allow for this run"), `delete` /\b(delete|remove|unsubscribe|deactivate|close account)\b/, `permission_change` /\b(grant|allow|authorize|revoke|approve)\b/. Applies to `click`, `type` with `submit`, and `press Enter` when the last observation's focused/target element matches.
- Private-address rule for model navigation: hostnames `localhost`, `*.localhost`, `*.local`, `*.internal`, IPv4 in 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 0/8, IPv6 loopback/link-local/ULA → `POLICY_DENIED`. Tests pass `allowPrivate: true` for the fixture server.
- Domain mode per session: `open` (default) or `ask` (first visit of a registrable host → approval, category `external_side_effect`, rule `browser-domain`); `allowlist` deferred.
- Leases: `terminal` and `browser`. `run.start` takes both for the agent; terminal states hand both back. `lease.take { owner, surface? }` without surface applies to both. `lease.state` carries `surface`.

## Tasks

1. **Executor seam + image results + adapter**: `ToolExecutor` type, `terminalExecutor(worker)`, `RunController` uses `deps.tools ?? terminalExecutor(worker)`; `ToolResult.imageJpegBase64?`; OpenAI adapter emits array output with `input_image` when present (test).
2. **Browser tools**: `tools/browser-tools.ts` specs + `browserExecutor(manager)`; `previewOf` for browser tools; system prompt paragraph. Tests with a fake manager.
3. **Browser policy + surface leases**: `policy/browser-policy.ts` (`isPrivateAddress`, `classifyBrowserAction`, `BrowserActionPolicy`), `LeasePolicy(lease, surface)`, Daemon two leases + `lease.take.surface` + `lease.state.surface`, human browser input dropped while the agent owns the browser. Tests for classification, private ranges, password deny, ask mode with a fake approvals object.
4. **Daemon composition + UI**: browser manager created at session ready (not started), lazy start on first browser tool call, combined executor and policies per run; renderer: per-surface owners in the bottom bar, red outline on the browser stage while the agent owns it, "Take control" per surface. Manual acceptance: goal that reads a heading from example.com and writes it to a file in the terminal; screenshots.
5. **Wrap-up**: typecheck, tests, container tests unchanged, merge.
