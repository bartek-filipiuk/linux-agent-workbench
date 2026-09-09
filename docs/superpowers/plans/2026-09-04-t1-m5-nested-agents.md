# T1 Milestone 5 — terminal_wait, screen-state hints, nested-agent acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The agent stops polling: `terminal_wait` returns when the screen settles or a pattern appears, and every observation carries a `hint` telling the model whether the screen is busy, an idle shell, a nested agent waiting for input, a question menu it may answer with arrow keys, or a permission/password prompt that belongs to the human. A mock TUI fixture proves the whole loop with the fake model; the real acceptance is Claude Code in the sandbox with the user logged in.

**Architecture:** `classifyScreen()` lives in `@law/protocol` (pure text heuristics, shared). The worker computes `hint` inside `observe()` and implements `terminal.wait` on top of its output revision. agentd's `NestedPromptPolicy` reuses the classifier (states `permission_prompt` and `password_prompt` hand off; `question_menu` is answerable). A new tool `terminal_wait` and prompt rules teach the model the protocol. `fixtures/terminal/mock-agent.mjs` imitates Claude Code's input box, spinner, question menu and permission prompt for tests.

**Spec:** §7.7 (added today), §7.4, §8.2, §14.4.

## Global Constraints

- M1–M4 constraints apply.
- `terminal_wait` args: `idleMs` default 1500 max 30000; `timeoutMs` default 60000 max 180000; `until` regex source max 200 chars, compiled with flags `im`, invalid regex → INVALID_INPUT. Result: the observation plus `timedOut: boolean` and `matched: boolean`.
- `hint.state ∈ busy | idle_shell | nested_agent_idle | question_menu | permission_prompt | password_prompt | unknown`; `hint.options` only for `question_menu` (labels without markers, max 12).
- Classification order: password_prompt → permission_prompt → question_menu → busy → nested_agent_idle → idle_shell → unknown; evaluated on the last 40 non-empty lines.
- Generic `[Y/n]` / `(y/n)` confirmations are `question_menu` (the gate already vetted the command that asks); Claude Code / Codex / sudo prompts stay `permission_prompt`.

## File structure

```
packages/protocol/src/screen-state.ts, test/screen-state.test.ts     classifyScreen, ScreenHint schema
packages/protocol/src/terminal.ts                                    TerminalWaitInput, TerminalObservation.hint, TerminalWaitResult
services/terminal-worker/src/terminal-session.ts                     hint in observe(), wait()
services/terminal-worker/src/server.ts                               terminal.wait
services/terminal-worker/test/terminal-session.test.ts               wait + hint tests (with the mock TUI)
fixtures/terminal/mock-agent.mjs                                     mock nested agent TUI
services/agentd/src/worker/{types,socket-worker}.ts                  wait()
services/agentd/src/tools/terminal-tools.ts                          terminal_wait tool
services/agentd/src/policy/nested-prompts.ts                         via classifyScreen
services/agentd/src/orchestrator/system-prompt.ts                    wait / hint / menu rules
services/agentd/test/helpers/fake-worker.ts                          terminal.wait
services/agentd/test/nested-tui.test.ts                              fake model drives the mock TUI end to end
apps/desktop/src/renderer/App.tsx                                    banner shows the hint state (optional, small)
```

---

### Task 1: classifyScreen + protocol schemas

- Test `packages/protocol/test/screen-state.test.ts`: table of screens → state (Claude Code menu with `❯ 1.` lines → question_menu with options; Claude Code "Do you want to proceed?" → permission_prompt; `[sudo] password` → password_prompt; spinner `⠋ Thinking… (esc to interrupt)` → busy; Claude Code input `│ > │` + "? for shortcuts" → nested_agent_idle; `agent@law:/workspace$ ` → idle_shell; apt `Do you want to continue? [Y/n]` → question_menu; random text → unknown).
- Implement `classifyScreen(screen: string): ScreenHint`; add `ScreenHint` Zod, `TerminalObservation.hint` (optional for backward compat), `TerminalWaitInput`, `TerminalWaitResult = TerminalObservation & { timedOut, matched }`.
- Commit: "Add screen-state classifier and terminal_wait schemas".

### Task 2: worker wait + hint, mock TUI fixture

- `fixtures/terminal/mock-agent.mjs`: raw-mode stdin; states: input box (`│ > │`, footer `? for shortcuts`), after Enter on a task: spinner 1.2 s (`⠋ Working… (esc to interrupt)`), then menu `? Which approach?` with `❯ 1. Fast path` / `  2. Careful path` (UP/DOWN move, Enter selects), then permission prompt `Mock wants to run \`touch hello.txt\`\nDo you want to proceed?\n❯ 1. Yes\n  2. No (esc)` (Enter on Yes or `1` → creates `hello.txt` in cwd, prints `Done: created hello.txt`), back to input box; `q` at the input box exits.
- `TerminalSession.wait(input)`: resolve on quiet ≥ idleMs after last data, or `until` match against observe().screen (checked on every data burst and at idle), or timeout; `observe()` fills `hint` via classifyScreen. `WorkerServer` handles `terminal.wait`.
- Tests in `terminal-session.test.ts`: `wait` returns once quiet with `hint.state === "idle_shell"`; running `node mock-agent.mjs` → wait shows `nested_agent_idle`; typing a task then `wait({ until: "Which approach" })` → `question_menu` with two options; DOWN + ENTER → wait → `permission_prompt`; `1` + ENTER → `wait({ until: "Done:" })` → `matched: true`, file exists.
- Commit: "Add terminal.wait, screen hints and a mock nested-agent TUI".

### Task 3: agentd tool, policy and end-to-end with the fake model

- `TerminalWorker.wait`, `SocketTerminalWorker.wait`, FakeWorker `terminal.wait` (returns immediately).
- `terminal_wait` tool spec + executor; system prompt: use `terminal_wait` after every input instead of repeated observes; read `hint.state`; answer `question_menu` with UP/DOWN/ENTER after reading `options`; never answer `permission_prompt`/`password_prompt`; when `nested_agent_idle` after a task, the nested agent is done or waiting for the next instruction.
- `NestedPromptPolicy` → `classifyScreen` states.
- `services/agentd/test/nested-tui.test.ts`: real `TerminalSession` + `WorkerServer` (from `@law/terminal-worker` via a vitest alias) + `SocketTerminalWorker` + `RunController` with `composePolicies(LeasePolicy, NestedPromptPolicy)` and a scripted `FakeModelAdapter`: `node mock-agent.mjs` → wait → task text + ENTER → wait until "Which approach" → DOWN, ENTER → wait → (policy) permission prompt blocks the next ENTER → handoff → test writes `1\r` as the human → resume → wait until "Done:" → final text. Assert handoff happened once, `hello.txt` exists, run completed.
- Commit: "Add terminal_wait tool, hint-aware policy and the nested TUI end-to-end test".

### Task 4: UI touch and image

- Banner: when the handoff reason mentions a prompt state, show it; bottom bar shows last `hint.state` from `run.tool`? Skip unless trivial. Rebuild image (`pnpm images:build`) because the worker changed; container tests; `pnpm typecheck && pnpm test && pnpm build`.
- Commit, merge to main.

### Task 5: Manual acceptance with Claude Code (with Bartek)

1. `pnpm dev`, open workspace `/home/developer/law-demo-ws`, "Take control", type `claude`, complete the login flow inside the container (the URL from the TUI opened on the host; the token lands in the `law-auth-claude` volume). Exit claude, "Give control back".
2. Goal: "Run `claude` in the terminal, ask it to create hello.txt containing the word hello, wait for it to finish, then run ls -al and report."
3. Expected: `terminal_wait` calls instead of observe storms; on Claude Code's permission prompt the run hands off with the prompt state in the banner; you answer, give control back; the agent verifies with `ls -al`.
