# Roadmap

This is a direction for future work, not a list of features already available or a delivery-date commitment. Current capabilities are documented in [README.md](README.md).

## 1. Make operator providers easy to configure in Settings

**Highest product priority: one provider setup experience for both subscription access and API billing.** Codex with ChatGPT sign-in remains the primary, best-documented path; the existing OpenAI Responses API adapter remains an explicit alternative.

Planned work:

- A provider/account section in Settings with clear labels for **subscription** versus **metered API** access.
- Guided connection, status checks, reconnect/sign-out and credential replacement without manually editing files.
- A common adapter capability contract: tool calls, screenshots, model catalog, reasoning options, cancellation, errors, context management and usage reporting.
- Additional API providers through their documented APIs, with endpoint validation and isolated credentials. Candidate evaluations include Anthropic/Claude, Google/Gemini and compatible API endpoints; these are candidates, not announced integrations.
- Additional subscription integrations **only where the provider offers an appropriate supported authentication/runtime integration**. Candidate providers must first pass a feasibility review; a consumer subscription does not imply API or automation access.
- Model and effort choices that reflect each provider's actual capabilities, with unsupported controls omitted or explained.
- Explicit handling of expired sessions, unavailable models and quota exhaustion. Never silently switch from subscription access to paid API usage or between accounts.
- Migration from current `.env` configuration while preserving deliberate user choices.

Acceptance criteria:

1. A new user can connect an implemented provider, verify readiness and run a tool round trip from Settings without knowing environment-variable names.
2. Adding an adapter does not bypass LAW's policies, control leases or sandbox tool execution.
3. Authentication state and credentials are separate per provider/account and stay outside the renderer and agent workspace.
4. Each integration has conformance tests for text, tool/image results, cancellation, paused continuation and failure behavior.
5. Documentation states the supported authentication mechanism and billing relationship without claiming that every subscription can be reused.

No new provider adapter or Settings feature is implemented by this documentation/security pass.

## 2. Strengthen isolation and make its limits visible

- Independently review the shell gate, worker protocol and host egress boundary against malicious sandbox processes.
- Isolate browser and nested-agent profiles per workspace/account; define migration and explicit profile deletion.
- Replace bearer-topic remote approvals with authenticated, paired decisions before recommending that workflow broadly.
- Add resource limits for pending proxy clients and provider event queues; test hostile output and prolonged idle connections.
- Review host Codex configuration discovery and capability drift whenever the CLI changes.
- Package Electron with an audited application protocol/fuse configuration and a clearly defined permission policy.
- Verify runtime-directory/download lifecycle, permissions and retention across crashes and reboots.

## 3. Improve reliability and account workflows

- Preserve a safe in-memory browser transition URL so switching into manual mode does not break an in-progress OAuth query, without persisting credentials in a return marker.
- Distinguish provider quotas, model context exhaustion, tool timeouts and application budgets in diagnostics.
- Replace the fixed cached-input pricing assumption with provider/model-aware estimates and explicit “unknown” handling.
- Evaluate durable, explicit continuation after an app restart. Do not imply it works until provider context, policy state and pending actions can be restored safely.
- Add repeatable clean-machine install and browser-login compatibility checks.

## 4. Prepare dependable releases

- Select a license and review provenance of source, images and dependencies.
- Maintain the enabled GitHub private vulnerability-reporting channel and define a sustainable triage process.
- Set up CI for typecheck, unit/integration tests, dependency auditing and English documentation/link checks.
- Add separately scheduled container tests and documented supported Linux environments.
- Provide reproducible image builds and versioned release artifacts, then signed installers and update policy.
- Publish a short demo using synthetic accounts and non-sensitive task data.

## Ordering and contributions

Release-blocking security fixes take precedence over feature work. Provider configuration is the next major product initiative; packaging and broader platform support should not conceal unfinished isolation or authentication behavior.

Propose an adapter or Settings design in an issue before a large implementation. Include the documented integration mechanism, capability gaps, credential lifecycle, billing behavior and a test plan. Do not submit copied browser tokens, unofficial subscription-to-API bridges or silent billing fallback.
