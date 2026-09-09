# Configuration reference

## Current provider support

| Provider | Authentication | Configuration today |
| --- | --- | --- |
| Codex App Server — default | ChatGPT subscription sign-in in the setup panel or `pnpm codex:login` | Model/effort in New task; optional `.env` overrides |
| OpenAI Responses API | Separately billed API key | `.env` and OS-backed encrypted saved key |
| Other operator providers | Not implemented | Planned in [ROADMAP.md](../ROADMAP.md) |

A Claude/Codex process inside the sandbox is a nested terminal application, not another operator adapter. Its credentials and quota are separate. Provider/account selection in Settings is a roadmap item, not an existing feature.

## Configuration file precedence

The desktop reads the first existing file:

1. `.env` inside Electron's user-data directory: normally `~/.config/@law/desktop/.env` on Linux, under the corresponding XDG configuration base when configured.
2. The repository-root `.env`.

Files are not merged. For provider settings, ordinary exported environment variables are not a replacement for these parsed files. Process variables such as PATH and XDG paths still affect runtime behavior. The CLI helper follows the same normal Linux app-config path before the repository file.

For private configuration outside the project:

```bash
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/@law/desktop"
cp .env.example "${XDG_CONFIG_HOME:-$HOME/.config}/@law/desktop/.env"
chmod 600 "${XDG_CONFIG_HOME:-$HOME/.config}/@law/desktop/.env"
```

Do not overwrite an existing configuration without preserving it first. Edit this file and restart the app to change providers. Keep it outside every agent workspace. `.env` files are ignored by Git, but ignore rules do not revoke files already committed; check staged content before publication.

## Provider variables

| Variable | Meaning / default |
| --- | --- |
| `LAW_PROVIDER` | `codex` by default; `openai` explicitly selects API billing. Unknown values are rejected |
| `LAW_CODEX_MODEL` | Optional Codex model ID; absent means the dedicated Codex configuration/default |
| `LAW_CODEX_BIN` | Optional absolute path to the Codex executable; otherwise PATH/nvm discovery |
| `LAW_CODEX_HOME` | Optional dedicated private directory; default is `<XDG_DATA_HOME>/linux-agent-workbench/codex` |
| `OPENAI_API_KEY` | API provider key; never needed for subscription mode |
| `OPENAI_MODEL` | API operator model; default `gpt-5.6-sol` |
| `OPENAI_PRICE_INPUT_PER_MTOK` | Optional estimated API input price, USD per million tokens |
| `OPENAI_PRICE_OUTPUT_PER_MTOK` | Optional estimated API output price, USD per million tokens |
| `LAW_RESEARCH_MODEL` | API-only override for the research profile |
| `LAW_RESEARCH_PRICE_INPUT_PER_MTOK` | Optional input estimate for that research model |
| `LAW_RESEARCH_PRICE_OUTPUT_PER_MTOK` | Optional output estimate for that research model |

No generic third-party base-URL control is exposed by the app. There is no `LAW_CODEX_EFFORT` setting: select effort in the task UI or use the dedicated Codex configuration. An explicit task selection overrides the configured model/effort for that run. Codex profile names do not change the chosen model.

Enter both price values as nonnegative decimal numbers if you use cost estimates. Unknown cost is shown as `n/a`; it is not free and cannot enforce a monetary ceiling. Cached input currently uses a fixed 0.1 multiplier; verify model-specific billing independently.

## Credentials

Codex sign-in is forced to the ChatGPT authentication path. LAW does not copy another Codex login or submit its OAuth credentials to the public Responses API. Codex itself controls credential persistence inside its dedicated home or credential store. Keep `LAW_CODEX_HOME` outside your agent workspace and do not point it at your normal coding-agent home.

For the API provider, a decryptable saved key takes precedence over `.env`. A strong Electron `safeStorage` backend encrypts a newly supplied key into `settings.json`, and LAW removes that key's line from the source `.env`. With `basic_text` or no suitable backend, the key remains in `.env` and the UI reports the weaker storage mode.

There is no key-management UI yet. To replace a saved API key, stop the app, preserve the settings file privately, remove only its `openaiKeyEncrypted` property, and supply the replacement key in the selected private `.env`. Restart with the OS keyring available. Never paste encrypted blobs or keys into an issue. Revocation happens in the provider's account controls, not by deleting a local file.

## Settings and task preferences

Settings stores the last workspace, selected network mode, nested-agent autonomy and domain policy in Electron's `settings.json`. Defaults are network `open`, nested agents `autonomous`, domains `open`. Select supervised agents and domain prompts when you need more review. Network changes may require explicitly applying the pending preference after the active task finishes.

Renderer localStorage contains:

- `law.goal:<workspace>`: the task draft for a workspace.
- `law.task-preferences`: working style, step and time preferences.
- `law.codex-model-selection`: model/effort selection.
- `law.drawer-width`: the panel-width preference.

These values are local preferences, not encrypted secret storage. Task text may also appear in run history and provider requests. Do not put credentials in the goal.

## Optional notifications

| Variable | Meaning |
| --- | --- |
| `LAW_NTFY_URL` | Topic URL receiving approvals, handoffs and run-end summaries |
| `LAW_NTFY_REPLY_URL` | Optional second topic streamed for approval decisions |
| `LAW_NTFY_TOKEN` | Optional bearer token for LAW's requests |

Notifications are disabled when no publish URL is set. Enabling them sends command/task summaries to the configured server; choose it deliberately. With notifications configured, approval lifetime increases from two to ten minutes.

Remote replies currently trust possession of the topic and a pending approval ID; there is no per-device signature or pairing. Authentication for LAW's requests does not automatically configure authentication for a phone's HTTP action buttons. Use access-controlled topics and configure the phone separately, or omit the reply topic and approve locally. Random public topic names are bearer-like secrets, not strong user authentication. See [Security](../SECURITY.md).

## Local data and container state

| Location | Contents |
| --- | --- |
| `<XDG_DATA_HOME>/linux-agent-workbench/state.sqlite` | Workspace/run history, tool text, usage, approvals and egress metadata |
| `<XDG_DATA_HOME>/linux-agent-workbench/codex` | Dedicated operator configuration/authentication and runtime state |
| `<XDG_DATA_HOME>/linux-agent-workbench/diagnostics` | Redacted diagnostic reports |
| `<XDG_DATA_HOME>/linux-agent-workbench/downloads/<session-id>` | Persistent browser downloads |
| Electron user-data directory | Settings and renderer storage |
| `<XDG_RUNTIME_DIR>/linux-agent-workbench` | Private worker/proxy sockets and per-session runtime files |
| `law-browser-profile-default` Podman volume | Shared browser profile, cookies and saved site sessions |
| `law-auth-claude`, `law-auth-codex` volumes | Nested terminal-agent authentication/configuration |
| `law-ssh` volume | Dedicated sandbox SSH keys and known_hosts |
| Selected workspace | Files visible and writable from the terminal |

When unset, XDG data defaults to `~/.local/share`, and runtime falls back to a user-specific directory under the system temporary directory. Runtime sockets may not survive a reboot; downloads live in the persistent data directory. The host `~/.gitconfig`, if present, is mounted read-only in the terminal; review it for sensitive configuration. The browser has no workspace or host SSH mount, but its shared profile is sensitive.

Source-build image IDs in `images/*/image.json` refer to locally built images, not registry images you can pull by those IDs. Build both images on each new machine.
