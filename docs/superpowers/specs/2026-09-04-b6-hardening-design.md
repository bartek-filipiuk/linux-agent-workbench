# B6 — Hardening design

Date: 2026-09-04. Applies to both surfaces (terminal and browser) after T1 M1–M5 and T2 B1–B5.

## 1. Goal

Close the gaps where policy and mechanism disagree:

1. Network egress is enforced by a gateway, not by prompting the model. Private and link-local
   addresses are unreachable from the sandbox no matter which tool tries.
2. The OpenAI key is stored encrypted by the OS keyring, never in plain text unless the user
   explicitly keeps `.env`.
3. Containers left running by a crashed app are stopped after a grace period; old run history is
   pruned; a diagnostics file can be produced without secrets.
4. The app can be installed from a `.deb` or AppImage (last, optional milestone).

Out of scope: an egress allowlist UI (the gateway has the hook), a custom seccomp profile
(Podman's default `/usr/share/containers/seccomp.json` is already applied, verified with
`podman info`), AppArmor (disabled on this host), CPU quotas (cgroup delegation, see podman.ts).

## 2. Egress gateway (variant A, approved)

### 2.1 Topology

- Both containers start with `--network none`. Loopback exists inside the container; nothing else.
- agentd runs an HTTP proxy (`EgressProxy`) that listens on a Unix socket in each session's runtime
  dir: `<runtimeRoot>/<sessionId>/egress.sock` (terminal) and
  `<runtimeRoot>/<sessionId>/browser/egress.sock` (browser). Both files are served by the same
  proxy instance. The containers already mount those dirs at `/run/law`.
- Each worker runs a forwarder: a TCP listener on `127.0.0.1:3128` inside the container that pipes
  every connection to `/run/law/egress.sock`. Env `LAW_EGRESS_SOCKET` names the socket,
  `LAW_EGRESS_PORT` the port (default 3128). The forwarder is ~30 lines in
  `packages/protocol/src/node/egress-forwarder.ts`, used by both workers' `main.ts`.
- Container env: `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy` =
  `http://127.0.0.1:3128`, `NO_PROXY=localhost,127.0.0.1,::1`.
- Chromium: `launchPersistentContext({ proxy: { server: "http://127.0.0.1:3128" } })` when
  `LAW_EGRESS_SOCKET` is set.
- SSH: the terminal image ships `/etc/ssh/ssh_config.d/law.conf` with
  `ProxyCommand nc -X connect -x 127.0.0.1:3128 %h %p` and installs `netcat-openbsd`.
- Network mode `none`: agentd does not create the socket; the forwarder answers every connection
  with an immediate close, so proxy-aware tools fail fast ("proxy connection refused").

### 2.2 Proxy behaviour

`services/agentd/src/egress/proxy.ts`, class `EgressProxy({ decide, log })`:

- Supports `CONNECT host:port` (TLS, SSH, WebSocket) and absolute-URI plain HTTP requests
  (`GET http://host/path`). Anything else → `400`.
- Resolution: `dns.lookup(host, { all: true })` on the host. If any resolved address is private or
  link-local, or the host is a private name (`isPrivateHost`), the request is denied with `403`
  and the reason `private address`. The upstream connection is made to the first checked address,
  never by re-resolving the hostname (no rebinding window).
- `decide(host, port) → { allow: true } | { allow: false, reason }` is the policy hook. Today:
  mode `none` → nothing listens; mode `open` → allow unless private. Ports are not restricted.
- Every decision is logged: `egress.decision { host, port, allowed, reason? }` through the `log`
  callback; agentd writes denials to the agentd log and both outcomes to the `egress_log` table
  (`ts, session_id, host, port, allowed, reason`). Request bodies and paths are never logged.
- Limits: 256 concurrent upstream connections per session; idle upstream sockets closed after
  5 minutes; the per-connection header buffer is capped at 16 KiB.
- `isPrivateHost(host)` and the IPv4/IPv6 range checks move from `policy/browser-policy.ts` to
  `policy/private-address.ts`; browser policy imports them (behaviour unchanged).

### 2.3 What stops working, by design

Programs that ignore proxy variables have no network. ICMP and UDP do not exist. Name resolution
inside the container fails (no route to any resolver); tools that resolve names themselves before
connecting (`dig`, `ping`, binaries with their own resolver) fail. curl, git, apt, pip, npm, pnpm,
Claude Code, Codex and Chromium honour the variables. The README documents this and the
`ProxyCommand` for ssh.

### 2.4 Tests

- `services/agentd/test/egress-proxy.test.ts`: CONNECT to a local TLS-less echo server is allowed
  when `decide` says so; CONNECT to `127.0.0.1` is denied with 403 and logged; a hostname that
  resolves to a private address is denied (fake `lookup`); absolute-URI GET is forwarded; a
  malformed request gets 400; a denied request never opens an upstream socket.
- `packages/protocol/test/egress-forwarder.test.ts`: bytes round-trip TCP ↔ Unix socket; a missing
  socket closes the TCP client.
- Container tests: with `LAW_CONTAINER_TESTS=1`, `curl https://example.com` inside the terminal
  container returns 200 through the proxy, `curl http://10.0.2.2` fails with 403, and
  `podman exec … curl --noproxy '*' https://example.com` fails (no route); the browser container
  loads `https://example.com` through the proxy and `http://10.0.2.2/` shows the proxy's 403.

## 3. API key in safeStorage

- On startup, main reads `settings.json`. If it has `openaiKeyEncrypted` and
  `safeStorage.isEncryptionAvailable()`, the key is decrypted and used.
- Otherwise main reads `.env`. If it has `OPENAI_API_KEY` and the backend
  (`safeStorage.getSelectedStorageBackend()`) is neither `basic_text` nor `unknown`, main encrypts
  the key into `settings.json` and rewrites `.env` without that line, keeping the other values.
  A line `# OPENAI_API_KEY moved to the OS keyring on <date>` replaces it.
- If the backend is `basic_text` or encryption is unavailable, the key stays in `.env` and the UI
  status shows `key: plain .env (no keyring)`; nothing is written. This is the fail-closed check:
  the app never writes a key that the OS would store as plain text.
- The renderer gets a `security` status `{ keyStore: "keyring" | "env" | "none", backend }` in
  `agentd.ready` forwarding; the top bar shows it next to the model.
- No UI to enter the key yet; the user edits `.env` as today. (A dialog is a later item.)

## 4. Orphans, retention, diagnostics

- **Orphan containers.** agentd touches `<runtimeRoot>/<sessionId>/last-used` at session start,
  every 30 minutes while a session is active, and at session stop. At `config.init`, agentd lists
  running containers with label `law.app=1`, reads each `law.session` label, and stops those whose
  `last-used` is missing or older than 7 days (`podman stop -t 5`). Containers run with `--rm`, so
  a stopped container is gone. Volumes are never touched.
- **Retention.** At `config.init`, runs that ended more than 30 days ago are deleted together with
  their `run_events`, `tool_calls`, `approvals`, `provider_usage` and `egress_log` rows. Screenshots
  are not persisted today (tool_calls store the text output only); a test asserts that a
  `browser_observe` result with an image leaves no base64 in the store.
- **Diagnostics.** IPC `diagnostics.write` → main writes
  `<dataDir>/diagnostics/law-diagnostics-<timestamp>.txt` with: app, Electron, Node and Podman
  versions; the pinned image ids; `podman ps` filtered to `law.app=1`; the last 500 lines of the
  agentd log ring buffer (main keeps one); `settings.json` without the encrypted key; the store
  file size and schema version. Every line is passed through a redactor that replaces
  `sk-[A-Za-z0-9_-]{8,}` and `Bearer …` values with `[redacted]`. The top bar gets a
  "Diagnostics" button that shows the written path.

## 5. Packaging (optional, last)

- `electron-builder` in `apps/desktop` producing `.deb` and AppImage, artifacts under
  `apps/desktop/release/`. Images are not bundled: `images/*/image.json` and `scripts/` ship under
  `resources/`, and the app shows "build the images with scripts/build-image.sh" when an id is
  missing on the machine. The `.deb` depends on `podman` and `tmux`.

## 6. Milestones

- H1 egress gateway (proxy, forwarder, container args, images, tests, README).
- H2 safeStorage key handling and status.
- H3 orphans, retention, diagnostics.
- H4 packaging.
