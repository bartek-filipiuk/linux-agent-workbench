# Linux Agent Workbench

Desktop app where an LLM drives a sandboxed terminal (and later a browser) under human supervision.

Design: `docs/superpowers/specs/2026-09-04-terminal-stage-design.md`.
Full architecture: `linux-agent-workbench-architecture.md`.

## Development

```bash
source ~/.nvm/nvm.sh && nvm use     # Node 24
pnpm install
cp .env.example .env                 # then fill OPENAI_API_KEY
pnpm test
pnpm dev                             # builds protocol + agentd, starts Electron
```

`.env` keys: `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.6-sol`), optional `OPENAI_PRICE_INPUT_PER_MTOK` and `OPENAI_PRICE_OUTPUT_PER_MTOK` (USD per million tokens; without them the run cost shows `n/a`). The app reads `~/.config/@law/desktop/.env` first, then the repo root; keep the key outside any directory you open as a workspace.

On the first start with a real keyring (GNOME Keyring, KWallet), the app moves `OPENAI_API_KEY` from `.env` into the OS keyring through Electron's `safeStorage` (stored encrypted in `settings.json`) and replaces the `.env` line with a note. If the only backend is `basic_text` the key stays in `.env`, nothing is written, and the top bar shows `key in plain .env`.

## Layout

- `packages/protocol` — framing, Zod schemas, error codes
- `services/agentd` — orchestrator, storage, provider adapters, policy
- `services/terminal-worker` — PTY/tmux worker that runs inside the container (Milestone 2)
- `apps/desktop` — Electron main/preload/renderer

### Sandbox image

```bash
pnpm images:build        # builds localhost/law-terminal and pins its id in images/terminal/image.json
pnpm test:container      # Podman-backed tests (needs the image)
```

`pnpm images:build` refuses to run with less than 5 GB free on `/`, removes previous builds and build-cache layers after a successful build (`pnpm images:prune` does the same on demand), and fails with exit 4 when podman image storage still exceeds 6 GB. An image used by a running sandbox cannot be removed until that sandbox is destroyed and reopened on the new image.

The app starts one container per workspace (`law-terminal-<id>`), keeps it running when the window closes, and reconnects to the same tmux session on the next start. "Destroy sandbox" removes it.

Host notes (Ubuntu 22.04, Podman 3.4 rootless): the build tolerates tar's directory chmod failure on rootless overlay, and no CPU quota is applied because the user's cgroup delegates only `memory` and `pids`.

### Policy gate

Every simple command of the interactive shell in the sandbox is checked by agentd before it runs (a bash `DEBUG` trap calls `/opt/law/gate.cjs`, which asks the worker, which asks agentd):

- commands typed by the human are always allowed and logged;
- for the agent: read-only prefixes run silently (`auto`), most commands run and are logged (`log`), risky ones wait for your decision in the drawer (`approval`: pushes, publishes, `curl | sh`, `sudo`, recursive `rm`/`chmod`, `git reset --hard`, remote shells, raw disk writes), and nested agents started with permission-bypass flags are refused (`deny`);
- an approval is `Allow once` (this exact command), `Allow for this run` (this rule until the run ends) or `Deny`; no answer within 120 s denies;
- when a nested tool shows a permission or password prompt, the agent's next keystroke is blocked and the run hands off to you.

Ceiling: the gate covers the interactive shell only. `bash -c`, scripts, other shells and processes started by nested agents are governed by the container, mounts and network profile. Before each run on a git workspace a snapshot (`HEAD` + `git stash create`) is recorded; "Restore pre-run state" brings tracked files back, untracked files are left alone.

### SSH and git identity in the sandbox

The container mounts the named volume `law-ssh` at `/home/agent/.ssh` and, if present, the host `~/.gitconfig` read-only. Put a **dedicated deploy key** and a pinned `known_hosts` into the volume (`podman unshare` + the path from `podman volume inspect law-ssh`), never the host `~/.ssh`. `ssh`/`scp`/`rsync` are `approval` commands: prefer "Allow once", because the gate sees the connection, not what runs on the remote side.

### Network

Neither container has a network namespace of its own (`--network none`). The only way out is an HTTP proxy that agentd serves on a Unix socket in the session's runtime dir; a small forwarder inside each container exposes it as `127.0.0.1:3128`, and `HTTP_PROXY`/`HTTPS_PROXY` point there. The proxy resolves every hostname on the host, refuses private, loopback and link-local addresses (by name and by resolved address) with `403`, and records each decision in the `egress_log` table. With the network mode `none` agentd serves no socket, so proxy-aware tools fail immediately.

What works: curl, git, apt, pip, npm/pnpm, Claude Code, Codex, Chromium (launched with `--proxy-server`), and ssh through the `ProxyCommand` shipped in `/etc/ssh/ssh_config.d/law-egress.conf`. What does not: anything that ignores proxy variables, ping, UDP, and tools that resolve names themselves before connecting.

### Maintenance and diagnostics

At startup agentd deletes runs that ended more than 30 days ago (with their events, tool calls, approvals and usage) and egress rows older than that, and stops containers whose session has not been used for 7 days (`last-used` marker in the session's runtime dir; volumes are kept). Screenshots are never written to the database. The "Diagnostics" button writes `~/.local/share/linux-agent-workbench/diagnostics/law-diagnostics-<timestamp>.txt` with versions, image ids, containers, settings without the key and the last 500 agentd log lines, all passed through a redactor; check it before sharing anyway.
