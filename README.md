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

`.env` keys: `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.6-sol`).

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

The app starts one container per workspace (`law-terminal-<id>`), keeps it running when the window closes, and reconnects to the same tmux session on the next start. "Destroy sandbox" removes it.

Host notes (Ubuntu 22.04, Podman 3.4 rootless): the build tolerates tar's directory chmod failure on rootless overlay, and no CPU quota is applied because the user's cgroup delegates only `memory` and `pids`.
