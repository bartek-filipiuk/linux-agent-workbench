# T1 Milestone 3 — OpenAI agent loop, lease, run UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The user types a goal, presses Start, and `gpt-5.6-sol` drives the sandbox terminal through the three terminal tools: it runs `ls -al`, reads the screen and answers. The terminal outline turns red while the agent holds the lease, human keystrokes are dropped until the human takes control back, Stop ends the run within the UI tick, `request_human` pauses into handoff and "Give control back" resumes.

**Architecture:** `OpenAIResponsesAdapter` (fetch, no SDK) implements the M1 `ModelAdapter` against `/v1/responses` with `previous_response_id` and `function_call_output`. A `Lease` object in agentd is the single owner of "who has the keyboard": `LeasePolicy` denies agent tool calls when the human owns it, and the Daemon drops human keystrokes when the agent owns it. The Daemon wires `RunController` to the live `TerminalSessionManager` worker and streams run events to the renderer, which gains a right-hand drawer.

**Tech Stack:** unchanged. No new dependencies (native `fetch` in Node 24).

**Spec:** `docs/superpowers/specs/2026-09-04-terminal-stage-design.md` §6 (run loop), §7.5 (lease), §9 (UI drawer, owner bar), §3.2 (preload API).

## Global Constraints

- M1 and M2 Global Constraints still apply.
- Verified live on 2026-09-04: `POST /v1/responses` with `{ model, instructions, input:[{role:"user",content}], tools:[{type:"function",name,description,parameters}] }` returns `output:[{type:"function_call", call_id, name, arguments:"<json string>"}]`, `usage:{input_tokens, output_tokens}`; a follow-up with `previous_response_id` and `input:[{type:"function_call_output", call_id, output}]` returns `output:[{type:"message", content:[{type:"output_text", text}]}]`. Tools are sent with `strict: false` because the Zod-derived schemas have optional fields.
- Retries only for transport-class failures (network error, HTTP 408, 429, 5xx), max 3 attempts, backoff 500 ms × 2ⁿ, never after abort. HTTP 4xx other than 408/429 fail immediately with the API's error message.
- Prices come from optional env `OPENAI_PRICE_INPUT_PER_MTOK` / `OPENAI_PRICE_OUTPUT_PER_MTOK`; when absent the run records `cost.unknown_model` events and the UI shows cost as `n/a`.
- Lease owner defaults to `human`. `run.start` takes it for the agent; every terminal run state, Stop and handoff give it back to the human; `run.resume` hands it to the agent again.
- Human keystrokes (`terminal.write`) are dropped in agentd when the agent owns the lease. Resize is always allowed.
- Renderer receives no API key, no run internals beyond the event payloads below.

---

## File structure

```
services/agentd/src/
  provider/openai.ts                    OpenAIResponsesAdapter (fetch), response schemas, retry
  policy/lease.ts                       Lease (owner, take, events) + LeasePolicy
  ipc.ts                                new messages: run.start/stop/resume, lease.take; run.state/commentary/tool/handoff, lease.state
  orchestrator/run-controller.ts        expose stats {turns, toolCalls, costUsd}
services/agentd/test/
  openai-adapter.test.ts
  lease.test.ts
  daemon-run.test.ts
apps/desktop/src/
  main/index.ts                         prices from env, new IPC channels
  preload/index.ts                      startRun, stopRun, resumeRun, takeControl, releaseControl, onRun, onLease
  renderer/App.tsx                      layout with drawer, owner bar with buttons, handoff banner, red/blue outline
  renderer/RunDrawer.tsx                goal input, Start/Stop, commentary, tool rows
  renderer/styles.css
```

---

### Task 1: OpenAIResponsesAdapter

**Files:**
- Create: `services/agentd/src/provider/openai.ts`, `services/agentd/test/openai-adapter.test.ts`
- Modify: `services/agentd/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  type FetchLike = typeof fetch
  type OpenAIAdapterOptions = { apiKey: string; model: string; baseUrl?: string; fetch?: FetchLike; maxAttempts?: number; backoffMs?: number }
  class OpenAIResponsesAdapter implements ModelAdapter {
    constructor(opts: OpenAIAdapterOptions)
    readonly model: string
    turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn>
  }
  ```
  Request body: `{ model, instructions: ctx.system, tools, store: true, previous_response_id?, input }` where `input` is `[{role:"user",content:goal}]` for the first turn and `function_call_output` items afterwards. `ModelTurn.text` is the concatenation of all `output_text` parts; `toolCalls` are the `function_call` items with `args = JSON.parse(arguments)` (invalid JSON → `args = { __invalid: arguments }` so the executor rejects it with INVALID_INPUT instead of the adapter failing the run).

- [ ] **Step 1: Failing test**

`services/agentd/test/openai-adapter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { OpenAIResponsesAdapter } from "../src/provider/openai.js";
import { TERMINAL_TOOLS } from "../src/tools/terminal-tools.js";

type Call = { url: string; init: RequestInit; body: Record<string, unknown> };
function fakeFetch(responses: Array<{ status: number; json: unknown } | Error>) {
  const calls: Call[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init!, body: JSON.parse(String(init!.body)) });
    const next = responses.shift();
    if (!next) throw new Error("no more fake responses");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next.json), { status: next.status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { f, calls };
}
const ok = (json: unknown) => ({ status: 200, json });
const ctx = (signal = new AbortController().signal, previousResponseId?: string) => ({ tools: TERMINAL_TOOLS, system: "SYS", signal, ...(previousResponseId ? { previousResponseId } : {}) });
const fcResponse = {
  id: "resp_1",
  status: "completed",
  output: [
    { type: "message", content: [{ type: "output_text", text: "Looking." }] },
    { type: "function_call", call_id: "call_a", name: "terminal_observe", arguments: "{\"maxLines\":50}" },
    { type: "function_call", call_id: "call_b", name: "terminal_input", arguments: "not json" },
  ],
  usage: { input_tokens: 66, output_tokens: 21 },
};

describe("OpenAIResponsesAdapter", () => {
  it("sends the first turn with instructions and tools, parses calls, text and usage", async () => {
    const { f, calls } = fakeFetch([ok(fcResponse)]);
    const a = new OpenAIResponsesAdapter({ apiKey: "sk-test", model: "gpt-5.6-sol", fetch: f });
    const turn = await a.turn({ goal: "list files" }, ctx());
    expect(calls[0]!.url).toBe("https://api.openai.com/v1/responses");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
    expect(calls[0]!.body).toMatchObject({ model: "gpt-5.6-sol", instructions: "SYS", input: [{ role: "user", content: "list files" }] });
    expect((calls[0]!.body.tools as Array<{ type: string; name: string; strict: boolean }>).map((t) => [t.type, t.name, t.strict])).toEqual([
      ["function", "terminal_observe", false], ["function", "terminal_input", false], ["function", "terminal_interrupt", false], ["function", "request_human", false],
    ]);
    expect(turn).toMatchObject({ responseId: "resp_1", text: "Looking.", usage: { inputTokens: 66, outputTokens: 21 } });
    expect(turn.toolCalls).toEqual([
      { callId: "call_a", name: "terminal_observe", args: { maxLines: 50 } },
      { callId: "call_b", name: "terminal_input", args: { __invalid: "not json" } },
    ]);
  });

  it("sends tool results with previous_response_id", async () => {
    const { f, calls } = fakeFetch([ok({ id: "resp_2", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Done" }] }], usage: { input_tokens: 1, output_tokens: 1 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    const turn = await a.turn({ toolResults: [{ callId: "call_a", output: "{\"screen\":\"$ \"}" }] }, ctx(undefined, "resp_1"));
    expect(calls[0]!.body).toMatchObject({ previous_response_id: "resp_1", input: [{ type: "function_call_output", call_id: "call_a", output: "{\"screen\":\"$ \"}" }] });
    expect(turn).toMatchObject({ text: "Done", toolCalls: [] });
  });

  it("retries transport failures with backoff and gives up after maxAttempts", async () => {
    const { f, calls } = fakeFetch([{ status: 429, json: { error: { message: "slow down" } } }, new Error("ECONNRESET"), ok({ id: "r", status: "completed", output: [], usage: { input_tokens: 0, output_tokens: 0 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f, backoffMs: 1 });
    await expect(a.turn({ goal: "g" }, ctx())).resolves.toMatchObject({ responseId: "r" });
    expect(calls).toHaveLength(3);
    const { f: f2 } = fakeFetch([{ status: 500, json: {} }, { status: 502, json: {} }, { status: 503, json: {} }]);
    const b = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f2, backoffMs: 1, maxAttempts: 3 });
    await expect(b.turn({ goal: "g" }, ctx())).rejects.toThrow(/503/);
  });

  it("does not retry 4xx and surfaces the API message", async () => {
    const { f, calls } = fakeFetch([{ status: 400, json: { error: { message: "Unsupported parameter: foo" } } }]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f, backoffMs: 1 });
    await expect(a.turn({ goal: "g" }, ctx())).rejects.toThrow(/Unsupported parameter: foo/);
    expect(calls).toHaveLength(1);
  });

  it("rejects with CANCELLED when aborted", async () => {
    const f = (async (_u: unknown, init?: RequestInit) => {
      await new Promise((_r, rej) => init!.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))));
      return new Response("{}");
    }) as unknown as typeof fetch;
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    const ac = new AbortController();
    const p = a.turn({ goal: "g" }, ctx(ac.signal));
    ac.abort();
    await expect(p).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
  });

  it("fails on a failed response status", async () => {
    const { f } = fakeFetch([ok({ id: "r", status: "failed", error: { message: "model overloaded" }, output: [], usage: { input_tokens: 0, output_tokens: 0 } })]);
    const a = new OpenAIResponsesAdapter({ apiKey: "k", model: "m", fetch: f });
    await expect(a.turn({ goal: "g" }, ctx())).rejects.toThrow(/model overloaded/);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/openai-adapter.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`services/agentd/src/provider/openai.ts`:
```ts
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { ProtocolError } from "@law/protocol";
import type { ModelAdapter, ModelTurn, ModelTurnInput, ToolCall, TurnContext } from "./types.js";

export type FetchLike = typeof fetch;

export type OpenAIAdapterOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchLike;
  maxAttempts?: number;
  backoffMs?: number;
};

const OutputItem = z.discriminatedUnion("type", [
  z.object({ type: z.literal("function_call"), call_id: z.string(), name: z.string(), arguments: z.string() }),
  z.object({
    type: z.literal("message"),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  }),
]);
const ResponseBody = z.object({
  id: z.string(),
  status: z.string().optional(),
  error: z.object({ message: z.string() }).nullable().optional(),
  incomplete_details: z.object({ reason: z.string().optional() }).nullable().optional(),
  output: z.array(z.unknown()),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

const RETRY_STATUS = new Set([408, 429]);

export class OpenAIResponsesAdapter implements ModelAdapter {
  readonly model: string;
  private readonly apiKey: string;
  private readonly url: string;
  private readonly fetchImpl: FetchLike;
  private readonly maxAttempts: number;
  private readonly backoffMs: number;

  constructor(opts: OpenAIAdapterOptions) {
    this.model = opts.model;
    this.apiKey = opts.apiKey;
    this.url = `${(opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/responses`;
    this.fetchImpl = opts.fetch ?? fetch;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.backoffMs = opts.backoffMs ?? 500;
  }

  async turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn> {
    const body = {
      model: this.model,
      instructions: ctx.system,
      store: true,
      tools: ctx.tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.parameters, strict: false })),
      ...(ctx.previousResponseId ? { previous_response_id: ctx.previousResponseId } : {}),
      input:
        "goal" in input
          ? [{ role: "user", content: input.goal }]
          : input.toolResults.map((r) => ({ type: "function_call_output", call_id: r.callId, output: r.output })),
    };
    const raw = await this.post(body, ctx.signal);
    const parsed = ResponseBody.parse(raw);
    if (parsed.status === "failed") throw new Error(`model response failed: ${parsed.error?.message ?? "unknown error"}`);

    const texts: string[] = [];
    const toolCalls: ToolCall[] = [];
    for (const item of parsed.output) {
      const r = OutputItem.safeParse(item);
      if (!r.success) continue; // reasoning and other item types are opaque to us
      if (r.data.type === "function_call") {
        let args: unknown;
        try {
          args = JSON.parse(r.data.arguments);
        } catch {
          args = { __invalid: r.data.arguments };
        }
        toolCalls.push({ callId: r.data.call_id, name: r.data.name, args });
      } else {
        for (const c of r.data.content) if (c.type === "output_text" && c.text) texts.push(c.text);
      }
    }
    return {
      responseId: parsed.id,
      text: texts.join("\n"),
      toolCalls,
      usage: { inputTokens: parsed.usage?.input_tokens ?? 0, outputTokens: parsed.usage?.output_tokens ?? 0 },
    };
  }

  private async post(body: unknown, signal: AbortSignal): Promise<unknown> {
    let lastError = "";
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
      let res: Response;
      try {
        res = await this.fetchImpl(this.url, {
          method: "POST",
          headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      } catch (e) {
        if (signal.aborted) throw new ProtocolError("CANCELLED", "model request aborted");
        lastError = e instanceof Error ? e.message : String(e);
        await this.backoff(attempt, signal);
        continue;
      }
      if (res.ok) return await res.json();
      const text = await res.text();
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text;
      } catch {}
      lastError = `HTTP ${res.status}: ${message}`;
      if (res.status >= 500 || RETRY_STATUS.has(res.status)) {
        await this.backoff(attempt, signal);
        continue;
      }
      throw new Error(lastError);
    }
    throw new Error(`model request failed after ${this.maxAttempts} attempts: ${lastError}`);
  }

  private async backoff(attempt: number, signal: AbortSignal): Promise<void> {
    if (attempt >= this.maxAttempts) return;
    try {
      await sleep(this.backoffMs * 2 ** (attempt - 1), undefined, { signal });
    } catch {
      throw new ProtocolError("CANCELLED", "model request aborted");
    }
  }
}
```

Add to `services/agentd/src/index.ts`:
```ts
export { OpenAIResponsesAdapter } from "./provider/openai.js";
export type { OpenAIAdapterOptions } from "./provider/openai.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd/test/openai-adapter.test.ts && pnpm --filter @law/agentd typecheck`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Add OpenAI Responses adapter with transport retries"
```

---

### Task 2: Lease and LeasePolicy

**Files:**
- Create: `services/agentd/src/policy/lease.ts`, `services/agentd/test/lease.test.ts`
- Modify: `services/agentd/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  type LeaseOwner = "agent" | "human"
  type LeaseState = { owner: LeaseOwner; reason?: string; since: number }
  class Lease extends EventEmitter {
    readonly state: LeaseState                 // starts { owner: "human" }
    take(owner: LeaseOwner, reason?: string): LeaseState   // emits "change" when the owner changes
  }
  class LeasePolicy implements Policy { constructor(lease: Lease) }   // agent tool calls allowed only when owner === "agent"
  ```

- [ ] **Step 1: Failing test**

`services/agentd/test/lease.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Lease, LeasePolicy } from "../src/policy/lease.js";

describe("Lease", () => {
  it("starts with the human, changes owner and emits only on change", () => {
    const l = new Lease();
    const events: string[] = [];
    l.on("change", (s) => events.push(s.owner));
    expect(l.state.owner).toBe("human");
    l.take("agent", "run started");
    l.take("agent");
    l.take("human", "stop");
    expect(events).toEqual(["agent", "human"]);
    expect(l.state).toMatchObject({ owner: "human", reason: "stop" });
  });
});

describe("LeasePolicy", () => {
  it("denies agent tool calls unless the agent owns the lease", async () => {
    const l = new Lease();
    const p = new LeasePolicy(l);
    const call = { callId: "1", name: "terminal_input", args: {} };
    const ctx = { runId: "r", networkMode: "open" as const };
    expect(await p.authorize(call, ctx)).toMatchObject({ allow: false, code: "LEASE_DENIED" });
    l.take("agent");
    expect(await p.authorize(call, ctx)).toEqual({ allow: true });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/lease.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`services/agentd/src/policy/lease.ts`:
```ts
import { EventEmitter } from "node:events";
import type { Policy, PolicyContext, PolicyDecision } from "./types.js";
import type { ToolCall } from "../provider/types.js";

export type LeaseOwner = "agent" | "human";
export type LeaseState = { owner: LeaseOwner; reason?: string; since: number };

export class Lease extends EventEmitter {
  private _state: LeaseState = { owner: "human", since: Date.now() };

  get state(): LeaseState {
    return this._state;
  }

  take(owner: LeaseOwner, reason?: string): LeaseState {
    if (this._state.owner === owner) return this._state;
    this._state = { owner, since: Date.now(), ...(reason ? { reason } : {}) };
    this.emit("change", this._state);
    return this._state;
  }
}

export class LeasePolicy implements Policy {
  constructor(private readonly lease: Lease) {}

  async authorize(_call: ToolCall, _ctx: PolicyContext): Promise<PolicyDecision> {
    if (this.lease.state.owner !== "agent") {
      return { allow: false, code: "LEASE_DENIED", reason: "the human holds the terminal; wait for control to be handed back" };
    }
    return { allow: true };
  }
}
```

Add to `services/agentd/src/index.ts`:
```ts
export { Lease, LeasePolicy } from "./policy/lease.js";
export type { LeaseOwner, LeaseState } from "./policy/lease.js";
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd/test/lease.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Add terminal lease and lease-aware policy"
```

---

### Task 3: Daemon run wiring and events

**Files:**
- Modify: `services/agentd/src/ipc.ts`, `services/agentd/src/main.ts`, `services/agentd/src/orchestrator/run-controller.ts`
- Create: `services/agentd/test/daemon-run.test.ts`

**Interfaces:**
- Produces (Zod in `ipc.ts`):
  ```ts
  ConfigInit += { prices?: { inputUsdPerMTok: number; outputUsdPerMTok: number } }
  RunStart = { type:"run.start", goal: string(1..4000) }
  RunStop = { type:"run.stop" }
  RunResume = { type:"run.resume" }
  LeaseTake = { type:"lease.take", owner: "agent" | "human" }
  // agentd -> main
  RunStateMsg = { type:"run.state", runId, state: RunState, endReason?, finalText?, turns, toolCalls, costUsd: number | null }
  RunCommentary = { type:"run.commentary", runId, text }
  RunTool = { type:"run.tool", runId, name, status: "executing"|"done"|"denied"|"error", callId }
  RunHandoff = { type:"run.handoff", runId, reason }
  LeaseStateMsg = { type:"lease.state", owner, reason? }
  DaemonDeps += { makeAdapter: (model: string, apiKey: string) => ModelAdapter }
  RunController: get stats(): { turns: number; toolCalls: number; costUsd: number | null }
  ```
  Behaviour: `run.start` requires a ready session (else `agentd.error`); one run at a time (a second `run.start` while running → `agentd.error`). On start: lease → agent, run row via `store.createWorkspace(status.workspacePath)`. On `handoff` event: lease → human. On any terminal state: lease → human. `run.resume`: lease → agent, then `resumeFromHandoff`. `run.stop`: `stop()`. `lease.take {owner:"human"}` during a run pauses nothing but makes the next agent tool call LEASE_DENIED; `lease.take {owner:"agent"}` outside a run is ignored. `terminal.write` is dropped while `lease.owner === "agent"`.

- [ ] **Step 1: Failing test**

`services/agentd/test/daemon-run.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { Daemon } from "../src/ipc.js";
import { Store } from "../src/storage/store.js";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
afterEach(async () => {
  await fw?.close();
  fw = undefined;
});

async function boot(adapter: FakeModelAdapter) {
  const posted: Array<Record<string, unknown>> = [];
  const runtimeRoot = tmpDir("law-rt-");
  const runtime = {
    ensureRunning: async (spec: { runtimeDir: string }) => { fw = await FakeWorker.listen(path.join(spec.runtimeDir, "worker.sock")); return "started" as const; },
    destroy: async () => {},
    state: async () => "running" as const,
    logs: async () => "",
    imageExists: async () => true,
  };
  const d = new Daemon({
    openStore: (p) => new Store(p),
    makeManager: (imageId, root) => new TerminalSessionManager({ runtime, runtimeRoot: root, imageId, connect: (p) => SocketTerminalWorker.connect(p) }),
    makeAdapter: () => adapter,
    post: (m) => posted.push(m as Record<string, unknown>),
  });
  await d.handle({ type: "config.init", apiKey: "sk-x", model: "fake", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot });
  await d.handle({ type: "session.start", workspacePath: tmpDir("law-ws-"), networkMode: "open" });
  const types = () => posted.map((p) => p.type as string);
  const last = (type: string) => [...posted].reverse().find((p) => p.type === type);
  return { d, posted, types, last };
}
const settle = (pred: () => boolean, ms = 3000) => expect.poll(pred, { timeout: ms }).toBe(true);

describe("Daemon run flow", () => {
  it("runs a goal to completion, moving the lease agent -> human and streaming events", async () => {
    const adapter = new FakeModelAdapter([
      { text: "Listing.", toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "ls -al" } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "Two entries." },
    ]);
    const { d, posted, last } = await boot(adapter);
    expect(last("lease.state")).toBeUndefined();
    await d.handle({ type: "run.start", goal: "count files" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    const leases = posted.filter((p) => p.type === "lease.state").map((p) => p.owner);
    expect(leases).toEqual(["agent", "human"]);
    expect(last("run.commentary")).toMatchObject({ text: "Two entries." });
    expect(posted.filter((p) => p.type === "run.tool" && p.status === "done")).toHaveLength(3);
    expect(last("run.state")).toMatchObject({ state: "completed", finalText: "Two entries.", turns: 3, toolCalls: 3, costUsd: null });
    expect(fw!.screen).toBe("$ ls -al\n$ ");
  });

  it("drops human keystrokes while the agent owns the lease, accepts them afterwards", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 400 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("HUMAN") });
    expect(fw!.screen).toBe("$ ");
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("HUMAN") });
    await expect.poll(() => fw!.screen).toContain("HUMAN");
  });

  it("stops a running run and refuses a second concurrent run", async () => {
    const adapter = new FakeModelAdapter([{ text: "slow", delayMs: 5000 }]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "running");
    await d.handle({ type: "run.start", goal: "again" });
    expect(last("agentd.error")).toMatchObject({ message: expect.stringMatching(/already running/) });
    await d.handle({ type: "run.stop" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "stopped");
    expect(last("lease.state")).toMatchObject({ owner: "human" });
  });

  it("hands off on request_human and resumes on run.resume", async () => {
    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "request_human", args: { reason: "please log in" } }] },
      { text: "thanks" },
    ]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("run.handoff") as { reason?: string } | undefined)?.reason === "please log in");
    expect(last("lease.state")).toMatchObject({ owner: "human" });
    expect(last("run.state")).toMatchObject({ state: "handoff" });
    await d.handle({ type: "run.resume" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
  });

  it("human can take the lease mid-run; the next agent tool call is denied and fed back", async () => {
    const adapter = new FakeModelAdapter([
      { text: "wait", delayMs: 300, toolCalls: [{ name: "terminal_observe", args: {} }] },
      { text: "ok" },
    ]);
    const { d, last } = await boot(adapter);
    await d.handle({ type: "run.start", goal: "g" });
    await settle(() => (last("lease.state") as { owner?: string } | undefined)?.owner === "agent");
    await d.handle({ type: "lease.take", owner: "human" });
    await settle(() => (last("run.state") as { state?: string } | undefined)?.state === "completed");
    expect(last("run.tool")).toMatchObject({ name: "terminal_observe", status: "denied" });
  });

  it("refuses run.start without a ready session", async () => {
    const posted: Array<Record<string, unknown>> = [];
    const d = new Daemon({ openStore: (p) => new Store(p), makeManager: () => { throw new Error("unused"); }, makeAdapter: () => new FakeModelAdapter([]), post: (m) => posted.push(m as Record<string, unknown>) });
    await d.handle({ type: "run.start", goal: "g" });
    expect(posted.at(-1)).toMatchObject({ type: "agentd.error" });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm vitest run services/agentd/test/daemon-run.test.ts`
Expected: FAIL (unknown message types / missing deps).

- [ ] **Step 3: Implement**

In `services/agentd/src/orchestrator/run-controller.ts` add after `get state()`:
```ts
  get stats(): { turns: number; toolCalls: number; costUsd: number | null } {
    return { turns: this.budget.turns, toolCalls: this.budget.toolCalls, costUsd: this.costKnown ? this.budget.costUsd : null };
  }
```
and track `private costKnown = true;` set to `false` where `usd === undefined` is handled in `start()` (`if (usd === undefined) { this.costKnown = false; store.appendEvent(...) }`).

Replace `services/agentd/src/ipc.ts` with:
```ts
import { z } from "zod";
import { NetworkMode, type RunState } from "@law/protocol";
import type { Store } from "./storage/store.js";
import type { SessionStatus, TerminalSessionManager } from "./session/terminal-session-manager.js";
import type { ModelAdapter } from "./provider/types.js";
import { RunController } from "./orchestrator/run-controller.js";
import { Lease, LeasePolicy, type LeaseOwner } from "./policy/lease.js";
import type { PriceTable } from "./orchestrator/budgets.js";

const Prices = z.object({ inputUsdPerMTok: z.number().nonnegative(), outputUsdPerMTok: z.number().nonnegative() });

export const ConfigInit = z.object({
  type: z.literal("config.init"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dbPath: z.string().min(1),
  imageId: z.string().min(1),
  runtimeRoot: z.string().min(1),
  prices: Prices.optional(),
});
export type ConfigInit = z.infer<typeof ConfigInit>;

export const SessionStart = z.object({ type: z.literal("session.start"), workspacePath: z.string().min(1), networkMode: NetworkMode });
export const SessionStop = z.object({ type: z.literal("session.stop"), destroy: z.boolean() });
export const TerminalWrite = z.object({ type: z.literal("terminal.write"), data: z.instanceof(Uint8Array) });
export const TerminalResizeMsg = z.object({ type: z.literal("terminal.resize"), cols: z.number().int().min(20).max(500), rows: z.number().int().min(5).max(200) });
export const RunStart = z.object({ type: z.literal("run.start"), goal: z.string().min(1).max(4000) });
export const RunStop = z.object({ type: z.literal("run.stop") });
export const RunResume = z.object({ type: z.literal("run.resume") });
export const LeaseTake = z.object({ type: z.literal("lease.take"), owner: z.enum(["agent", "human"]) });

export const MainToAgentd = z.discriminatedUnion("type", [ConfigInit, SessionStart, SessionStop, TerminalWrite, TerminalResizeMsg, RunStart, RunStop, RunResume, LeaseTake]);
export type MainToAgentd = z.infer<typeof MainToAgentd>;

export const AgentdReady = z.object({
  type: z.literal("agentd.ready"),
  schemaVersion: z.number().int(),
  dbPath: z.string(),
  model: z.string(),
  interruptedRuns: z.number().int(),
});
export type AgentdReady = z.infer<typeof AgentdReady>;
export const AgentdError = z.object({ type: z.literal("agentd.error"), message: z.string() });
export type AgentdError = z.infer<typeof AgentdError>;
export type SessionStateMsg = { type: "session.state" } & SessionStatus;
export type TerminalData = { type: "terminal.data"; data: Uint8Array };
export type RunStateMsg = { type: "run.state"; runId: string; state: RunState; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null };
export type RunCommentary = { type: "run.commentary"; runId: string; text: string };
export type RunTool = { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string };
export type RunHandoff = { type: "run.handoff"; runId: string; reason: string };
export type LeaseStateMsg = { type: "lease.state"; owner: LeaseOwner; reason?: string };
export type AgentdToMain = AgentdReady | AgentdError | SessionStateMsg | TerminalData | RunStateMsg | RunCommentary | RunTool | RunHandoff | LeaseStateMsg;

export type AgentdRuntime = { store: Store; model: string; apiKey: string; prices: PriceTable };

export function handleConfigInit(msg: unknown, openStore: (dbPath: string) => Store): { reply: AgentdReady | AgentdError; runtime?: AgentdRuntime } {
  const parsed = ConfigInit.safeParse(msg);
  if (!parsed.success) return { reply: { type: "agentd.error", message: "invalid config.init" } };
  const { apiKey, model, dbPath, prices } = parsed.data;
  try {
    const store = openStore(dbPath);
    const interruptedRuns = store.markInterruptedRuns("agentd_restart");
    const runtime: AgentdRuntime = { store, model, apiKey, prices: prices ? { [model]: prices } : {} };
    return { reply: { type: "agentd.ready", schemaVersion: store.schemaVersion, dbPath, model, interruptedRuns }, runtime };
  } catch (e) {
    return { reply: { type: "agentd.error", message: e instanceof Error ? e.message : String(e) } };
  }
}

export type DaemonDeps = {
  openStore: (dbPath: string) => Store;
  makeManager: (imageId: string, runtimeRoot: string) => TerminalSessionManager;
  makeAdapter: (model: string, apiKey: string) => ModelAdapter;
  post: (msg: AgentdToMain) => void;
};

export class Daemon {
  private runtime: AgentdRuntime | undefined;
  private manager: TerminalSessionManager | undefined;
  private readonly lease = new Lease();
  private run: RunController | undefined;

  constructor(private readonly deps: DaemonDeps) {
    this.lease.on("change", (s: { owner: LeaseOwner; reason?: string }) => this.deps.post({ type: "lease.state", owner: s.owner, ...(s.reason ? { reason: s.reason } : {}) }));
  }

  async handle(raw: unknown): Promise<void> {
    const parsed = MainToAgentd.safeParse(raw);
    if (!parsed.success) {
      this.deps.post({ type: "agentd.error", message: `invalid message: ${parsed.error.issues[0]?.message ?? "unknown"}` });
      return;
    }
    const msg = parsed.data;
    if (msg.type !== "terminal.write") console.error(`[agentd] <- ${msg.type}`);
    switch (msg.type) {
      case "config.init": {
        const { reply, runtime } = handleConfigInit(msg, this.deps.openStore);
        if (runtime) {
          this.runtime = runtime;
          this.manager = this.deps.makeManager(msg.imageId, msg.runtimeRoot);
          this.manager.on("data", (data: Uint8Array) => this.deps.post({ type: "terminal.data", data }));
          this.manager.on("status", (s: SessionStatus) => this.deps.post({ type: "session.state", ...s }));
        }
        this.deps.post(reply);
        return;
      }
      case "session.start":
        await this.requireManager().start(msg.workspacePath, msg.networkMode);
        return;
      case "session.stop":
        this.run?.stop();
        if (msg.destroy) await this.requireManager().destroy();
        else this.requireManager().detach();
        return;
      case "terminal.write":
        if (this.lease.state.owner === "human") this.requireManager().write(msg.data);
        return;
      case "terminal.resize":
        await this.requireManager().resize(msg.cols, msg.rows);
        return;
      case "run.start":
        this.startRun(msg.goal);
        return;
      case "run.stop":
        this.run?.stop();
        return;
      case "run.resume":
        if (this.run?.state === "handoff") {
          this.lease.take("agent", "resumed by human");
          this.run.resumeFromHandoff();
        }
        return;
      case "lease.take":
        if (msg.owner === "human") this.lease.take("human", "taken by human");
        else if (this.run && this.run.state !== "handoff" && !this.isTerminal(this.run.state)) this.lease.take("agent", "given back by human");
        return;
    }
  }

  private startRun(goal: string): void {
    const manager = this.manager;
    const runtime = this.runtime;
    const status = manager?.status;
    if (!manager || !runtime || !status || status.state !== "ready" || !manager.worker || !status.workspacePath) {
      this.deps.post({ type: "agentd.error", message: "no ready sandbox session; open a workspace first" });
      return;
    }
    if (this.run && !this.isTerminal(this.run.state)) {
      this.deps.post({ type: "agentd.error", message: "a run is already running; stop it first" });
      return;
    }
    const workspaceId = runtime.store.createWorkspace(status.workspacePath);
    const rc = new RunController(
      {
        store: runtime.store,
        adapter: this.deps.makeAdapter(runtime.model, runtime.apiKey),
        worker: manager.worker,
        policy: new LeasePolicy(this.lease),
        prices: runtime.prices,
      },
      { workspaceId, goal, networkMode: status.networkMode ?? "open" },
    );
    this.run = rc;
    const postState = (state: RunState, extra: { endReason?: string; finalText?: string } = {}) =>
      this.deps.post({ type: "run.state", runId: rc.runId, state, ...extra, ...rc.stats });
    rc.on("state", (state: RunState) => {
      if (state === "handoff" || this.isTerminal(state)) this.lease.take("human", state === "handoff" ? "agent asked for help" : `run ${state}`);
      if (!this.isTerminal(state)) postState(state);
    });
    rc.on("commentary", (text: string) => this.deps.post({ type: "run.commentary", runId: rc.runId, text }));
    rc.on("tool", (t: { name: string; status: RunTool["status"]; callId: string }) => this.deps.post({ type: "run.tool", runId: rc.runId, ...t }));
    rc.on("handoff", (h: { reason: string }) => this.deps.post({ type: "run.handoff", runId: rc.runId, reason: h.reason }));
    this.lease.take("agent", "run started");
    void rc.start().then((out) => postState(out.state, { ...(out.endReason ? { endReason: out.endReason } : {}), ...(out.finalText !== undefined ? { finalText: out.finalText } : {}) }));
  }

  private isTerminal(state: RunState): boolean {
    return state === "completed" || state === "stopped" || state === "failed" || state === "budget_exceeded" || state === "interrupted";
  }

  private requireManager(): TerminalSessionManager {
    if (!this.manager) throw new Error("agentd not initialised (config.init missing)");
    return this.manager;
  }
}
```

Note: `handleConfigInit` now returns `{ reply, runtime }`; update `services/agentd/test/ipc.test.ts` to read `.reply` (two assertions) and drop the `getRuntime` export.

In `services/agentd/src/main.ts`, add the adapter factory to the Daemon:
```ts
import { OpenAIResponsesAdapter } from "./provider/openai.js";
// ...
    makeAdapter: (model, apiKey) => new OpenAIResponsesAdapter({ model, apiKey }),
```

Update `services/agentd/src/index.ts` exports: add `RunStart, RunStop, RunResume, LeaseTake` and types `RunStateMsg, RunCommentary, RunTool, RunHandoff, LeaseStateMsg`.

- [ ] **Step 4: Run to see it pass**

Run: `pnpm vitest run services/agentd && pnpm --filter @law/agentd typecheck && pnpm --filter @law/agentd build`
Expected: all agentd suites pass, including the updated `ipc.test.ts` and the 6 new daemon-run tests.

- [ ] **Step 5: Commit**

```bash
git add services/agentd && git commit -m "Wire runs, lease and run events through the agentd daemon"
```

---

### Task 4: Electron: run drawer, owner bar, handoff banner

**Files:**
- Modify: `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/renderer/App.tsx`, `apps/desktop/src/renderer/styles.css`
- Create: `apps/desktop/src/renderer/RunDrawer.tsx`

**Interfaces:**
- Preload additions: `startRun(goal)`, `stopRun()`, `resumeRun()`, `takeControl()`, `releaseControl()`, `onRun(cb)` (receives `run.state | run.commentary | run.tool | run.handoff` payloads), `onLease(cb)`.
- Main: forwards `run.*` to channel `run:event`, `lease.state` to `lease:state`; reads prices from env `OPENAI_PRICE_INPUT_PER_MTOK` / `OPENAI_PRICE_OUTPUT_PER_MTOK` into `config.init.prices` when both parse as numbers.

- [ ] **Step 1: Implement main and preload**

In `apps/desktop/src/main/index.ts`:
- extend `onAgentd` switch:
  ```ts
      case "run.state":
      case "run.commentary":
      case "run.tool":
      case "run.handoff":
        send("run:event", msg);
        return;
      case "lease.state":
        lease = { owner: msg.owner, ...(msg.reason ? { reason: msg.reason } : {}) };
        send("lease:state", lease);
        return;
  ```
  with `let lease: { owner: "agent" | "human"; reason?: string } = { owner: "human" };`
- in `startAgentd`, compute prices:
  ```ts
  const pin = Number(env.OPENAI_PRICE_INPUT_PER_MTOK), pout = Number(env.OPENAI_PRICE_OUTPUT_PER_MTOK);
  const prices = Number.isFinite(pin) && Number.isFinite(pout) && env.OPENAI_PRICE_INPUT_PER_MTOK ? { inputUsdPerMTok: pin, outputUsdPerMTok: pout } : undefined;
  toAgentd({ type: "config.init", apiKey, model, dbPath: dbPath(), imageId, runtimeRoot: runtimeRoot(), ...(prices ? { prices } : {}) });
  ```
- IPC handlers:
  ```ts
  ipcMain.handle("lease:get", () => lease);
  ipcMain.handle("run:start", (_e, goal: unknown) => { if (typeof goal === "string" && goal.trim()) toAgentd({ type: "run.start", goal: goal.trim().slice(0, 4000) }); });
  ipcMain.handle("run:stop", () => toAgentd({ type: "run.stop" }));
  ipcMain.handle("run:resume", () => toAgentd({ type: "run.resume" }));
  ipcMain.handle("lease:take", (_e, owner: unknown) => toAgentd({ type: "lease.take", owner: owner === "agent" ? "agent" : "human" }));
  ```

In `apps/desktop/src/preload/index.ts` add to `api`:
```ts
  getLease: () => ipcRenderer.invoke("lease:get"),
  startRun: (goal: string) => ipcRenderer.invoke("run:start", goal),
  stopRun: () => ipcRenderer.invoke("run:stop"),
  resumeRun: () => ipcRenderer.invoke("run:resume"),
  takeControl: () => ipcRenderer.invoke("lease:take", "human"),
  releaseControl: () => ipcRenderer.invoke("lease:take", "agent"),
  onRun: on<unknown>("run:event"),
  onLease: on<unknown>("lease:state"),
```

- [ ] **Step 2: Renderer**

`apps/desktop/src/renderer/RunDrawer.tsx`:
```tsx
import { useState } from "react";

export type RunEvent =
  | { type: "run.state"; runId: string; state: string; endReason?: string; finalText?: string; turns: number; toolCalls: number; costUsd: number | null }
  | { type: "run.commentary"; runId: string; text: string }
  | { type: "run.tool"; runId: string; name: string; status: "executing" | "done" | "denied" | "error"; callId: string }
  | { type: "run.handoff"; runId: string; reason: string };

export type RunView = {
  state?: string;
  endReason?: string;
  finalText?: string;
  turns: number;
  toolCalls: number;
  costUsd: number | null;
  log: Array<{ kind: "commentary" | "tool"; text: string; status?: string }>;
};

export const emptyRun: RunView = { turns: 0, toolCalls: 0, costUsd: null, log: [] };

export function reduceRun(view: RunView, e: RunEvent): RunView {
  switch (e.type) {
    case "run.state":
      return { ...view, state: e.state, turns: e.turns, toolCalls: e.toolCalls, costUsd: e.costUsd, ...(e.endReason ? { endReason: e.endReason } : {}), ...(e.finalText !== undefined ? { finalText: e.finalText } : {}) };
    case "run.commentary":
      return { ...view, log: [...view.log, { kind: "commentary", text: e.text }] };
    case "run.tool": {
      const log = [...view.log];
      const i = log.findIndex((l) => l.kind === "tool" && l.text === `${e.name} ${e.callId}`);
      const row = { kind: "tool" as const, text: `${e.name} ${e.callId}`, status: e.status };
      if (i >= 0) log[i] = row; else log.push(row);
      return { ...view, log };
    }
    case "run.handoff":
      return { ...view, log: [...view.log, { kind: "commentary", text: `Agent asks for help: ${e.reason}` }] };
  }
}

const RUNNING = new Set(["running", "awaiting_approval", "handoff"]);

export function RunDrawer({ run, sandboxReady }: { run: RunView; sandboxReady: boolean }) {
  const [goal, setGoal] = useState("Run ls -al and tell me how many entries are listed.");
  const busy = run.state !== undefined && RUNNING.has(run.state);
  return (
    <aside className="drawer">
      <label className="label" htmlFor="goal">Goal</label>
      <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} disabled={busy} />
      <div className="row">
        <button className="btn primary" disabled={!sandboxReady || busy || !goal.trim()} onClick={() => void window.workbench.startRun(goal)}>Start run</button>
        <button className="btn danger" disabled={!busy} onClick={() => void window.workbench.stopRun()}>Stop</button>
      </div>
      <div className="stats">
        <span>state <b>{run.state ?? "idle"}</b>{run.endReason ? ` (${run.endReason})` : ""}</span>
        <span>turns <b>{run.turns}</b></span>
        <span>tools <b>{run.toolCalls}</b></span>
        <span>cost <b>{run.costUsd === null ? "n/a" : `$${run.costUsd.toFixed(4)}`}</b></span>
      </div>
      <ol className="log">
        {run.log.map((l, i) => (
          <li key={i} className={l.kind === "tool" ? `tool ${l.status ?? ""}` : "commentary"}>
            {l.kind === "tool" ? <><code>{l.text.split(" ")[0]}</code> <span className="st">{l.status}</span></> : l.text}
          </li>
        ))}
        {run.finalText && run.state === "completed" && <li className="final">{run.finalText}</li>}
      </ol>
    </aside>
  );
}
```

`apps/desktop/src/renderer/App.tsx` (full replacement):
```tsx
import { useEffect, useState } from "react";
import { TerminalPanel } from "./TerminalPanel";
import { RunDrawer, emptyRun, reduceRun, type RunEvent, type RunView } from "./RunDrawer";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };
type SessionStatus = { state: "idle" | "starting" | "ready" | "disconnected" | "stopped" | "error"; sessionId?: string; workspacePath?: string; networkMode?: "open" | "none"; message?: string };
type LeaseState = { owner: "agent" | "human"; reason?: string };

declare global {
  interface Window {
    workbench: {
      getStatus(): Promise<AgentdStatus>;
      getSession(): Promise<SessionStatus>;
      getLease(): Promise<LeaseState>;
      selectWorkspace(): Promise<void>;
      reopenLast(): Promise<void>;
      getNetwork(): Promise<"open" | "none">;
      setNetwork(mode: "open" | "none"): Promise<"open" | "none">;
      destroySandbox(): Promise<void>;
      terminalWrite(data: string): void;
      terminalResize(cols: number, rows: number): void;
      startRun(goal: string): Promise<void>;
      stopRun(): Promise<void>;
      resumeRun(): Promise<void>;
      takeControl(): Promise<void>;
      releaseControl(): Promise<void>;
      onEvent(cb: (e: AgentdStatus) => void): () => void;
      onSession(cb: (s: SessionStatus) => void): () => void;
      onTerminalData(cb: (data: Uint8Array) => void): () => void;
      onRun(cb: (e: RunEvent) => void): () => void;
      onLease(cb: (l: LeaseState) => void): () => void;
    };
  }
}

export function App() {
  const [status, setStatus] = useState<AgentdStatus>({ type: "agentd.starting" });
  const [session, setSession] = useState<SessionStatus>({ state: "idle" });
  const [network, setNetwork] = useState<"open" | "none">("open");
  const [lease, setLease] = useState<LeaseState>({ owner: "human" });
  const [run, setRun] = useState<RunView>(emptyRun);
  const [handoff, setHandoff] = useState<string | null>(null);

  useEffect(() => {
    void window.workbench.getStatus().then(setStatus);
    void window.workbench.getSession().then(setSession);
    void window.workbench.getNetwork().then(setNetwork);
    void window.workbench.getLease().then(setLease);
    const offs = [
      window.workbench.onEvent(setStatus),
      window.workbench.onSession(setSession),
      window.workbench.onLease(setLease),
      window.workbench.onRun((e) => {
        setRun((v) => (e.type === "run.state" && e.state === "running" && v.state === undefined ? reduceRun(emptyRun, e) : reduceRun(v, e)));
        if (e.type === "run.handoff") setHandoff(e.reason);
        if (e.type === "run.state" && e.state !== "handoff") setHandoff(null);
        if (e.type === "run.state" && e.state === "running" && e.turns === 0) setRun(reduceRun(emptyRun, e));
      }),
    ];
    return () => offs.forEach((f) => f());
  }, []);

  const dot = status.type === "agentd.ready" ? "ready" : status.type === "agentd.error" ? "error" : "";
  const live = session.state === "ready";
  const agentOwns = lease.owner === "agent";

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">LINUX AGENT WORKBENCH</span>
        <button className="btn" onClick={() => void window.workbench.selectWorkspace()}>Open workspace…</button>
        <span className="path" title={session.workspacePath}>{session.workspacePath ?? "no workspace"}</span>
        <span className={`badge net-${network}`} title="Container network for the next start">
          NET {network.toUpperCase()}
          <select value={network} onChange={(e) => void window.workbench.setNetwork(e.target.value as "open" | "none").then(setNetwork)}>
            <option value="open">open</option>
            <option value="none">none</option>
          </select>
        </span>
        <span className="spacer" />
        <span className="status">
          <span className={`dot ${dot}`} />
          {status.type === "agentd.starting" && "agentd starting"}
          {status.type === "agentd.ready" && `${status.model} · sandbox ${session.state} · run ${run.state ?? "idle"}`}
          {status.type === "agentd.error" && `agentd error: ${status.message}`}
        </span>
        <button className="btn danger" disabled={!session.sessionId} onClick={() => void window.workbench.destroySandbox()}>Destroy sandbox</button>
      </header>
      {handoff && (
        <div className="banner">
          <span>Agent paused and needs you: <b>{handoff}</b>. You have the keyboard.</span>
          <button className="btn primary" onClick={() => void window.workbench.resumeRun()}>Give control back to agent</button>
        </div>
      )}
      <main className="main">
        {live ? <TerminalPanel owner={agentOwns ? "agent" : "human"} /> : (
          <div className="empty">
            {session.state === "error" && <pre className="error">{session.message}</pre>}
            {session.state === "starting" && <p>Starting sandbox…</p>}
            {session.state === "disconnected" && (
              <p>Disconnected from the sandbox. <button className="btn" onClick={() => void window.workbench.reopenLast()}>Reconnect</button></p>
            )}
            {(session.state === "idle" || session.state === "stopped") && <p>Open a workspace to start a sandboxed terminal.</p>}
          </div>
        )}
        <RunDrawer run={run} sandboxReady={live} />
      </main>
      <footer className="bottombar">
        <span className={`owner ${lease.owner}`}>{agentOwns ? "AGENT controls the terminal" : "HUMAN controls the terminal"}</span>
        {lease.reason && <span className="hint">{lease.reason}</span>}
        <span className="spacer" />
        {agentOwns ? (
          <button className="btn" onClick={() => void window.workbench.takeControl()}>Take control</button>
        ) : (
          run.state && ["running", "awaiting_approval"].includes(run.state) && (
            <button className="btn" onClick={() => void window.workbench.releaseControl()}>Give control back</button>
          )
        )}
      </footer>
    </div>
  );
}
```

Append to `apps/desktop/src/renderer/styles.css`:
```css
.main { gap: 12px; }
.drawer { width: 380px; flex: none; display: flex; flex-direction: column; gap: 10px; background: var(--panel); border: 1px solid #1f242b; border-radius: 6px; padding: 12px; min-height: 0; }
.drawer textarea { width: 100%; background: var(--bg); color: var(--fg); border: 1px solid #2a3139; border-radius: 4px; padding: 8px; font: inherit; resize: vertical; }
.label { color: var(--muted); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.row { display: flex; gap: 8px; }
.btn.primary { border-color: var(--human); color: var(--human); }
.stats { display: flex; gap: 14px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
.stats b { color: var(--fg); font-weight: 600; }
.log { list-style: none; margin: 0; padding: 0; overflow: auto; min-height: 0; flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.log .commentary { color: var(--fg); padding: 6px 8px; background: var(--bg); border-radius: 4px; border-left: 2px solid var(--agent); }
.log .tool { color: var(--muted); padding: 2px 8px; display: flex; gap: 8px; align-items: baseline; }
.log .tool code { color: var(--fg); }
.log .tool .st { font-size: 11px; text-transform: uppercase; }
.log .tool.done .st { color: #22c55e; }
.log .tool.denied .st, .log .tool.error .st { color: var(--agent); }
.log .final { color: #22c55e; padding: 8px; border: 1px solid #22c55e; border-radius: 4px; }
.banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: rgba(59, 130, 246, 0.12); border-bottom: 1px solid var(--human); }
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm test && pnpm dev`
With the sandbox ready: press "Start run" with the default goal. Expected: outline turns red, bottom bar says "AGENT controls the terminal", the drawer shows commentary and tool rows (`terminal_input` × n, `terminal_observe`), the terminal shows `ls -al` typed and executed by the agent, then the run completes with a green final answer naming the number of entries. Typing on the keyboard during the run does nothing; after completion the outline turns blue and typing works again. Then test Stop: start a second run and press Stop within a second: state `stopped`, outline blue.

Proof to capture: screenshot during the run (red outline, tool rows) and after completion (final answer); SQLite check:
```bash
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.HOME+'/.local/share/linux-agent-workbench/state.sqlite',{readOnly:true});console.log(d.prepare('select state,end_reason,turns,tool_calls,cost_usd from runs order by started_at desc limit 3').all());console.log(d.prepare('select name,status from tool_calls order by started_at desc limit 6').all())"
```

- [ ] **Step 4: Commit**

```bash
git add apps && git commit -m "Add run drawer, lease-aware owner bar and handoff banner"
```

---

### Task 5: Wrap-up

- [ ] **Step 1:** `pnpm typecheck && pnpm test && pnpm build && pnpm test:container` all green.
- [ ] **Step 2:** README: add under `.env` keys: `OPENAI_PRICE_INPUT_PER_MTOK`, `OPENAI_PRICE_OUTPUT_PER_MTOK` (optional, USD per million tokens; without them cost shows `n/a`).
- [ ] **Step 3:** Commit `"Document price env vars"`, merge to main.

## Self-review notes

- Spec coverage for M3: §6 loop with real provider (Task 1, 3), budgets and cost (Task 3 stats + prices), §7.5 lease (Task 2, 3), §9 drawer/owner bar/handoff (Task 4). Deferred to M4: command gate, approvals, nested-prompt detection, git snapshot, `terminal.restart`.
- Names shared: `OpenAIResponsesAdapter`, `Lease`, `LeasePolicy`, `Daemon.makeAdapter`, `RunController.stats`, events `run.state|run.commentary|run.tool|run.handoff|lease.state`, messages `run.start|run.stop|run.resume|lease.take`.
