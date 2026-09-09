# Codex subscription integration

Codex App Server is the primary operator provider. LAW signs into a ChatGPT account through the installed host Codex CLI and supplies its own sandboxed tools. The OpenAI Responses API remains a separately configured, separately billed alternative.

## Setup

Install Codex CLI on the host, build/install LAW as described in the [README](../README.md), and keep `LAW_PROVIDER=codex`. Sign in from the app setup panel or run:

```bash
pnpm codex:login
pnpm codex:status
# Optional, supported device flow for a remote host:
pnpm codex:login --device-auth
```

LAW's default Codex home is `~/.local/share/linux-agent-workbench/codex`, respecting XDG data configuration. `LAW_CODEX_HOME` can select a different dedicated directory outside the workspace. Do not reuse or copy an unrelated CLI's credentials. `LAW_CODEX_BIN` selects an executable when PATH/nvm discovery is unsuitable.

ChatGPT sign-in provides subscription access, whereas API keys use API billing. Account availability and quota remain provider-controlled. LAW never silently switches to API billing after a subscription error. [Official authentication documentation](https://learn.chatgpt.com/docs/auth).

## Models and reasoning

Open **New task → Model & reasoning**. LAW requests the authenticated account's App Server `model/list` catalog with pagination. It filters hidden models and models explicitly lacking image input, because tools may return screenshots. Models whose catalog lacks modality metadata remain eligible for compatibility.

Effort options come from each model's supported reasoning levels. An unsupported saved selection blocks Start. Changing models retains a supported effort or uses the new model's default. Refresh retries catalog loading. Selections are saved in renderer preferences and validated again before a task starts.

An explicit selection overrides environment/dedicated-Codex defaults for that task. Selecting the configured entry sends no UI override. Working styles are independent prompt behavior, not Codex model selection. API provider model configuration lives in `.env` instead.

## App Server and tools

The tested CLI baseline is **0.153.4**. LAW launches `codex app-server --listen stdio://` with a dedicated working directory and ChatGPT-only login settings. It initializes an ephemeral read-only thread with LAW dynamic tools. Model actions are delivered as `item/tool/call`, validated, authorized and executed through the existing LAW worker infrastructure. Returned text/images go back to the same provider thread.

Native host-action tools and built-in integrations are disabled. Unexpected host RPC operations receive an error. The runtime's **Code Mode host must remain enabled**, even with the separate `code_mode` feature disabled: the tested models need that runtime to deliver dynamic tool calls. Disabling both can leave ordinary text working while every tool call fails with `code-mode host is disabled`.

This is an integration constraint, not permission for unrestricted host execution. Review the CLI's actual capabilities and LAW's regression tests when upgrading. App Server is described in the [official documentation](https://learn.chatgpt.com/docs/app-server).

## Limits and context

New UI tasks default to no step/tool cap and a separate 30-minute active-time cap. A limit parks the existing run and adapter. Explicit continuation retains the same context, invalidates stale pending actions and rechecks the unchanged limits. There are no model calls just to wait for a human.

Codex manages its own context compaction. The operator's budget pause is resumable only while the application process remains alive; full app restart records an interruption. A history **Continue…** action prepares a new task and is not a recovered Codex thread.

Subscription consumption is not converted into an invented dollar cost: the UI shows `n/a`. Quotas, model restrictions and provider failures still apply even when LAW step/time caps are disabled.

## Verification

```bash
pnpm codex:smoke
# An explicit model must exist in your account:
pnpm codex:smoke --model gpt-6-astra --effort medium
```

This optional command **consumes subscription quota**. It requires a dynamic `law_ping` call and an unpredictable value returned through the tool result; a plausible text-only response cannot pass. It does not use your browser or modify a workspace.

Fake-provider tests cover tool mapping, text/Unicode streaming, usage accounting, unknown tools, cancellation and process failures. Previous live checks verified terminal/browser tools and same-run budget continuation on Astra/medium. These results are observations of one account/CLI combination, not a guarantee for every account or future runtime.

See the [user guide](USER_GUIDE.md), [configuration reference](CONFIGURATION.md) and [security model](../SECURITY.md) for operational behavior and limitations.
