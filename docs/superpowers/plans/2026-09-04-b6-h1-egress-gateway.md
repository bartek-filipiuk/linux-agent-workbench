# B6 H1 — Egress gateway

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** Both sandbox containers run with `--network none`; every outbound connection goes through an HTTP CONNECT proxy in agentd that refuses private and link-local addresses by resolved IP and logs each decision. curl, git, Claude Code, Codex, ssh and Chromium keep working through the proxy; anything that ignores proxies has no network.

**Architecture:** `EgressProxy` (agentd, Node `net` + hand-written HTTP/1.1 parsing) listens on Unix sockets inside each session's runtime dirs. A tiny `EgressForwarder` in `@law/protocol` (TCP 127.0.0.1:3128 → Unix socket) runs inside each worker. Container args add `--network none`, the proxy env variables and `LAW_EGRESS_SOCKET`. Playwright gets `proxy.server`; the terminal image gets `netcat-openbsd` and an ssh `ProxyCommand`.

**Spec:** `docs/superpowers/specs/2026-09-04-b6-hardening-design.md` §2.

## Global Constraints

- Socket paths: `<runtimeRoot>/<sessionId>/egress.sock` and `<runtimeRoot>/<sessionId>/browser/egress.sock`; inside containers `/run/law/egress.sock`.
- Container env: `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy` = `http://127.0.0.1:3128`; `NO_PROXY=localhost,127.0.0.1,::1`; `LAW_EGRESS_SOCKET=/run/law/egress.sock`; `LAW_EGRESS_PORT=3128`.
- Network mode `none`: no proxy socket is created; the forwarder still listens and closes each connection immediately.
- Proxy: `CONNECT host:port` and absolute-URI plain HTTP only, else `400`. Denied → `403` with a one-line body naming the reason. Header buffer cap 16 KiB, 256 concurrent upstreams per proxy, upstream idle timeout 5 min.
- Private check by resolved address (`dns.lookup(host, { all: true })`): any private/link-local result denies; connect to the checked address, never re-resolve. `isPrivateHost` lives in `policy/private-address.ts`.
- Logging: `egress.decision { host, port, allowed, reason? }` → agentd log line for denials and the `egress_log` table for all (`ts, session_id, host, port, allowed, reason`). Never paths or bodies.

## Tasks

1. **Private-address module + forwarder**: move `isPrivateAddress`/range checks to `services/agentd/src/policy/private-address.ts` exporting `isPrivateHost(host)`, `isPrivateAddress(url)`, `isPrivateIp(ip)`; browser policy imports them. `packages/protocol/src/node/egress-forwarder.ts`: `startEgressForwarder({ socketPath, port, host = "127.0.0.1" }) → Promise<{ close(): Promise<void> }>`; each TCP connection → `net.connect(socketPath)` piped both ways; connect error → destroy the TCP side. Test: round trip through a Unix echo server; missing socket closes the client.
2. **EgressProxy**: `services/agentd/src/egress/proxy.ts` — `new EgressProxy({ decide, log, lookup? })`, `listen(path)` (unlinks a stale file first, mode 0600), `close()`. Parses the first request block; `CONNECT` → decide → resolve → `200 Connection established` then pipe; absolute-URI request → rewrite the request line to the path, add `Connection: close`, forward the buffered bytes and pipe. Tests in `services/agentd/test/egress-proxy.test.ts` with a local TCP echo server and a fake `lookup`.
3. **Store + Daemon wiring**: migration `egress_log`; `Store.logEgress(sessionId, d)`; Daemon creates one `EgressProxy` per session when mode is `open`, listens on both socket paths (browser dir created up front), closes it on `session.stop`; `podman.ts` builds `--network none` + env for both containers; the browser worker passes `proxy` to Playwright when `LAW_EGRESS_SOCKET` is set; both workers start the forwarder in `main.ts`. Terminal image: `netcat-openbsd`, `/etc/ssh/ssh_config.d/law.conf`. Unit tests: args tables; daemon test that the socket exists after `session.start` in open mode and not in none mode.
4. **Images + container tests + docs**: rebuild both images; `tests/container/egress-container.test.ts` per spec §2.4; README section "Network"; CLAUDE.md map update; typecheck, full vitest, commit, merge.
