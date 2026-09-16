# Linux Agent Workbench

A Linux desktop workspace where an AI agent operates a containerized terminal and browser while you watch, review approvals, and take control.

**The primary provider is Codex with ChatGPT subscription sign-in.** The separately billed OpenAI Responses API is also supported. Switching providers currently uses configuration files; a unified provider setup in Settings is the first major [roadmap](ROADMAP.md) item.

This is an early source-build project. It is not affiliated with or endorsed by OpenAI. Read the [security model](SECURITY.md) before connecting accounts or opening a workspace containing sensitive data. Release packaging and license selection are tracked in the [publication checklist](CONTRIBUTING.md#before-publishing).

## What works today

- A real terminal with PTY/tmux, interactive applications, and a persistent workspace.
- A separate Chromium browser with tabs, screenshots, DOM observations, downloads, and manual sign-in.
- Browser research: read rendered page content and save source captures as Markdown for terminal or coding-agent work.
- Codex subscription authentication, account-specific model choices, and reasoning effort selection.
- Human takeover, approval cards, activity history, output inspection, and tracked-file restoration for Git workspaces.
- Durable current conversations with follow-ups, pause/interrupt controls and continuation after app restart. Independent browser restart preserves the saved profile and workspace.
- A growing task editor, saved preferences, explained working styles, and separate step/time limits.
- Pausing at a limit and continuing the same live task, with explicit Stop throughout.

## Requirements

Use a Linux desktop with:

- Node.js **24** (`.nvmrc`) and pnpm **10.24.0** (`packageManager`).
- Rootless Podman configured for your user; `podman info` must work without sudo.
- Git, a C/C++ toolchain, Python 3, and Linux libraries needed by Electron and `node-pty`.
- [Codex CLI](https://learn.chatgpt.com/docs/cli) installed on the host for the subscription provider. Follow its official installation instructions. The integration was tested with **0.153.4**; model availability depends on the account.
- Space for both container images. The build script requires at least **5 GB free** on the workspace and Podman-storage filesystems and checks a **14 GB allocated-storage ceiling** afterward. Shared image layers are counted once; profiles and orphaned storage also count.

Development has been exercised on Ubuntu with rootless Podman. Other Linux distributions may need different packages. There are no Windows/macOS support or packaged-release claims.

## Run from source

Clone this repository and run the commands below. They assume nvm is installed; if you installed Node 24 another way, skip the two nvm commands and ensure that version is on PATH:

```bash
git clone https://github.com/bartek-filipiuk/linux-agent-workbench.git
cd linux-agent-workbench
nvm install
nvm use
npm install --global pnpm@10.24.0
pnpm install --frozen-lockfile
cp .env.example .env

# Build both isolated environments; the generated image IDs are local to your machine.
pnpm images:build
pnpm images:build:browser

pnpm dev
```

The image build scripts also prune unused older LAW images/build cache after a successful build. Review [maintenance](docs/USER_GUIDE.md#maintenance-and-diagnostics) before running them on a host with other Podman projects.

In the app:

1. Expand the setup/account panel and choose **Sign in to Codex**. Finish authentication yourself in the system browser.
2. Choose **Open workspace…** and select a dedicated project directory. The agent can change files there.
3. Choose **Browser** or **Both**, then **Open browser** if your task needs it.
4. Under **New task**, enter a goal, review **Working style**, limits, and **Model & reasoning**, then choose **Start task**.

A first task that needs no website account:

> Inspect the current terminal directory without changing anything. Report the working directory and the names of the files you can see.

For terminal-based authentication and an optional subscription-consuming connection test:

```bash
pnpm codex:login
pnpm codex:status
pnpm codex:smoke
# Remote login, if supported by your account:
pnpm codex:login --device-auth
```

The app uses a dedicated Codex home, separate from your usual coding-agent login. There is **no automatic paid API fallback**. Subscription sign-in and API-key billing are different authentication paths; quota and access depend on your account. [Official OpenAI authentication documentation](https://learn.chatgpt.com/docs/auth).

## Documentation

| Document | What it covers |
| --- | --- |
| [User guide](docs/USER_GUIDE.md) | Installation details, daily workflow, browser login, approvals, limits, history, troubleshooting |
| [Configuration](docs/CONFIGURATION.md) | Current Settings controls, environment variables, providers, credentials and local data |
| [Codex integration](docs/codex-integration.md) | Dedicated sign-in, App Server, model/effort selection and tool boundary |
| [Architecture](linux-agent-workbench-architecture.md) | Processes, tools, policies, network and storage |
| [Security](SECURITY.md) | Trust model, known limitations, disclosure and safer operation |
| [Security review](docs/security-review.md) | Review scope, findings, fixes and verification limits |
| [Roadmap](ROADMAP.md) | Planned multi-provider subscription/API setup and later priorities |
| [Contributing](CONTRIBUTING.md) | Development checks and publication prerequisites |

## OpenAI API alternative

Use a private app configuration file outside the workspace, or the ignored repository `.env` for development:

```dotenv
LAW_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5.6-sol
```

Restart the app after changing provider configuration. API usage is billed separately from ChatGPT. An available OS keyring encrypts the saved API key; otherwise it stays in the configuration file with a visible warning. Never open a directory containing that file as the agent workspace. See [configuration and key precedence](docs/CONFIGURATION.md).

## Development checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Worker browser tests need a local Playwright Chromium installation; see [Contributing](CONTRIBUTING.md). Real container tests are opt-in with `pnpm test:container` after building both images. Tests normally use fake providers and do not spend model quota.

## License

A license has not yet been selected. Public source availability alone does not grant an open-source license; selecting and adding `LICENSE` is a prerequisite before publishing this project as open source.
