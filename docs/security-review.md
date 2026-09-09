# Source security review — 2026-09-09

## Scope and conclusion

This review examined the local source tree for open-source publication: Electron/preload IPC, provider setup and tools, worker launch/mounts, shell/browser policy, host egress, credential and history storage, diagnostics, image maintenance, English-language content and publication artifacts. It included regression tests and an npm advisory query.

The application has useful separation between the UI, operator and container tools. Several concrete gaps were fixed below. **This is a scoped source review, not an independent penetration test, a container escape assessment or a certification that arbitrary hostile tasks are safe.** Remaining boundaries and operational risks are documented in [SECURITY.md](../SECURITY.md).

## Fixed findings

| ID | Finding and impact | Change and verification |
| --- | --- | --- |
| SEC-01 | Private-address checks missed mapped/expanded IPv6 and some local ranges, allowing a request toward a host/LAN service through the proxy | Canonical IPv6 prefix checks, mapped-IPv4 handling, complete link-local/ULA checks and shared-address/multicast rejection. Unit cases and a proxy request verify denial without opening upstream connections |
| SEC-02 | Privileged Electron IPC did not verify the sender frame/document; app navigation and new-window creation lacked explicit restrictions | All exposed handlers/events now pass a top-frame, current-WebContents and exact-entry-URL check. External navigation/redirects, popups and webview attachment are blocked. Regression tests cover foreign senders, same-URL subframes and other documents |
| SEC-03 | Missing browser image configuration selected an unrestricted host-worker fallback | The production entry always uses the container launcher. Missing image fails with an actionable error before starting a worker. The host launcher remains only as an explicit test/development utility |
| SEC-04 | Database creation could leave task/tool history readable by other host users under a permissive umask | New storage directories use 0700; existing/new database, WAL and shared-memory files use 0600. Regression test reopens a deliberately permissive database and checks all modes |
| SEC-05 | Image-build cleanup considered unrelated Podman images for deletion | Cleanup only considers images whose known repository tags all belong to LAW; foreign/shared tags and unowned cache remain. A fake-Podman test proves no unrelated IDs are removed; the real image store was not pruned during this review |
| SEC-06 | Proxy parsing accepted out-of-range CONNECT ports and missed the header cap when a complete oversized header arrived together; asynchronous routing exceptions could escape | Port validation, complete-header size enforcement and a controlled 502 failure path. Regression requests verify no upstream connection |
| SEC-07 | Diagnostic redaction missed JSON-form credentials and OAuth query parameters | Added JSON credential, common OAuth parameter and JWT patterns with synthetic-secret tests. This remains heuristic redaction, not permission to share unreviewed logs |

These fixes tighten existing behavior; no provider adapter or product feature was added.

## Confirmed controls and important residual risks

The renderer has context isolation, Node integration disabled, process sandboxing and a restrictive CSP. Model output is rendered as React text/limited formatting rather than arbitrary HTML. Provider actions pass through LAW tools; Codex's operator thread is read-only and host operations are disabled/rejected. The runtime uses rootless Podman, constrained mounts and no direct container network. Egress connects to already-checked DNS results. Budget/manual-login guards exist in the backend, not only the UI.

Residual risks requiring release judgment or roadmap work:

- The interactive Bash gate is not complete mediation of scripts, child processes or malicious direct socket users.
- Workspace data is writable, and browser/nested-agent profiles are shared by default. Connected accounts can be misused by an agent after login.
- Optional ntfy replies have no per-device authentication beyond server/topic access and a pending approval ID.
- Host Codex/configuration, local same-user processes and the shared kernel remain trusted dependencies.
- Unknown prices and a fixed cached-input discount make API cost estimates unsuitable as precise billing or a hard provider-side cap.
- Some event/client queues still need adversarial resource testing. Cancellation cannot reverse side effects or kill every detached process.
- Electron packaging/fuses/custom application protocol, image supply-chain verification and signed distribution are future work.
- Switching into manual mode mid-OAuth can lose required query parameters. The documented workaround avoids the transition, but the runtime fix is deferred.

## Validation

**Result: 341 tests passed; 11 opt-in container tests were skipped.** Typecheck and builds passed. One concurrent Chromium frame test timed out; it passed on isolated rerun and the complete suite passed with `--maxWorkers=1`. Container tests were not executed in this pass. Run `pnpm typecheck`, `pnpm test` and `pnpm build` with Node 24 on PATH. Focused tests exercise address forms, socket proxy behavior, renderer-origin checks, missing browser image, private history modes, redaction and image ownership. The pruning test uses fake commands and does not modify the host image store. A live Electron smoke check confirmed trusted IPC, daemon/workspace readiness, blocked popup creation, blocked navigation to a foreign local HTML fixture and successful container-browser startup. No model task was started.

The npm advisory check (`pnpm audit --json`) reported **zero advisories** across 170 reported dependencies on the review date. This does not include a security certification of OS packages, container Chromium, native binaries or the external Codex CLI. Existing dependencies were not broadly upgraded during this pass.

The candidate publication set contained 232 files at the final scan. It had no matches for Polish diacritics/common Polish strings or the selected private-key/provider-key/GitHub-token patterns, and no broken relative file links in the current documentation set. The same credential patterns had no matches in reachable Git history. This is a heuristic scan, not proof that every kind of secret is absent. Local `.impeccable` screenshots/reviews, environment files, logs and databases are excluded from candidate publication files. Ignoring a path does not erase a prior commit; historical credential-pattern checks are separate and heuristic. Do a final staged-content review immediately before pushing.

No live model task, user website sign-in, external message, GitHub publication or destructive Podman cleanup is needed for this review. Container tests require a separate host/image environment; skipped tests must not be described as executed.

## Reference basis

The Electron sender/navigation controls follow the [official Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security). IPv6 normalization covers the address representations and local ranges described in [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291.html). Provider sign-in documentation distinguishes [ChatGPT subscription access from API-key billing](https://learn.chatgpt.com/docs/auth).
