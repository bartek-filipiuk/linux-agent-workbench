# User guide

This guide describes the current source-build application. Planned functionality is listed separately in [ROADMAP.md](../ROADMAP.md).

## Install and launch

Follow the [README](../README.md#run-from-source) to install Node 24, pnpm, rootless Podman, dependencies and both worker images. Run the application as your ordinary desktop user, not root. Verify `node --version` reports v24 and `podman info` succeeds for that user. Native dependency builds need a compiler and Python; Electron also needs the desktop libraries supplied by your Linux distribution.

The repository is currently the application installation: `pnpm dev` builds protocol and daemon code and launches Electron. `pnpm build` builds all packages but does not create an installer. There is no supported one-click binary distribution yet.

The setup panel checks the provider account, Podman and terminal image. A successful terminal check does not prove the separate browser image has been built. If Browser cannot start, run `pnpm images:build:browser` and reconnect.

## Connect Codex

The default `.env.example` selects `LAW_PROVIDER=codex`. Expand the setup panel and choose **Sign in to Codex**. A system-browser window opens; complete sign-in yourself. **Cancel sign-in** stops the pending sign-in. If necessary, use **Recheck setup** afterward.

This is the host-side operator account. LAW creates a separate Codex home; an existing login in your normal Codex CLI or a coding agent inside the terminal is not automatically reused. `pnpm codex:status` checks this dedicated account. A supported ChatGPT account and available Codex quota are required; model access is account-dependent. No API key is needed for this path and no paid API fallback occurs.

To change providers, see [Configuration](CONFIGURATION.md). A provider selector and API-key editor in Settings are planned, not implemented.

## Choose a workspace

**Open workspace…** selects the directory mounted read/write at `/workspace` in the terminal container. Choose a dedicated project directory. The root filesystem and your entire home directory are rejected, but other sensitive directories are not automatically safe: keep credentials, personal documents and unrelated projects outside the selected directory.

The terminal session is associated with the workspace path. Switching workspaces requires finishing or stopping the active task. A task paused at a limit still counts as active.

A Git workspace gets a pre-run snapshot of tracked state. The agent still writes directly into that workspace: the snapshot is a recovery aid, not an authorization boundary or a backup of every file.

## Prepare a task

Choose **New task**. State the outcome, relevant site or file, output location, and any constraints. For example:

> Read the project's README and list the remaining setup steps. Save a short checklist to setup-notes.md. Do not install packages or contact external services.

The goal supports up to 4,000 characters. It grows as you type; **Expand editor** uses more of the workspace. **Back to preview** or Escape returns to the ordinary layout. Settings scroll independently while **Start task** stays visible. The draft is saved separately for each workspace.

### Working style

| Style | What it changes | Good fit |
| --- | --- | --- |
| General | Lets the operator choose browser and terminal actions as needed | Mixed tasks and ordinary browsing |
| Research & data | Reads sources in the browser, saves captured material with provenance, and works in batches | Collecting and comparing information |
| Build with a coding agent | Asks the operator to coordinate another coding agent in the terminal and inspect its work | Work requiring a separately configured terminal coding agent |

**Compare working styles** displays the legend. These are prompt instructions, not guaranteed outcomes or fixed numbers of steps. They do not select the Codex model or reasoning effort. The third style requires the nested coding agent's own installation, login, quota and permissions; it is not another selectable operator provider.

### Model and reasoning

Expand **Model & reasoning**. With Codex, the model list comes from the authenticated account. Choose a model, then a supported effort level. For example, select Astra and `medium` if your account exposes them. Unsupported models/efforts block Start instead of silently choosing something else. **Refresh** reloads the catalog.

Choosing the configured/default entry preserves the environment or dedicated Codex configuration. Explicit selections are saved for later tasks and do not change an already running task. API mode uses environment configuration instead of this Codex catalog.

### Steps, time and spending

Defaults are **No step limit** and **30 minutes active time**. A step is one operator response; it can request multiple tools. No step limit also removes LAW's tool-call cap. For a custom cap, the UI shows the effective tool allowance: the greater of 200 or three times the step limit.

Use **No time limit** separately if desired. Custom values accept 1–10,000 steps or 1–1,440 minutes. Clearing a field does not replace it with another number; invalid values block Start. The selected style and limits are remembered.

Limits are checked between calls. An in-flight model request or tool can finish after the time threshold. Waiting for approvals, human handoff or a budget extension does not consume active time. The visible elapsed clock includes waiting, so it can be longer than the active-time budget.

Codex cost displays `n/a`; this is not zero usage. Subscription quota still applies. API cost is an estimate only when configured prices are known; its separate allowance starts at $10. The estimator currently assumes cached input costs 10% of the configured input price, which is not universal. Do not use it as a precise invoice or a provider-enforced spending cap.

## Monitor, pause and stop

The task panel shows model waiting, tool execution, pending approvals and the final result. The activity log follows new entries until you scroll away. **Follow latest** or **Show result** returns to the newest content; the update counter includes changes to existing tool entries. The UI keeps a bounded recent log, while stored history has its own retention.

**Take control** transfers the surface lease to you. A model response already in flight may finish before the agent parks. Wait for the handoff state before assuming the provider is no longer receiving observations. **Log in manually** performs this parking handshake before switching browser mode.

At a step/tool limit, use **Add 100 steps** or **Continue without a step limit**. At a time limit, use **Add 30 minutes** or **Continue without a time limit**. API spending has its own explicit increase. These actions preserve the same live task and do not reset the other limits. The agent must observe again before using actions planned before the pause.

**Stop task** aborts the operator and asks the worker to cancel current work. It does not undo external actions or guarantee termination of every detached process previously started in the sandbox. Inspect the terminal if a nested process remains running. **Destroy sandbox** stops/removes the workspace containers and disconnects the session; it does not erase the workspace or all persistent volumes.

Reloading only the renderer recovers the current UI snapshot. Closing/restarting the entire app interrupts active work. The latest conversation in the reopened workspace is restored without automatically running the agent; send a follow-up to continue it.

### Follow-ups and interruption

The message field below the activity log stays available while the agent works and after it finishes. **Interrupt & send** stops the current run, waits for its cleanup and outstanding browser actions, then sends your message in the same conversation. **Pause** stops work without sending anything; use **Continue** when ready. Enter inserts a line break; Ctrl+Enter (Cmd+Enter on macOS) sends. A draft is retained until the service accepts it.

Continuation preserves the workspace, provider context, model/effort and accumulated limits. Reaching an existing limit still pauses for an explicit extension. **New task** starts an independent conversation with fresh limits. Each continuation remains a separate audited run and has its own pre-run Git snapshot.

New Codex conversations use durable threads in LAW's isolated Codex home. API continuations use the preceding stored Response and supply outstanding tool results. Older tasks created before durable continuation are reconstructed from bounded saved task/result/tool records; their full original provider context cannot be recovered. If a provider no longer has a stored conversation, the error is shown; LAW does not silently switch provider or replay the task.

The agent is instructed to inspect the current browser/terminal and reread relevant workspace files after interruption. A stopped RPC does not undo a click or stop a program already launched in the terminal. An action with an uncertain outcome must be checked before repeating it. Previous browser element references and in-memory research capture IDs expire between runs; saved Markdown files remain available at their workspace paths.

## Browser and account sign-in

Choose **Browser** or **Both**, then **Open browser**. The preview belongs to a separate Chromium container. It is not your everyday browser profile. **Tab / window** switches pages and popups; **Refresh preview** retries the image stream.

For account sign-in:

1. Open the site's ordinary home or sign-in page.
2. Choose **Log in manually** and wait for the agent to park.
3. Use the full Chromium window shown inside the preview, including its own address bar, popups and dialogs. Complete password entry, two-factor authentication or CAPTCHA yourself.
4. Choose **Finish manual login**. The profile preserves the login.
5. Resume the task explicitly. If it is paused at a budget, use the corresponding budget action.

In manual mode the automated Playwright context is closed. LAW shows the full container browser through Xvfb/Openbox capture; it does not attach Playwright/CDP to that manual browser. This does not guarantee that every provider accepts a remote Linux browser. Cookies and sessions remain sensitive after login, and the resumed agent can act with those accounts' permissions.

**OAuth limitation:** switching modes strips query/fragment credentials from the saved return URL. If you switch in the middle of a parameterized OAuth URL, it may reopen an incomplete endpoint and show `400 malformed`. Start manual mode from the site's ordinary page, then initiate OAuth inside manual mode. Preserving safe in-memory transition URLs is tracked in the roadmap.

The browser profile is currently shared across workspaces by default. Signing into a site therefore does not create a workspace-isolated account. Do not assume that changing workspace signs you out.

### Keyboard controls

- Tab/Shift+Tab move between app controls and leave the preview.
- **Page Tab**, **Page Shift+Tab**, and **Page Esc** send those keys to the remote page.
- Ctrl/Cmd+L from the ordinary preview focuses LAW's address field. In manual mode use Chromium's displayed address bar.
- The panel divider supports pointer dragging and ArrowLeft/ArrowRight/Home/End when focused.
- View tabs support arrows/Home/End. The terminal remains mounted across view changes.

## Approvals and Settings

Settings currently exposes network mode, nested-agent permissions, domain policy, diagnostics and sandbox destruction. It does not provide a general provider/account configuration screen yet.

The shell gate classifies commands typed into its instrumented interactive Bash session. Read-only commands commonly proceed automatically; risky categories produce an approval card. Review the command and reason, then choose **Allow once**, **Allow for this run** where offered, or **Deny**. Session approval means the rule remains allowed for that run, not necessarily just one literal command. Some categories do not offer it. Expired approvals deny by default.

**AGENTS autonomous** permits nested-agent permission-bypass startup flags under the existing policy. **Supervised** asks before those flags. This does not turn the shell gate into inspection of every child process; scripts and nested processes have the capabilities of the container and mounted data.

**DOMAINS open** permits public destinations through the proxy. **Ask** requests permission for a new hostname during an active run. Hostnames are exact: subdomains are separate. The domain card's options can have domain-specific scope, including remembering a host for the workspace; read its displayed explanation rather than assuming shell-rule semantics. Human traffic outside an active task is not prompted the same way.

**NET none** disables the sandbox proxy. The host-side model provider still needs network connectivity. Changing the network selection may show **Pending**; use **Apply to this session** once the run and approvals are finished. Never infer that the selected preference has already changed an active session.

## History and output

**History & results** opens the task view; **Recent tasks** shows up to 30 tasks for this workspace. Select an entry to see saved information. **Draft new task from result** prepares an independent goal from that entry. To preserve the current conversation, use the message field below the activity log. A dedicated browser for earlier conversations is planned separately.

A completed result offers **Copy result**, **Show output…**, and **Workspace changes**. Output paths must resolve inside the workspace. Workspace changes shows the current Git working tree, including changes made by you. **Restore pre-run state** is available when a Git snapshot exists and asks for confirmation; it restores tracked state and leaves untracked files alone. It cannot undo website activity, sent messages or remote pushes.

Run data older than 30 days is pruned at startup. Persistent browser/nested-agent profiles, workspace files, Codex conversation files and preferences have separate lifecycles and are not automatically erased by history pruning.

### Recovering an unresponsive browser

Use **Refresh preview** when the page image stops updating. **Restart browser** is an independent recovery control that also works while a mode switch is stuck. It stops the agent and replaces only the browser container; the app, terminal processes, workspace and saved browser profile remain. Unsaved forms and recent login changes may be lost, so the UI asks before restarting. Resume explicitly afterward.

Human input is best effort. A page that is busy delays it; consecutive pointer moves collapse into the latest one, wheel ticks add up, and key or button releases are never dropped. Input that waits more than 15 seconds is noted under Connection details but does not quarantine the browser. Mode switches have a 45-second deadline; a switch or recovery that hangs marks the browser unresponsive, and **Refresh preview** probes it again and clears that mark once the page answers. A browser action whose outcome cannot be confirmed requires **Restart browser** before continuation. A static page image alone never triggers an automatic hard restart.

The sandbox browser presents the host's locale and time zone (for example `pl-PL` and `Europe/Warsaw`). Sites behind bot protection such as DataDome (allegro.pl) serve a captcha to a browser whose language and clock do not match its IP address.

## Maintenance and diagnostics

Use Settings → diagnostics to collect a report, watch progress or cancel. Reports contain versions, container metadata, settings and a redacted log tail. Review them before sharing: redaction is heuristic and paths, commands or account-related context can still be sensitive. Do not attach raw SQLite databases, profiles or authentication files to GitHub issues.

`pnpm images:build` and `pnpm images:build:browser` rebuild their workers and pin local image IDs. Their cleanup removes only eligible LAW-tagged images; foreign/shared tags and unidentified build cache are retained. `pnpm images:prune` invokes the same cleanup. Images used by containers are kept. If storage exceeds the build script's ceiling, inspect it yourself rather than globally pruning unrelated projects.

Storage checks use the configured local Podman graph root and allocated filesystem blocks, not the sum of virtual image sizes. They require 5 GB free on both relevant filesystems and cap the full local container store at 14 GB, including profiles and orphaned layers. A failed measurement stops the build check; it is never treated as zero usage. `node scripts/check-storage.mjs after-build` reruns the check without building or deleting anything. Very old Podman versions can retain orphaned build layers that image pruning does not remove; inspect their dependencies before any manual cleanup.

Containers can survive window closure and reconnect to the existing terminal session. Startup maintenance stops sufficiently old idle LAW containers; persistent volumes are kept. Removing a container is not a logout or account-data deletion operation. Manage named volumes explicitly with Podman when you intend to remove saved credentials, after stopping the application and relevant containers.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Start is disabled | Setup readiness, workspace connection, model availability, nonempty goal, valid limits, and manual-login state |
| Codex CLI cannot start | Install the CLI; verify `codex --version`; set an absolute `LAW_CODEX_BIN` if PATH uses another Node installation |
| Signed in elsewhere, app says signed out | LAW uses its own Codex home. Sign in through LAW or `pnpm codex:login` |
| Text works but tools fail with `code-mode host is disabled` | Use the current LAW code and a compatible CLI. The integration enables the Code Mode host while disabling built-in host-action tools |
| Model disappeared or effort is invalid | Refresh the catalog and choose a supported combination |
| Subscription quota exhausted | Wait for quota recovery or change configuration explicitly; LAW will not switch to paid API automatically |
| Browser cannot start or manual button is absent | Build the browser image; check its pinned ID and Podman logs |
| `400 malformed` during OAuth | Start manual mode from the site's ordinary page, then begin login inside manual Chromium |
| Preview is blank or frozen | Bring the app to the foreground, leave expanded editing, refresh preview, and check the browser status |
| Browser shows `Page crashed` | Take browser control and choose **Recover tab**. This opens the tab's address afresh, retains the profile/cookies, and does not replay clicks or submit forms. Unsaved page input can be lost. Other tabs remain open |
| Terminal stops updating or seems unresponsive | Choose **Reconnect display** in the terminal panel. This clears local display scrollback, returns pending flow-control credit and repaints tmux without closing its shell or nested coding agent. A missing display acknowledgment produces a warning after five seconds |
| `node:sqlite` unavailable | Run the project and test subprocesses with Node 24 on PATH |
| `node-pty` installation fails | Install your distribution's compiler toolchain and Python, then reinstall using Node 24 |
| Sandbox cannot reach a site | Check applied NET mode, domain approval, and whether the tool honors the HTTP proxy; private/LAN destinations are blocked |
| SSH cannot connect | Provision dedicated keys/known_hosts in `law-ssh`; SSH uses the shipped proxy command, not direct sandbox networking |
| API key change seems ignored | A decryptable saved key takes precedence over `.env`; see the configuration guide before replacing saved credentials |

When reporting a non-sensitive bug, include distribution, Node/Podman/Codex versions, provider mode, steps to reproduce, expected/actual behavior and sanitized diagnostics. Use the private reporting guidance in [SECURITY.md](../SECURITY.md) for security issues.

Browser containers have a **4 GiB memory limit** and a separate 1 GB shared-memory mount (shared memory still counts toward the container's total). Heavy sites can still exhaust this budget. Rebuild the browser image and reconnect to replace an older container using the former 2 GiB limit. A completed agent response does not certify that every external action succeeded or that the browser is healthy; a crashed tab remains visibly flagged until recovered.


## Research from browser pages

The agent can read the currently open page using `browser_read`, including paragraphs, lists, readable table rows, links, dynamically rendered text, open shadow DOM and visible embedded frames. It uses the existing browser session; it does not fetch the page URL through a separate HTTP client. `browser_observe` still describes controls for navigation and interaction.

`browser_save` writes a captured source to a unique `research-<label>-<id>.md` file at the workspace root, with source URL, capture time and any truncation warnings. It returns a `/workspace/...` path that terminal tools and interactive coding agents can read. Saving does not require a clipboard or Save Page dialog. The browser container itself still has no workspace mount. Existing files are never overwritten.

For example: “Search Google in the browser for information about this topic. Open the original sources, read them with browser_read, and save them with browser_save. Then start interactive Claude Code in the terminal and ask it to build a page from those saved files. Do not fetch source URLs through scripts.” The Research working style follows this flow by default; browser-only instructions also apply in other styles.

Reading defaults to the first visible main/article region; the agent can request `scope=page` when content is missing. A capture is capped at 200,000 characters, 16 frames, 20,000 visited nodes per frame and depth 100. Content beyond a limit is marked incomplete. Responses default to 10,000 characters (maximum 20,000) and provide a snapshot ID and continuation offset. Continuing a snapshot reads the same captured text even after navigation. Saving writes the full capture, including portions not returned in the first response; it does not imply the model has reviewed every portion. Only the latest eight captures are held in memory during a run; they do not survive a new run or app restart unless saved.

The reader excludes hidden content, editable fields and password values; it does not export cookies or storage. Known credential-like URL parameters are removed. Visible account information on a page can still be included, so select sources appropriate for your task. Source text remains untrusted data, including when passed to a nested coding agent.

Infinite feeds and collapsed sections require scrolling/expansion and a new capture. Canvas-only content and text inside images require visual inspection. Reading is not a login, CAPTCHA or access-control bypass. To update an existing installation, rebuild the app and browser image (`pnpm build`, `pnpm images:build:browser`) and restart the application so it uses the new worker and tools.


### Submitting prompts to terminal applications

`terminal_input` with `submit=true` waits briefly for the text/paste to settle before sending one separate Enter. If rendering does not settle, or a permission/password prompt appears, it leaves the text in place and does not submit it. Cancellation also prevents a delayed Enter.

Long terminal waits check for input prompts at intervals of at most two seconds. If a current pasted draft is still visible, the result reports `inputStatus=pending`; if Enter was withheld, it reports `inputStatus=not_submitted`. These are not completion signals. The agent must inspect the prompt before continuing and must not paste the task again or blindly resend Enter. The application does not automatically retry submission. Detection is based on the visible terminal screen and is not a universal acknowledgment protocol for every TUI.
