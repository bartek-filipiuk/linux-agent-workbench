# T1 Milestone 4 — Command gate, approvals, nested-prompt handoff, git snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every command that the interactive shell in the sandbox is about to run passes through agentd's policy first. Read-only commands run untouched, risky ones wait for the user's approval in the drawer, bypass flags for nested agents are refused, commands typed by the human are allowed and logged. When a nested tool (Claude Code, Codex, sudo) shows a permission or password prompt, the agent's next keystroke is blocked and the run hands off to the human. Every run on a git workspace records a pre-run snapshot that one button restores.

**Architecture:** In the image, `/etc/bash.bashrc` installs a `DEBUG` trap that runs `/opt/law/gate.js "$BASH_COMMAND"`; the client speaks newline-delimited JSON to `/run/law/gate.sock`, served by the terminal worker, which forwards each check as a `gate.check` request over the existing worker connection to agentd. agentd's `CommandGate` combines the lease (human → allow), `classify()` rules (auto / log / approval / deny) and an `ApprovalManager` that asks the UI and waits with a TTL. `NestedPromptPolicy` inspects the current screen before each agent `terminal_input`; a match returns a denial that carries a handoff reason, and `RunController` turns that into the existing handoff flow. `snapshotWorkspace()` / `restoreSnapshot()` wrap `git stash create` and `git checkout`.

**Tech Stack:** unchanged. `gate.js` is dependency-free Node so it starts in ~40 ms.

**Spec:** `docs/superpowers/specs/2026-09-04-terminal-stage-design.md` §7 (all of it), §9 approval card, §11 security tests.

## Global Constraints

- M1–M3 Global Constraints still apply.
- Gate wire format (gate.js ↔ worker): one JSON line request `{ "command": string, "cwd": string, "pid": number }`, one JSON line reply `{ "decision": "allow" | "deny", "reason"?: string }`. Client timeout 180 s → deny. Worker with no agentd client connected → deny (`no policy connection`). The gate is fail-closed.
- Worker → agentd request `gate.check { command, cwd, pid }` → reply payload `{ decision, reason? }`. agentd's `SocketTerminalWorker` gains `onRequest(type, handler)`.
- Buckets: `auto` (prefix allowlist), `deny` (nested-agent bypass flags), `approval` (regex rules with a category), `log` (everything else). Evaluated in that order; `network`-tagged approval rules are skipped when `networkMode === "none"`.
- Approval TTL 120 s; `once` binds to `sha256(command)`; `session` remembers the rule id for the rest of the current run; `deny` and timeout deny. Every decision is a `run_events` row when a run is active.
- Nested-prompt regexes (case-insensitive, on the current screen text): `Do you want to proceed\?`, `Yes, allow`, `Esc to cancel`, `don't ask again`, `Allow command\?`, `Approve\b`, `Would you like to run`, `\[sudo\] password`, `^Password:\s*$` (multiline). A match blocks only agent `terminal_input`; observe and interrupt stay allowed.
- Git snapshot: `{ head: string | null, stash: string | null }`; restore = `git checkout <head> -- .` when head exists, then `git stash apply <stash>` when stash exists. Untracked files are not covered (documented ceiling).
- Gate hook ceiling (documented in the image): interactive bash only; `bash -c`, scripts, other shells and processes spawned by nested agents are governed by the container, not the gate.

---

## File structure

```
images/terminal/gate.js                       dependency-free client for the DEBUG trap
images/terminal/bash.bashrc                   trap installation (interactive shells, only when gate.sock exists)
services/terminal-worker/src/gate-server.ts   GateServer: newline JSON on gate.sock, forwards via a handler
services/terminal-worker/src/server.ts        WorkerServer gets a gate forwarder (request to the current client)
services/terminal-worker/src/main.ts          starts GateServer
services/terminal-worker/test/gate-server.test.ts
services/agentd/src/worker/socket-worker.ts   onRequest(type, handler)
services/agentd/src/policy/rules.ts           classify(), RULES, AUTO_PREFIXES
services/agentd/src/policy/approvals.ts       ApprovalManager
services/agentd/src/policy/gate.ts            CommandGate
services/agentd/src/policy/nested-prompts.ts  NESTED_PROMPT_PATTERNS, detectNestedPrompt, NestedPromptPolicy, composePolicies
services/agentd/src/policy/types.ts           PolicyDecision gains handoff?: string
services/agentd/src/orchestrator/run-controller.ts   denial with handoff → handoff flow; system prompt addition
services/agentd/src/session/snapshot.ts       snapshotWorkspace, restoreSnapshot
services/agentd/src/storage/store.ts          createApproval, decideApproval, getRun snapshot helpers
services/agentd/src/ipc.ts                    approval.decide, run.restore; approval.request/resolved, gate.event, run.restored
services/agentd/test/{rules,approvals,gate,nested-prompts,snapshot,socket-worker}.test.ts (+ run-controller, daemon-run additions)
tests/container/gate-container.test.ts        real bash hook in the image
apps/desktop/src/{main,preload}               new channels
apps/desktop/src/renderer/{App,RunDrawer,ApprovalCard}.tsx, styles.css
```

---

### Task 1: Worker gate server and gate.js client

**Files:**
- Create: `services/terminal-worker/src/gate-server.ts`, `services/terminal-worker/test/gate-server.test.ts`, `images/terminal/gate.js`
- Modify: `services/terminal-worker/src/server.ts`, `services/terminal-worker/src/main.ts`, `services/terminal-worker/src/index.ts`, `images/terminal/bash.bashrc`, `images/terminal/Containerfile`

**Interfaces:**
- Produces:
  ```ts
  type GateRequest = { command: string; cwd: string; pid: number }
  type GateDecision = { decision: "allow" | "deny"; reason?: string }
  class GateServer { constructor(socketPath: string, check: (req: GateRequest) => Promise<GateDecision>); listen(): Promise<void>; close(): Promise<void> }
  // WorkerServer
  forwardGate(req: GateRequest): Promise<GateDecision>   // request("gate.check") on the current client, 180 s; no client → deny
  ```

- [ ] **Step 1: Failing test**

`services/terminal-worker/test/gate-server.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { GateServer } from "../src/gate-server.js";

let server: GateServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

function ask(sock: string, req: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = net.createConnection(sock);
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString();
      if (buf.includes("\n")) {
        s.end();
        resolve(buf.trim());
      }
    });
    s.on("error", reject);
    s.on("connect", () => s.write(JSON.stringify(req) + "\n"));
  });
}

describe("GateServer", () => {
  it("answers one JSON line per connection with the handler's decision", async () => {
    const sock = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-gate-")), "g.sock");
    const seen: unknown[] = [];
    server = new GateServer(sock, async (req) => {
      seen.push(req);
      return req.command.startsWith("rm") ? { decision: "deny", reason: "needs approval" } : { decision: "allow" };
    });
    await server.listen();
    expect(JSON.parse(await ask(sock, { command: "ls", cwd: "/workspace", pid: 1 }))).toEqual({ decision: "allow" });
    expect(JSON.parse(await ask(sock, { command: "rm -rf x", cwd: "/workspace", pid: 1 }))).toEqual({ decision: "deny", reason: "needs approval" });
    expect(seen).toHaveLength(2);
  });

  it("denies malformed requests and handler failures", async () => {
    const sock = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-gate-")), "g.sock");
    server = new GateServer(sock, async () => { throw new Error("boom"); });
    await server.listen();
    expect(JSON.parse(await ask(sock, "garbage"))).toMatchObject({ decision: "deny" });
    expect(JSON.parse(await ask(sock, { command: "x", cwd: "/", pid: 2 }))).toMatchObject({ decision: "deny", reason: expect.stringContaining("boom") });
  });
});
```

- [ ] **Step 2: Run to see it fail** — `pnpm vitest run services/terminal-worker/test/gate-server.test.ts` → module not found.

- [ ] **Step 3: Implement**

`services/terminal-worker/src/gate-server.ts`:
```ts
import fs from "node:fs";
import net from "node:net";

export type GateRequest = { command: string; cwd: string; pid: number };
export type GateDecision = { decision: "allow" | "deny"; reason?: string };

const MAX_LINE = 64 * 1024;

export class GateServer {
  private readonly server = net.createServer((s) => this.accept(s));

  constructor(
    private readonly socketPath: string,
    private readonly check: (req: GateRequest) => Promise<GateDecision>,
  ) {}

  listen(): Promise<void> {
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.socketPath, () => {
        fs.chmodSync(this.socketPath, 0o600);
        resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((r) => this.server.close(() => r()));
  }

  private accept(socket: net.Socket): void {
    let buf = "";
    let answered = false;
    const reply = (d: GateDecision) => {
      if (answered) return;
      answered = true;
      socket.end(JSON.stringify(d) + "\n");
    };
    socket.on("error", () => {});
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.length > MAX_LINE) return reply({ decision: "deny", reason: "request too large" });
      const nl = buf.indexOf("\n");
      if (nl < 0) return;
      let req: GateRequest;
      try {
        const parsed = JSON.parse(buf.slice(0, nl)) as Partial<GateRequest>;
        if (typeof parsed.command !== "string" || typeof parsed.cwd !== "string" || typeof parsed.pid !== "number") throw new Error("bad shape");
        req = { command: parsed.command, cwd: parsed.cwd, pid: parsed.pid };
      } catch {
        return reply({ decision: "deny", reason: "malformed gate request" });
      }
      this.check(req).then(reply, (e) => reply({ decision: "deny", reason: `gate error: ${e instanceof Error ? e.message : String(e)}` }));
    });
  }
}
```

In `services/terminal-worker/src/server.ts` add to `WorkerServer`:
```ts
  async forwardGate(req: { command: string; cwd: string; pid: number }): Promise<{ decision: "allow" | "deny"; reason?: string }> {
    const conn = this.current;
    if (!conn || conn.closed) return { decision: "deny", reason: "no policy connection" };
    try {
      const r = await conn.request("gate.check", req, { timeoutMs: 180_000 });
      return r.decision === "allow" ? { decision: "allow" } : { decision: "deny", reason: typeof r.reason === "string" ? r.reason : "denied by policy" };
    } catch (e) {
      return { decision: "deny", reason: e instanceof Error ? e.message : String(e) };
    }
  }
```

`services/terminal-worker/src/main.ts` — after `await server.listen();`:
```ts
import { GateServer } from "./gate-server.js";
// ...
const gate = new GateServer(path.join(socketDir, "gate.sock"), (req) => server.forwardGate(req));
await gate.listen();
console.log(`terminal-worker gate on ${path.join(socketDir, "gate.sock")}`);
```
and add `gate.close()` to `shutdown`. Export `GateServer` from `src/index.ts`.

`images/terminal/gate.js` (plain CommonJS, no deps):
```js
#!/usr/bin/env node
// Policy gate client for the bash DEBUG trap. Fail-closed: any error or timeout denies the command.
"use strict";
const net = require("net");
const sock = process.env.LAW_GATE_SOCKET || "/run/law/gate.sock";
const command = process.argv.slice(2).join(" ");
if (!command.trim()) process.exit(0);
const req = JSON.stringify({ command, cwd: process.cwd(), pid: process.ppid }) + "\n";
const deny = (reason) => {
  process.stderr.write(`law: command blocked: ${reason}\n`);
  process.exit(1);
};
const timer = setTimeout(() => deny("approval timed out"), 180_000);
const s = net.createConnection(sock);
let buf = "";
s.on("connect", () => s.write(req));
s.on("error", (e) => deny(`gate unavailable (${e.code || e.message})`));
s.on("data", (d) => {
  buf += d.toString();
  const nl = buf.indexOf("\n");
  if (nl < 0) return;
  clearTimeout(timer);
  let r;
  try { r = JSON.parse(buf.slice(0, nl)); } catch { return deny("bad gate reply"); }
  if (r.decision === "allow") process.exit(0);
  deny(r.reason || "denied by policy");
});
s.on("end", () => { if (!buf.includes("\n")) deny("gate closed"); });
```

`images/terminal/bash.bashrc` (replace):
```bash
# Linux Agent Workbench terminal image.
if [ -n "$PS1" ]; then
  PS1='\[\e[1;34m\]agent@law\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
  export HISTFILE=/tmp/.bash_history
  # Policy gate: every simple command of this interactive shell is checked by agentd before it runs.
  # Ceiling: bash -c, scripts, other shells and nested agents' own processes are not covered; the
  # container, mounts and network profile are the boundary for those.
  if [ -S /run/law/gate.sock ]; then
    shopt -s extdebug
    __law_gate() { node /opt/law/gate.js "$BASH_COMMAND" || return 1; }
    trap '__law_gate' DEBUG
  fi
fi
```

Containerfile: add `COPY images/terminal/gate.js /opt/law/gate.js` before the bashrc copy.

- [ ] **Step 4: Verify** — `pnpm vitest run services/terminal-worker && pnpm --filter @law/terminal-worker typecheck` → gate-server 2 passed, previous 9 still green.

- [ ] **Step 5: Commit** — `git add images services/terminal-worker && git commit -m "Add gate socket server, gate client and bash DEBUG trap"`

---

### Task 2: agentd — classification rules, approvals, command gate

**Files:**
- Create: `services/agentd/src/policy/rules.ts`, `services/agentd/src/policy/approvals.ts`, `services/agentd/src/policy/gate.ts`, tests `rules.test.ts`, `approvals.test.ts`, `gate.test.ts`
- Modify: `services/agentd/src/storage/store.ts` (approval rows), `services/agentd/src/worker/socket-worker.ts` (`onRequest`), `services/agentd/src/worker/types.ts`, `services/agentd/test/socket-worker.test.ts`, `services/agentd/src/index.ts`

**Interfaces:**
```ts
type Bucket = "auto" | "log" | "approval" | "deny"
type Rule = { id: string; category: ApprovalCategory; pattern: RegExp; summary: string; network?: boolean; noSession?: boolean }
type Classification = { bucket: Bucket; ruleId?: string; category?: ApprovalCategory; summary?: string }
function classify(command: string, ctx: { networkMode: NetworkMode }): Classification
const RULES: Rule[]; const DENY_RULES: Rule[]; const AUTO_PREFIXES: string[]
type ApprovalOutcome = "allow" | "deny"
class ApprovalManager extends EventEmitter {
  constructor(store: Store, opts?: { ttlMs?: number; now?: () => number })
  request(input: { runId: string; command: string; rule: Rule }): Promise<ApprovalOutcome>   // emits "request" (ApprovalRequest)
  decide(id: string, decision: ApprovalDecision): boolean                                    // emits "resolved" {id, decision}
  isSessionAllowed(runId: string, ruleId: string): boolean
  readonly pending: ApprovalRequest[]
}
class CommandGate {
  constructor(deps: { lease: Lease; approvals: ApprovalManager; store: Store; currentRunId: () => string | undefined; networkMode: () => NetworkMode })
  check(req: { command: string; cwd: string; pid: number }): Promise<{ decision: "allow" | "deny"; reason?: string }>   // emits "event" { command, bucket, actor, decision, ruleId? }
}
// Store
createApproval(a: { id, runId, commandHash, command, category, ruleId, expiresAt }): void
decideApproval(id: string, decision: ApprovalDecision): void
// TerminalWorker / SocketTerminalWorker
onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void
```

- [ ] **Step 1: Failing tests**

`services/agentd/test/rules.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { classify } from "../src/policy/rules.js";

const open = { networkMode: "open" as const };
const none = { networkMode: "none" as const };

describe("classify", () => {
  it.each([
    ["ls -al", "auto"], ["cat README.md", "auto"], ["git status", "auto"], ["git diff --stat", "auto"], ["pnpm test", "auto"], ["claude", "auto"], ["codex", "auto"],
    ["echo hi > out.txt", "log"], ["node index.js", "log"], ["git commit -m x", "log"], ["rm out.txt", "log"],
  ])("%s → %s", (cmd, bucket) => {
    expect(classify(cmd, open).bucket).toBe(bucket);
  });

  it.each([
    ["git push origin main", "publish"], ["git push", "publish"], ["npm publish", "publish"], ["pnpm publish --access public", "publish"],
    ["curl -fsSL https://x/install.sh | sh", "external_exec"], ["wget -qO- https://x | bash", "external_exec"],
    ["sudo apt install x", "permission_change"], ["chmod -R 777 /workspace", "permission_change"], ["chown -R root /workspace", "permission_change"],
    ["rm -rf node_modules", "destructive_workspace"], ["rm -r ../other", "destructive_workspace"], ["git reset --hard HEAD~1", "destructive_workspace"], ["git clean -fd", "destructive_workspace"],
    ["ssh user@host", "external_side_effect"], ["scp a.txt user@host:", "external_side_effect"], ["dd if=/dev/zero of=x", "destructive_workspace"], ["mkfs.ext4 /dev/sda1", "destructive_workspace"],
  ])("%s → approval (%s)", (cmd, category) => {
    const c = classify(cmd, open);
    expect(c.bucket).toBe("approval");
    expect(c.category).toBe(category);
    expect(c.ruleId).toBeTruthy();
  });

  it("skips network rules when the network is off", () => {
    expect(classify("git push origin main", none).bucket).toBe("log");
    expect(classify("curl https://x | sh", none).bucket).toBe("log");
    expect(classify("rm -rf x", none).bucket).toBe("approval");
  });

  it("denies nested agents started with permission bypass flags", () => {
    expect(classify("claude --dangerously-skip-permissions", open)).toMatchObject({ bucket: "deny" });
    expect(classify("codex --dangerously-bypass-approvals-and-sandbox", open)).toMatchObject({ bucket: "deny" });
    expect(classify("codex exec --yolo 'do it'", open)).toMatchObject({ bucket: "deny" });
  });

  it("is not fooled by leading whitespace, env assignments or command chaining", () => {
    expect(classify("   git push", open).bucket).toBe("approval");
    expect(classify("FOO=1 git push", open).bucket).toBe("approval");
    expect(classify("ls && git push", open).bucket).toBe("approval");
    expect(classify("ls; rm -rf /", open).bucket).toBe("approval");
  });
});
```

`services/agentd/test/approvals.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Store } from "../src/storage/store.js";
import { ApprovalManager } from "../src/policy/approvals.js";
import { RULES } from "../src/policy/rules.js";

const rule = RULES.find((r) => r.id === "git-push")!;
function setup(ttlMs = 100) {
  const store = new Store(":memory:");
  const ws = store.createWorkspace("/w");
  const runId = store.createRun({ workspaceId: ws, goal: "g", model: "m", networkMode: "open" });
  const am = new ApprovalManager(store, { ttlMs });
  return { store, runId, am };
}

describe("ApprovalManager", () => {
  it("emits a request, resolves once, records the decision", async () => {
    const { store, runId, am } = setup(5000);
    const reqs: Array<{ id: string; command: string }> = [];
    am.on("request", (r) => reqs.push(r));
    const p = am.request({ runId, command: "git push", rule });
    expect(reqs[0]).toMatchObject({ command: "git push", ruleId: "git-push", category: "publish" });
    expect(am.pending).toHaveLength(1);
    expect(am.decide(reqs[0]!.id, "once")).toBe(true);
    await expect(p).resolves.toBe("allow");
    expect(am.pending).toHaveLength(0);
    expect(am.decide(reqs[0]!.id, "once")).toBe(false);
    const rows = store.listEvents(runId).filter((e) => e.type === "approval.decided");
    expect(rows[0]?.payload).toMatchObject({ decision: "once", ruleId: "git-push" });
  });

  it("session decision remembers the rule for the run only", async () => {
    const { runId, am, store } = setup(5000);
    am.on("request", (r) => am.decide(r.id, "session"));
    await expect(am.request({ runId, command: "git push", rule })).resolves.toBe("allow");
    expect(am.isSessionAllowed(runId, "git-push")).toBe(true);
    const otherRun = store.createRun({ workspaceId: store.createWorkspace("/w"), goal: "g2", model: "m", networkMode: "open" });
    expect(am.isSessionAllowed(otherRun, "git-push")).toBe(false);
  });

  it("deny and timeout both deny", async () => {
    const { runId, am } = setup(50);
    am.once("request", (r) => am.decide(r.id, "deny"));
    await expect(am.request({ runId, command: "git push", rule })).resolves.toBe("deny");
    await expect(am.request({ runId, command: "git push origin x", rule })).resolves.toBe("deny");
  });
});
```

`services/agentd/test/gate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Store } from "../src/storage/store.js";
import { ApprovalManager } from "../src/policy/approvals.js";
import { CommandGate } from "../src/policy/gate.js";
import { Lease } from "../src/policy/lease.js";

function setup() {
  const store = new Store(":memory:");
  const runId = store.createRun({ workspaceId: store.createWorkspace("/w"), goal: "g", model: "m", networkMode: "open" });
  const lease = new Lease();
  const approvals = new ApprovalManager(store, { ttlMs: 5000 });
  let network: "open" | "none" = "open";
  const gate = new CommandGate({ lease, approvals, store, currentRunId: () => runId, networkMode: () => network });
  const events: Array<Record<string, unknown>> = [];
  gate.on("event", (e) => events.push(e));
  const req = (command: string) => gate.check({ command, cwd: "/workspace", pid: 1 });
  return { store, runId, lease, approvals, gate, events, req, setNetwork: (n: "open" | "none") => (network = n) };
}

describe("CommandGate", () => {
  it("allows and logs everything the human types", async () => {
    const { req, events } = setup();
    expect(await req("rm -rf /")).toEqual({ decision: "allow" });
    expect(events[0]).toMatchObject({ actor: "human", bucket: "approval", decision: "allow" });
  });

  it("auto-allows, logs, and denies for the agent", async () => {
    const { req, lease, events, store, runId } = setup();
    lease.take("agent");
    expect(await req("ls -al")).toEqual({ decision: "allow" });
    expect(await req("node x.js")).toEqual({ decision: "allow" });
    expect(await req("claude --dangerously-skip-permissions")).toMatchObject({ decision: "deny", reason: expect.stringMatching(/bypass/) });
    expect(events.map((e) => e.bucket)).toEqual(["auto", "log", "deny"]);
    expect(store.listEvents(runId).filter((e) => e.type === "command.gate")).toHaveLength(3);
  });

  it("asks for approval and honours once / session / deny", async () => {
    const { req, lease, approvals } = setup();
    lease.take("agent");
    approvals.once("request", (r) => approvals.decide(r.id, "once"));
    expect(await req("git push")).toEqual({ decision: "allow" });
    approvals.once("request", (r) => approvals.decide(r.id, "deny"));
    expect(await req("git push")).toMatchObject({ decision: "deny", reason: expect.stringMatching(/denied/) });
    approvals.once("request", (r) => approvals.decide(r.id, "session"));
    expect(await req("git push")).toEqual({ decision: "allow" });
    let asked = false;
    approvals.once("request", () => (asked = true));
    expect(await req("git push origin main")).toEqual({ decision: "allow" });
    expect(asked).toBe(false);
  });

  it("does not ask when the network is off for network rules", async () => {
    const { req, lease, setNetwork } = setup();
    lease.take("agent");
    setNetwork("none");
    expect(await req("git push")).toEqual({ decision: "allow" });
  });
});
```

Append to `services/agentd/test/socket-worker.test.ts`:
```ts
  it("answers requests coming from the worker via onRequest", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    const w = await SocketTerminalWorker.connect(p);
    w.onRequest("gate.check", async (payload) => ({ decision: payload.command === "ls" ? "allow" : "deny" }));
    expect(await fw.askClient("gate.check", { command: "ls" })).toEqual({ decision: "allow" });
    expect(await fw.askClient("gate.check", { command: "rm" })).toEqual({ decision: "deny" });
    await expect(fw.askClient("nope", {})).rejects.toMatchObject({ code: "INVALID_INPUT" });
    w.close();
  });
```
and add to `FakeWorker` (`test/helpers/fake-worker.ts`):
```ts
  askClient(type: string, payload: Record<string, unknown>) {
    const c = [...this.conns][0];
    if (!c) throw new Error("no client");
    return c.request(type, payload, { timeoutMs: 2000 });
  }
```

- [ ] **Step 2: Run to see them fail** — the four suites fail on missing modules / methods.

- [ ] **Step 3: Implement**

`services/agentd/src/policy/rules.ts`:
```ts
import type { ApprovalCategory, NetworkMode } from "@law/protocol";

export type Bucket = "auto" | "log" | "approval" | "deny";
export type Rule = { id: string; category: ApprovalCategory; pattern: RegExp; summary: string; network?: boolean; noSession?: boolean };
export type Classification = { bucket: Bucket; ruleId?: string; category?: ApprovalCategory; summary?: string };

// Prefixes matched against every simple command in the line (after env assignments).
export const AUTO_PREFIXES = [
  "ls", "cat", "head", "tail", "less", "grep", "rg", "find", "pwd", "echo", "which", "type", "wc", "stat", "file", "tree", "env", "printenv",
  "git status", "git diff", "git log", "git show", "git branch", "git remote -v",
  "npm test", "pnpm test", "npm run test", "pnpm run test", "node --version", "node -v", "npm --version", "pnpm --version",
  "claude", "codex", "cd", "clear", "history", "true", "man", "help",
];

export const DENY_RULES: Rule[] = [
  { id: "nested-bypass", category: "permission_change", pattern: /--dangerously-skip-permissions|--dangerously-bypass-approvals-and-sandbox|(^|\s)--yolo(\s|$)/, summary: "nested agent started with a permission bypass flag" },
];

export const RULES: Rule[] = [
  { id: "git-push", category: "publish", pattern: /^git\s+push\b/, summary: "push commits to a remote", network: true },
  { id: "npm-publish", category: "publish", pattern: /^(npm|pnpm|yarn)\s+publish\b/, summary: "publish a package", network: true },
  { id: "pipe-to-shell", category: "external_exec", pattern: /^(curl|wget)\b.*\|\s*(sudo\s+)?(sh|bash|zsh)\b/, summary: "download and execute a remote script", network: true },
  { id: "sudo", category: "permission_change", pattern: /^(sudo|su)\b/, summary: "run as another user" },
  { id: "chmod-recursive", category: "permission_change", pattern: /^(chmod|chown|chgrp)\b.*\s-[a-zA-Z]*R/, summary: "recursive permission or ownership change" },
  { id: "rm-recursive", category: "destructive_workspace", pattern: /^rm\b.*\s-[a-zA-Z]*[rR]/, summary: "recursive delete" },
  { id: "git-reset-hard", category: "destructive_workspace", pattern: /^git\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|checkout\s+--\s+\.)/, summary: "discard working tree changes" },
  { id: "dd-mkfs", category: "destructive_workspace", pattern: /^(dd|mkfs(\.\w+)?|shred|wipefs)\b/, summary: "raw disk write" },
  { id: "remote-shell", category: "external_side_effect", pattern: /^(ssh|scp|sftp|rsync)\b/, summary: "connect to a remote host", network: true },
];

// Split a bash line into simple commands on ; && || | and newlines. Quotes are not parsed:
// a quoted separator only makes us look at more fragments, never fewer.
function simpleCommands(line: string): string[] {
  return line
    .split(/\n|;|&&|\|\||\|/)
    .map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, "").trim())
    .filter(Boolean);
}

export function classify(command: string, ctx: { networkMode: NetworkMode }): Classification {
  const parts = simpleCommands(command);
  if (parts.length === 0) return { bucket: "auto" };
  for (const rule of DENY_RULES) {
    if (parts.some((p) => rule.pattern.test(p))) return { bucket: "deny", ruleId: rule.id, category: rule.category, summary: rule.summary };
  }
  for (const rule of RULES) {
    if (rule.network && ctx.networkMode === "none") continue;
    if (parts.some((p) => rule.pattern.test(p))) return { bucket: "approval", ruleId: rule.id, category: rule.category, summary: rule.summary };
  }
  const allAuto = parts.every((p) => AUTO_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + " ")));
  return { bucket: allAuto ? "auto" : "log" };
}
```

`services/agentd/src/policy/approvals.ts`:
```ts
import { EventEmitter } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import type { ApprovalDecision, ApprovalRequest } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { Rule } from "./rules.js";

export type ApprovalOutcome = "allow" | "deny";

type Pending = { request: ApprovalRequest; resolve: (o: ApprovalOutcome) => void; timer: NodeJS.Timeout; ruleId: string; runId: string };

export class ApprovalManager extends EventEmitter {
  private readonly pendingMap = new Map<string, Pending>();
  private readonly sessionAllowed = new Map<string, Set<string>>(); // runId -> ruleIds
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly store: Store,
    opts: { ttlMs?: number; now?: () => number } = {},
  ) {
    super();
    this.ttlMs = opts.ttlMs ?? 120_000;
    this.now = opts.now ?? Date.now;
  }

  get pending(): ApprovalRequest[] {
    return [...this.pendingMap.values()].map((p) => p.request);
  }

  isSessionAllowed(runId: string, ruleId: string): boolean {
    return this.sessionAllowed.get(runId)?.has(ruleId) ?? false;
  }

  request(input: { runId: string; command: string; rule: Rule }): Promise<ApprovalOutcome> {
    const id = randomUUID();
    const request: ApprovalRequest = {
      id,
      runId: input.runId,
      category: input.rule.category,
      command: input.command,
      commandHash: createHash("sha256").update(input.command).digest("hex"),
      ruleId: input.rule.id,
      summary: input.rule.summary,
      expiresAt: this.now() + this.ttlMs,
    };
    this.store.createApproval(request);
    this.store.appendEvent(input.runId, "approval.requested", { id, command: input.command, ruleId: input.rule.id, category: input.rule.category });
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.finish(id, "deny"), this.ttlMs);
      this.pendingMap.set(id, { request, resolve, timer, ruleId: input.rule.id, runId: input.runId });
      this.emit("request", request);
    });
  }

  decide(id: string, decision: ApprovalDecision): boolean {
    if (!this.pendingMap.has(id)) return false;
    this.finish(id, decision);
    return true;
  }

  private finish(id: string, decision: ApprovalDecision | "deny"): void {
    const p = this.pendingMap.get(id);
    if (!p) return;
    this.pendingMap.delete(id);
    clearTimeout(p.timer);
    if (decision === "session") {
      const set = this.sessionAllowed.get(p.runId) ?? new Set<string>();
      set.add(p.ruleId);
      this.sessionAllowed.set(p.runId, set);
    }
    this.store.decideApproval(id, decision);
    this.store.appendEvent(p.runId, "approval.decided", { id, decision, ruleId: p.ruleId });
    this.emit("resolved", { id, decision });
    p.resolve(decision === "deny" ? "deny" : "allow");
  }
}
```

`services/agentd/src/policy/gate.ts`:
```ts
import { EventEmitter } from "node:events";
import type { NetworkMode } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { Lease } from "./lease.js";
import type { ApprovalManager } from "./approvals.js";
import { RULES, classify, type Bucket } from "./rules.js";

export type GateEvent = { command: string; bucket: Bucket; actor: "human" | "agent"; decision: "allow" | "deny"; ruleId?: string; reason?: string };

export class CommandGate extends EventEmitter {
  constructor(
    private readonly deps: {
      lease: Lease;
      approvals: ApprovalManager;
      store: Store;
      currentRunId: () => string | undefined;
      networkMode: () => NetworkMode;
    },
  ) {
    super();
  }

  async check(req: { command: string; cwd: string; pid: number }): Promise<{ decision: "allow" | "deny"; reason?: string }> {
    const actor = this.deps.lease.state.owner;
    const c = classify(req.command, { networkMode: this.deps.networkMode() });
    const runId = this.deps.currentRunId();
    const done = (decision: "allow" | "deny", reason?: string) => {
      const ev: GateEvent = { command: req.command, bucket: c.bucket, actor, decision, ...(c.ruleId ? { ruleId: c.ruleId } : {}), ...(reason ? { reason } : {}) };
      if (runId) this.deps.store.appendEvent(runId, "command.gate", { ...ev, cwd: req.cwd });
      this.emit("event", ev);
      return reason ? { decision, reason } : { decision };
    };
    if (actor === "human") return done("allow");
    switch (c.bucket) {
      case "auto":
      case "log":
        return done("allow");
      case "deny":
        return done("deny", `refused: ${c.summary ?? "policy"} (permission bypass flags are never allowed)`);
      case "approval": {
        const rule = RULES.find((r) => r.id === c.ruleId)!;
        if (!runId) return done("deny", "no active run to attach an approval to");
        if (this.deps.approvals.isSessionAllowed(runId, rule.id)) return done("allow");
        const outcome = await this.deps.approvals.request({ runId, command: req.command, rule });
        return outcome === "allow" ? done("allow") : done("deny", `denied by the human: ${rule.summary}`);
      }
    }
  }
}
```

`services/agentd/src/storage/store.ts` additions:
```ts
  createApproval(a: { id: string; runId: string; commandHash: string; command: string; category: string; ruleId: string; expiresAt: number }): void {
    this.db
      .prepare(`INSERT INTO approvals (id, run_id, command_hash, command, category, rule_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.runId, a.commandHash, a.command, a.category, a.ruleId, Date.now(), a.expiresAt);
  }

  decideApproval(id: string, decision: string): void {
    this.db.prepare(`UPDATE approvals SET decision = ?, decided_at = ? WHERE id = ?`).run(decision, Date.now(), id);
  }
```

`services/agentd/src/worker/types.ts` — add to the interface:
```ts
  onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void;
```
`services/agentd/src/worker/socket-worker.ts` — add:
```ts
  private readonly handlers = new Map<string, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>>();
  // in the private constructor, after fields are set:
  //   this.conn.on("message", (env: Envelope) => void this.dispatchRequest(env));

  onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void {
    this.handlers.set(type, handler);
    return () => void this.handlers.delete(type);
  }

  private async dispatchRequest(env: Envelope): Promise<void> {
    if (!env.id) return;
    const h = this.handlers.get(env.type);
    if (!h) return this.conn.reply(env.id, { ok: false, error: { code: "INVALID_INPUT", message: `no handler for ${env.type}` } });
    try {
      this.conn.reply(env.id, { ok: true, payload: await h(env.payload) });
    } catch (e) {
      this.conn.reply(env.id, { ok: false, error: { code: "INVALID_INPUT", message: e instanceof Error ? e.message : String(e) } });
    }
  }
```
(import `type Envelope` from `@law/protocol`; move the `this.conn.on("message", ...)` registration into the constructor body.)

Exports in `index.ts`: `classify, RULES, DENY_RULES, AUTO_PREFIXES, ApprovalManager, CommandGate` and types.

- [ ] **Step 4: Verify** — `pnpm vitest run services/agentd && pnpm --filter @law/agentd typecheck` → all green.

- [ ] **Step 5: Commit** — `git add services/agentd && git commit -m "Add command classification, approvals and the agentd command gate"`

---

### Task 3: Nested-prompt detection with handoff, git snapshot

**Files:**
- Create: `services/agentd/src/policy/nested-prompts.ts`, `services/agentd/src/session/snapshot.ts`, tests `nested-prompts.test.ts`, `snapshot.test.ts`
- Modify: `services/agentd/src/policy/types.ts`, `services/agentd/src/orchestrator/run-controller.ts`, `services/agentd/src/orchestrator/system-prompt.ts`, `services/agentd/test/run-controller.test.ts`, `services/agentd/src/index.ts`

**Interfaces:**
```ts
PolicyDecision = { allow: true } | { allow: false; code: "POLICY_DENIED" | "LEASE_DENIED"; reason: string; handoff?: string }
const NESTED_PROMPT_PATTERNS: Array<{ id: string; pattern: RegExp }>
function detectNestedPrompt(screen: string): { id: string } | null
class NestedPromptPolicy implements Policy { constructor(observe: () => Promise<{ screen: string }>) }   // blocks terminal_input only
function composePolicies(...policies: Policy[]): Policy                                                    // first non-allow wins
type Snapshot = { head: string | null; stash: string | null }
async function snapshotWorkspace(path: string): Promise<Snapshot | null>      // null when not a git work tree
async function restoreSnapshot(path: string, snap: Snapshot): Promise<void>
```

- [ ] **Step 1: Failing tests**

`services/agentd/test/nested-prompts.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NestedPromptPolicy, composePolicies, detectNestedPrompt } from "../src/policy/nested-prompts.js";
import { allowAllPolicy } from "../src/policy/types.js";

describe("detectNestedPrompt", () => {
  it.each([
    ["Claude wants to run `rm -rf dist`\n\nDo you want to proceed?\n❯ 1. Yes\n  2. Yes, and don't ask again\n  3. No, and tell Claude what to do differently (esc)", "claude-proceed"],
    ["Allow command?\n  [y] yes  [n] no", "codex-allow"],
    ["[sudo] password for agent:", "sudo-password"],
    ["Password:", "password"],
  ])("matches %j", (screen, id) => {
    expect(detectNestedPrompt(screen)?.id).toBe(id);
  });
  it("ignores normal output", () => {
    expect(detectNestedPrompt("agent@law:/workspace$ ls\nREADME.md\nagent@law:/workspace$ ")).toBeNull();
    expect(detectNestedPrompt("Would you like fries with that? no")).toBeNull();
  });
});

describe("NestedPromptPolicy", () => {
  const ctx = { runId: "r", networkMode: "open" as const };
  it("blocks terminal_input with a handoff reason while a prompt is visible; other tools pass", async () => {
    let screen = "Do you want to proceed?\n❯ 1. Yes";
    const p = new NestedPromptPolicy(async () => ({ screen }));
    const d = await p.authorize({ callId: "1", name: "terminal_input", args: { kind: "key", key: "ENTER" } }, ctx);
    expect(d).toMatchObject({ allow: false, code: "LEASE_DENIED", handoff: expect.stringMatching(/permission prompt/) });
    expect(await p.authorize({ callId: "2", name: "terminal_observe", args: {} }, ctx)).toEqual({ allow: true });
    screen = "$ ";
    expect(await p.authorize({ callId: "3", name: "terminal_input", args: { kind: "text", text: "ls" } }, ctx)).toEqual({ allow: true });
  });
  it("composePolicies returns the first denial", async () => {
    const deny = { authorize: async () => ({ allow: false as const, code: "POLICY_DENIED" as const, reason: "no" }) };
    expect(await composePolicies(allowAllPolicy, deny).authorize({ callId: "1", name: "x", args: {} }, ctx)).toMatchObject({ allow: false, reason: "no" });
    expect(await composePolicies(allowAllPolicy, allowAllPolicy).authorize({ callId: "1", name: "x", args: {} }, ctx)).toEqual({ allow: true });
  });
});
```

Append to `services/agentd/test/run-controller.test.ts` inside `describe("RunController")`:
```ts
  it("a denial carrying a handoff reason pauses the run and resumes with an observation", async () => {
    const { ws, store, worker, fw } = await setup();
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { text: "resumed" },
    ]);
    const policy = { authorize: async () => ({ allow: false as const, code: "LEASE_DENIED" as const, reason: "prompt visible", handoff: "nested permission prompt on screen" }) };
    const rc = new RunController({ store, adapter, worker, policy }, input(ws));
    const handoff = new Promise<{ reason: string }>((r) => rc.on("handoff", r));
    const p = rc.start();
    expect((await handoff).reason).toMatch(/nested permission prompt/);
    fw.screen = "$ done";
    rc.resumeFromHandoff();
    const out = await p;
    expect(out.state).toBe("completed");
    const output = JSON.parse(toolResultsOf(adapter.inputs[1])[0]!.output);
    expect(output).toMatchObject({ resumed: true, observation: { screen: "$ done" } });
    expect(store.listToolCalls(out.runId)[0]?.status).toBe("denied");
  });
```

`services/agentd/test/snapshot.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { restoreSnapshot, snapshotWorkspace } from "../src/session/snapshot.js";
import { tmpDir } from "./helpers/tmp.js";

const git = (dir: string, ...args: string[]) => execFileSync("git", ["-C", dir, ...args], { stdio: "pipe", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).toString();

describe("snapshot", () => {
  it("returns null outside git", async () => {
    expect(await snapshotWorkspace(tmpDir())).toBeNull();
  });

  it("captures HEAD and dirty changes, and restores them after damage", async () => {
    const dir = tmpDir("law-git-");
    git(dir, "init", "-q");
    fs.writeFileSync(path.join(dir, "a.txt"), "v1\n");
    git(dir, "add", ".");
    git(dir, "commit", "-qm", "init");
    fs.writeFileSync(path.join(dir, "a.txt"), "v2 uncommitted\n");
    const snap = await snapshotWorkspace(dir);
    expect(snap?.head).toMatch(/^[0-9a-f]{40}$/);
    expect(snap?.stash).toMatch(/^[0-9a-f]{40}$/);
    fs.writeFileSync(path.join(dir, "a.txt"), "DAMAGED\n");
    fs.unlinkSync(path.join(dir, "a.txt"));
    await restoreSnapshot(dir, snap!);
    expect(fs.readFileSync(path.join(dir, "a.txt"), "utf8")).toBe("v2 uncommitted\n");
  });

  it("handles a clean tree and an empty repo", async () => {
    const dir = tmpDir("law-git-");
    git(dir, "init", "-q");
    expect(await snapshotWorkspace(dir)).toEqual({ head: null, stash: null });
    fs.writeFileSync(path.join(dir, "a.txt"), "v1\n");
    git(dir, "add", ".");
    git(dir, "commit", "-qm", "init");
    expect(await snapshotWorkspace(dir)).toMatchObject({ stash: null });
  });
});
```

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement**

`services/agentd/src/policy/types.ts` — extend the denial shape:
```ts
export type PolicyDecision =
  | { allow: true }
  | { allow: false; code: "POLICY_DENIED" | "LEASE_DENIED"; reason: string; handoff?: string };
```

`services/agentd/src/policy/nested-prompts.ts`:
```ts
import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ToolCall } from "../provider/types.js";

export const NESTED_PROMPT_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "claude-proceed", pattern: /do you want to proceed\?|yes, allow|don't ask again|esc to cancel/i },
  { id: "codex-allow", pattern: /allow command\?|would you like to run|\bapprove\b.*\?/i },
  { id: "sudo-password", pattern: /\[sudo\] password/i },
  { id: "password", pattern: /^\s*password( for [^:]+)?:\s*$/im },
];

export function detectNestedPrompt(screen: string): { id: string } | null {
  for (const p of NESTED_PROMPT_PATTERNS) if (p.pattern.test(screen)) return { id: p.id };
  return null;
}

// Screen regexes decide when to stop the agent's keystrokes; the human answers the prompt.
export class NestedPromptPolicy implements Policy {
  constructor(private readonly observe: () => Promise<{ screen: string }>) {}

  async authorize(call: ToolCall, _ctx: PolicyContext): Promise<PolicyDecision> {
    if (call.name !== "terminal_input") return { allow: true };
    const { screen } = await this.observe();
    const hit = detectNestedPrompt(screen);
    if (!hit) return { allow: true };
    return {
      allow: false,
      code: "LEASE_DENIED",
      reason: `a permission prompt (${hit.id}) is on screen; the human must answer it`,
      handoff: `nested permission prompt on screen (${hit.id}); answer it in the terminal, then give control back`,
    };
  }
}

export function composePolicies(...policies: Policy[]): Policy {
  return {
    async authorize(call, ctx) {
      for (const p of policies) {
        const d = await p.authorize(call, ctx);
        if (!d.allow) return d;
      }
      return { allow: true };
    },
  };
}
```

`services/agentd/src/orchestrator/run-controller.ts` — in `runTool`, replace the denial branch:
```ts
    if (!decision.allow) {
      const error = { code: decision.code, message: decision.reason };
      store.finishToolCall(rowId, "denied", { error }, decision.code);
      store.appendEvent(this.runId, "tool.denied", { name: call.name, ...error });
      this.emit("tool", { name: call.name, status: "denied", callId: call.callId });
      if (decision.handoff) {
        const observation = await this.handoff(decision.handoff, worker);
        return { callId: call.callId, output: JSON.stringify({ resumed: true, observation, note: decision.reason }) };
      }
      return { callId: call.callId, output: JSON.stringify({ error }) };
    }
```

`system-prompt.ts` — add two rules:
```
- A command that seems to hang right after ENTER may be waiting for the human's approval. Observe again after a few seconds; do not press Ctrl-C or retype it.
- If a tool result says a permission prompt is on screen, the human is answering it; continue from the observation you receive.
```

`services/agentd/src/session/snapshot.ts`:
```ts
import { execFile } from "node:child_process";

export type Snapshot = { head: string | null; stash: string | null };

function git(cwd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) =>
    execFile("git", ["-C", cwd, ...args], { maxBuffer: 1024 * 1024 }, (err, stdout) => resolve({ ok: !err, out: stdout.trim() })),
  );
}

export async function snapshotWorkspace(path: string): Promise<Snapshot | null> {
  const inside = await git(path, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.out !== "true") return null;
  const head = await git(path, ["rev-parse", "--verify", "HEAD"]);
  const stash = head.ok ? await git(path, ["stash", "create"]) : { ok: false, out: "" };
  return { head: head.ok ? head.out : null, stash: stash.ok && stash.out ? stash.out : null };
}

// ponytail: tracked files only; untracked files created or deleted during the run are not restored.
export async function restoreSnapshot(path: string, snap: Snapshot): Promise<void> {
  if (snap.head) {
    const r = await git(path, ["checkout", snap.head, "--", "."]);
    if (!r.ok) throw new Error("git checkout failed");
  }
  if (snap.stash) {
    const r = await git(path, ["stash", "apply", snap.stash]);
    if (!r.ok) throw new Error("git stash apply failed");
  }
}
```

Exports in `index.ts`: `NestedPromptPolicy, composePolicies, detectNestedPrompt, NESTED_PROMPT_PATTERNS, snapshotWorkspace, restoreSnapshot` and `Snapshot`.

- [ ] **Step 4: Verify** — `pnpm vitest run services/agentd && pnpm --filter @law/agentd typecheck`.

- [ ] **Step 5: Commit** — `git add services/agentd && git commit -m "Add nested-prompt handoff policy and git workspace snapshots"`

---

### Task 4: Daemon wiring and UI

**Files:**
- Modify: `services/agentd/src/ipc.ts`, `services/agentd/test/daemon-run.test.ts`, `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/renderer/{App,RunDrawer}.tsx`, `styles.css`
- Create: `apps/desktop/src/renderer/ApprovalCard.tsx`

**Interfaces (ipc.ts):**
```ts
ApprovalDecide = { type:"approval.decide", id: string, decision: "once"|"session"|"deny" }
RunRestore = { type:"run.restore", runId: string }
// agentd -> main
ApprovalRequestMsg = { type:"approval.request" } & ApprovalRequest
ApprovalResolved = { type:"approval.resolved", id, decision }
GateEventMsg = { type:"gate.event" } & GateEvent
RunRestored = { type:"run.restored", runId, ok: boolean, message?: string }
RunStateMsg += { snapshot: boolean }
```
Daemon: on `session.state ready` → `manager.worker.onRequest("gate.check", gate.check)`. `run.start` → `snapshotWorkspace(status.workspacePath)` first, pass as `snapshot` to `RunController`, policy = `composePolicies(new LeasePolicy(lease), new NestedPromptPolicy(() => worker.observe({})))`. `run.restore` → read `runs.snapshot_json`, `restoreSnapshot`, post `run.restored`. Approvals: `ApprovalManager` created at `config.init`; forwards `request`/`resolved` events; `approval.decide` → `approvals.decide`.

- [ ] **Step 1: Failing tests** — append to `daemon-run.test.ts`:
```ts
  it("routes gate checks from the worker through approvals and back", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 1500 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    const pending = fw!.askClient("gate.check", { command: "git push", cwd: "/workspace", pid: 1 });
    await settle(() => last("approval.request") !== undefined);
    const req = last("approval.request") as { id: string; command: string };
    expect(req.command).toBe("git push");
    await d.handle({ type: "approval.decide", id: req.id, decision: "once" });
    expect(await pending).toEqual({ decision: "allow" });
    expect(last("gate.event")).toMatchObject({ command: "git push", bucket: "approval", decision: "allow" });
    expect(await fw!.askClient("gate.check", { command: "ls", cwd: "/workspace", pid: 1 })).toEqual({ decision: "allow" });
  });

  it("records a git snapshot on run.start and restores it on run.restore", async () => {
    const adapter = new FakeModelAdapter([{ text: "done" }]);
    const posted: Array<Record<string, unknown>> = [];
    // boot() uses a plain tmp workspace; make a git one here
    const { d, last, workspace } = await bootWith(adapter, (dir) => {
      execFileSync("git", ["-C", dir, "init", "-q"]);
      fs.writeFileSync(path.join(dir, "f.txt"), "keep\n");
      execFileSync("git", ["-C", dir, "add", "."]);
      execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "i"]);
    });
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    expect(last("run.state")).toMatchObject({ snapshot: true });
    fs.writeFileSync(path.join(workspace, "f.txt"), "damaged\n");
    await d.handle({ type: "run.restore", runId: (last("run.state") as { runId: string }).runId });
    expect(last("run.restored")).toMatchObject({ ok: true });
    expect(fs.readFileSync(path.join(workspace, "f.txt"), "utf8")).toBe("keep\n");
    void posted;
  });
```
Refactor `boot` into `bootWith(adapter, prepareWorkspace?)` returning also `workspace`; keep `boot = (a) => bootWith(a)`. Add imports `fs`, `execFileSync`.

- [ ] **Step 2: Implement Daemon changes** (in `ipc.ts`):
```ts
import { ApprovalDecision, type ApprovalRequest } from "@law/protocol";
import { ApprovalManager } from "./policy/approvals.js";
import { CommandGate, type GateEvent } from "./policy/gate.js";
import { NestedPromptPolicy, composePolicies } from "./policy/nested-prompts.js";
import { restoreSnapshot, snapshotWorkspace, type Snapshot } from "./session/snapshot.js";

export const ApprovalDecide = z.object({ type: z.literal("approval.decide"), id: z.string().min(1), decision: ApprovalDecision });
export const RunRestore = z.object({ type: z.literal("run.restore"), runId: z.string().min(1) });
// add both to MainToAgentd
export type ApprovalRequestMsg = { type: "approval.request" } & ApprovalRequest;
export type ApprovalResolved = { type: "approval.resolved"; id: string; decision: ApprovalDecision };
export type GateEventMsg = { type: "gate.event" } & GateEvent;
export type RunRestored = { type: "run.restored"; runId: string; ok: boolean; message?: string };
// RunStateMsg gains snapshot: boolean; AgentdToMain union gains the four types
```
Daemon fields: `approvals`, `gate`, `snapshot: Snapshot | null`, `unhookGate`. In `config.init` success:
```ts
          this.approvals = new ApprovalManager(runtime.store);
          this.approvals.on("request", (r: ApprovalRequest) => this.deps.post({ type: "approval.request", ...r }));
          this.approvals.on("resolved", (r: { id: string; decision: ApprovalDecision }) => this.deps.post({ type: "approval.resolved", ...r }));
          this.gate = new CommandGate({
            lease: this.lease, approvals: this.approvals, store: runtime.store,
            currentRunId: () => (this.run && !TERMINAL.has(this.run.state) ? this.run.runId : undefined),
            networkMode: () => this.manager?.status.networkMode ?? "open",
          });
          this.gate.on("event", (e: GateEvent) => this.deps.post({ type: "gate.event", ...e }));
          this.manager.on("status", (s: SessionStatus) => {
            if (s.state === "ready" && this.manager?.worker && this.gate) this.unhookGate = this.manager.worker.onRequest("gate.check", (p) => this.gate!.check({ command: String(p.command ?? ""), cwd: String(p.cwd ?? ""), pid: Number(p.pid ?? 0) }));
          });
```
`startRun` becomes async: `const snapshot = await snapshotWorkspace(status.workspacePath);` passed as `snapshot` in `RunInput` (when not null); `policy: composePolicies(new LeasePolicy(this.lease), new NestedPromptPolicy(() => worker.observe({})))`; `postState` adds `snapshot: snapshot !== null`. New cases:
```ts
      case "approval.decide":
        if (!this.approvals?.decide(msg.id, msg.decision)) this.deps.post({ type: "agentd.error", message: "approval not pending" });
        return;
      case "run.restore": {
        const run = this.runtime?.store.getRun(msg.runId);
        if (!run?.snapshot_json || !this.manager?.status.workspacePath) return this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: "no snapshot for this run" });
        if (this.run && !TERMINAL.has(this.run.state)) return this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: "stop the run first" });
        try {
          await restoreSnapshot(this.manager.status.workspacePath, JSON.parse(run.snapshot_json) as Snapshot);
          this.runtime!.store.appendEvent(msg.runId, "run.restored", {});
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: true });
        } catch (e) {
          this.deps.post({ type: "run.restored", runId: msg.runId, ok: false, message: e instanceof Error ? e.message : String(e) });
        }
        return;
      }
```

- [ ] **Step 3: UI**

Main: forward `approval.request`, `approval.resolved`, `gate.event`, `run.restored` on channel `run:event` (same stream); handlers `approval:decide (id, decision)` → `approval.decide`, `run:restore (runId)` → `run.restore`. Preload: `decideApproval(id, decision)`, `restoreRun(runId)`.

`ApprovalCard.tsx`:
```tsx
export type ApprovalView = { id: string; command: string; category: string; summary: string; expiresAt: number };
export function ApprovalCard({ a }: { a: ApprovalView }) {
  const decide = (d: "once" | "session" | "deny") => void window.workbench.decideApproval(a.id, d);
  return (
    <div className="approval">
      <div className="approval-head">Approval needed · {a.category}</div>
      <div className="approval-summary">{a.summary}</div>
      <pre className="approval-cmd">{a.command}</pre>
      <div className="row">
        <button className="btn primary" onClick={() => decide("once")}>Allow once</button>
        <button className="btn" onClick={() => decide("session")}>Allow for this run</button>
        <button className="btn danger" onClick={() => decide("deny")}>Deny</button>
      </div>
    </div>
  );
}
```
RunDrawer: `RunEvent` union gains `approval.request | approval.resolved | gate.event | run.restored`; `RunView` gains `approvals: ApprovalView[]`, `snapshot: boolean`, `restored?: string`; reducer: request → push, resolved → remove, gate.event → log row `{kind:"gate", text: command, status: `${bucket}/${decision}`}`, run.state → snapshot flag, run.restored → restored message. Render: approval cards at the top of the drawer (above the log), gate rows in the log with a `⌘` prefix, and a "Restore pre-run state" button (visible when `snapshot && state is terminal`, `window.confirm` before calling `restoreRun`). Top bar: badge `SNAPSHOT` / `NO SNAPSHOT` from `run.snapshot` after the first state event.

Styles: `.approval { border: 1px solid var(--agent); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: rgba(255,59,59,0.06); } .approval-head { color: var(--agent); font-weight: 700; font-size: 12px; text-transform: uppercase; } .approval-cmd { margin: 0; padding: 8px; background: var(--bg); border-radius: 4px; white-space: pre-wrap; } .log .gate { color: var(--muted); font-size: 12px; padding: 2px 8px; } .log .gate.deny { color: var(--agent); }`

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm test`; then `pnpm images:build` (bashrc + gate.js changed) and `pnpm dev`. Manual: goal "Create a git tag v0 and push it with git push --tags" → the agent types `git push --tags`, bash blocks, an approval card appears; Deny → the terminal prints `law: command blocked: denied by the human: push commits to a remote` and the agent reports it. Second manual: type `git push` yourself → runs (no card), a gate row `git push approval/allow human` appears.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "Wire the command gate, approvals and snapshots into agentd and the drawer"`

---

### Task 5: Container test for the hook, wrap-up

- Create `tests/container/gate-container.test.ts`: start a manager on a tmp workspace, register `worker.onRequest("gate.check", handler)` where the handler denies `rm -rf` and allows the rest; type `touch x; rm -rf x` as the human via `manager.write` → expect the screen to contain `law: command blocked` and `x` to still exist; then a handler that allows → `rm -rf x` removes it. Also assert `ls` was checked (handler saw it).
- `pnpm test:container`, README section "Policy gate" (what is covered, the ceiling, the approval buttons), full verification, merge.

## Self-review notes

- Spec §7.1 (Task 1), §7.2–7.3 (Task 2), §7.4 (Task 3), §7.6 (Task 3–4), §9 approval card (Task 4), §11 security tests partially (Task 5; ANSI injection, symlink and podman-arg tests remain for hardening).
- `terminal.restart` deferred: nothing in T1 needs it.
- Names shared: `GateServer`, `WorkerServer.forwardGate`, `SocketTerminalWorker.onRequest`, `classify`, `RULES`, `ApprovalManager`, `CommandGate`, `NestedPromptPolicy`, `composePolicies`, `snapshotWorkspace`, `restoreSnapshot`, messages `approval.decide|run.restore`, events `approval.request|approval.resolved|gate.event|run.restored`.
