import { EventEmitter } from "node:events";
import { DEFAULT_BUDGETS, ProtocolError, type Budgets, type BudgetAction, type RunBudgetStatus, type NetworkMode, type RunState } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { ModelAdapter, ModelTurnInput, ToolCall, ToolExecutor, ToolResult } from "../provider/types.js";
import type { TerminalWorker } from "../worker/types.js";
import { allowAllPolicy, type Policy } from "../policy/types.js";
import { HandoffRequested, terminalExecutor } from "../tools/terminal-tools.js";
import { BudgetExceededError, BudgetTracker, costOf, type PriceTable } from "./budgets.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export type RunControllerDeps = {
  store: Store;
  adapter: ModelAdapter;
  worker: TerminalWorker;
  tools?: ToolExecutor;
  policy?: Policy;
  budgets?: Budgets;
  prices?: PriceTable;
  systemPrompt?: string;
  now?: () => number;
  /** When given, a pending approval card parks the run in awaiting_approval instead of letting the model poll. */
  approvals?: { hasPending(runId: string): boolean; once(event: "resolved", cb: () => void): unknown; off(event: "resolved", cb: () => void): unknown };
  /**
   * Context compaction: every N turns the model writes a short state summary and the conversation chain is
   * restarted from the goal plus that summary. Long runs then cost a few thousand tokens per turn instead
   * of the whole history. 0 or undefined = never.
   */
  compactEvery?: number;
};

const COMPACT_PROMPT =
  "Pause. Write a compact state summary for yourself (plain text, no tool calls, at most 15 lines): what the goal is, what is done and verified (with file paths), what is in progress, what remains, and any facts you must not lose (ids, revisions, URLs, decisions). Your next message will start a fresh context with only the goal and this summary.";

export type RunInput = { workspaceId: string; goal: string; networkMode: NetworkMode; snapshot?: unknown };

export type RunOutcome = { runId: string; state: RunState; endReason?: string; finalText?: string };

export class RunController extends EventEmitter {
  readonly runId: string;
  private _state: RunState = "idle";
  private readonly abort = new AbortController();
  private readonly budget: BudgetTracker;
  private readonly policy: Policy;
  private readonly prices: PriceTable;
  private readonly system: string;
  private readonly tools: ToolExecutor;
  private handoffResume: (() => void) | undefined;
  private costKnown: boolean;
  private unknownCostLogged = false;
  private budgetResume: (() => void) | undefined;
  private budgetReason: keyof Budgets | null = null;
  private reobserveAfterBudget = false;
  private controlRevision = 0;
  private humanPause: { reason: string; promise: Promise<void>; resolve: () => void } | undefined;

  /** Resolve only after all in-flight work is finished and the run is parked (or has ended). */
  pauseForHuman(reason: string): Promise<void> {
    if (this.state === "handoff" || this.state === "budget_paused" || ["completed", "failed", "stopped", "budget_exceeded"].includes(this.state)) return Promise.resolve();
    if (this.humanPause) return this.humanPause.promise;
    let resolve!: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    this.controlRevision++;
    this.humanPause = { reason, promise, resolve };
    return promise;
  }


  constructor(
    private readonly deps: RunControllerDeps,
    private readonly input: RunInput,
  ) {
    super();
    this.policy = deps.policy ?? allowAllPolicy;
    this.prices = deps.prices ?? {};
    this.costKnown = deps.adapter.model in this.prices;
    this.system = deps.systemPrompt ?? SYSTEM_PROMPT;
    this.tools = deps.tools ?? terminalExecutor(deps.worker);
    this.budget = new BudgetTracker({ ...(deps.budgets ?? DEFAULT_BUDGETS) }, deps.now);
    this.runId = deps.store.createRun({
      workspaceId: input.workspaceId,
      goal: input.goal,
      model: deps.adapter.model,
      networkMode: input.networkMode,
      ...(input.snapshot !== undefined ? { snapshot: input.snapshot } : {}),
    });
  }

  get state(): RunState {
    return this._state;
  }

  get stats(): { turns: number; toolCalls: number; costUsd: number | null } {
    return { turns: this.budget.turns, toolCalls: this.budget.toolCalls, costUsd: this.costKnown ? this.budget.costUsd : null };
  }

  get budgetStatus(): RunBudgetStatus {
    return { limits: this.budget.limits, elapsedMs: this.budget.elapsedMs(), reason: this.budgetReason };
  }

  resumeBudget(action: BudgetAction): void {
    if (this.state !== "budget_paused" || !this.budgetResume) throw new Error("This task is not paused at a limit");
    const allowed = this.budgetReason === "maxDurationMs" ? ["add_time", "unlimited_time"]
      : this.budgetReason === "maxCostUsd" ? ["add_cost"] : ["add_steps", "unlimited_steps"];
    if (!allowed.includes(action)) throw new Error("Choose an action for the reached limit");
    this.budget.extend(action);
    this.deps.store.appendEvent(this.runId, "budget.extended", { action, limits: this.budget.limits });
    const resume = this.budgetResume;
    this.budgetResume = undefined; // rapid duplicate clicks cannot increase the allowance twice
    resume();
  }

  stop(): void {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    this.deps.worker.cancel();
    this.handoffResume?.();
    this.budgetResume?.();
  }

  resumeFromHandoff(): void {
    this.handoffResume?.();
  }

  async start(): Promise<RunOutcome> {
    this.setState("running");
    const { store, adapter, worker } = this.deps;
    const signal = this.abort.signal;
    let previousResponseId: string | undefined;
    let next: ModelTurnInput = { goal: this.input.goal };
    const compactEvery = adapter.managesContext ? 0 : this.deps.compactEvery ?? 0;
    let turnsInChain = 0;

    const callModel = async (input: ModelTurnInput) => {
      const turn = await adapter.turn(input, {
        ...(previousResponseId ? { previousResponseId } : {}),
        tools: this.tools.specs,
        system: this.system,
        signal,
      });
      previousResponseId = turn.responseId;
      turnsInChain++;
      this.budget.addTurn();
      const usd = costOf(adapter.model, turn.usage, this.prices);
      if (usd === undefined) {
        this.costKnown = false;
        if (!this.unknownCostLogged) store.appendEvent(this.runId, "cost.unknown_model", { model: adapter.model });
        this.unknownCostLogged = true;
      } else this.budget.addCost(usd);
      store.recordUsage(this.runId, { responseId: turn.responseId, ...turn.usage, costUsd: usd ?? 0 });
      store.addRunTotals(this.runId, { turns: 1, costUsd: usd ?? 0 });
      return turn;
    };

    try {
      for (;;) {
        this.throwIfStopped();
        if (this.humanPause) {
          await this.handoff(this.humanPause.reason, worker);
          if ("toolResults" in next) next = { ...next, message: "The human changed the browser during manual login. Re-observe before acting." };
        }
        await this.checkBudget("model");

        // Compaction: the chain carries every observation so far; past the limit, replace it with a summary.
        if (compactEvery > 0 && turnsInChain >= compactEvery && "toolResults" in next) {
          // The pending tool results travel with the request, so no function call is left unanswered.
          const summary = await callModel({ toolResults: next.toolResults, message: COMPACT_PROMPT });
          store.appendEvent(this.runId, "context.compacted", { turnsInChain, summaryChars: summary.text.length });
          this.emit("commentary", `[context compacted after ${turnsInChain} turns]`);
          previousResponseId = undefined;
          turnsInChain = 0;
          next = { goal: `${this.input.goal}\n\nYou have already been working on this. Your own state summary from the previous context:\n${summary.text}\n\nContinue from there; re-observe before acting.` };
        }

        await this.checkBudget("model");
        if (this.reobserveAfterBudget && "toolResults" in next) {
          next = { ...next, message: "The human resumed this task after a limit pause. Re-observe affected surfaces before taking actions; they may have changed while paused." };
          this.reobserveAfterBudget = false;
        }
        const controlRevision = this.controlRevision;
        const turn = await callModel(next);
        store.appendEvent(this.runId, "model.turn", {
          responseId: turn.responseId,
          text: turn.text,
          toolCalls: turn.toolCalls.map((c) => c.name),
        });
        if (turn.text) this.emit("commentary", turn.text);

        if (turn.toolCalls.length === 0) {
          return this.finish("completed", "final_answer", turn.text);
        }

        const results: ToolResult[] = [];
        for (const call of turn.toolCalls) {
          this.throwIfStopped();
          await this.checkBudget("tool");
          if (this.humanPause || controlRevision !== this.controlRevision) {
            results.push({ callId: call.callId, output: JSON.stringify({ skipped: "Human took control. Re-observe after resuming before acting." }) });
            continue;
          }
          results.push(await this.runTool(call, worker, signal));
          this.budget.addToolCall();
          store.addRunTotals(this.runId, { toolCalls: 1 });
        }
        next = { toolResults: results };
      }
    } catch (e) {
      if (signal.aborted) return this.finish("stopped", "user_stop");
      return this.finish("failed", e instanceof Error ? e.message : String(e));
    } finally {
      this.humanPause?.resolve(); this.humanPause = undefined;
      this.budgetResume = undefined;
      adapter.close?.();
    }
  }

  /** Park without closing the adapter: pending tool results and the same thread remain in memory. */
  private async checkBudget(phase: "model" | "tool"): Promise<void> {
    for (;;) {
      this.throwIfStopped();
      try { this.budget.check(phase); return; }
      catch (e) {
        if (!(e instanceof BudgetExceededError)) throw e;
        this.budgetReason = e.limit;
        this.controlRevision++; // human controls the surfaces while paused; pending actions become stale
        this.budget.pauseClock();
        try {
          await new Promise<void>(resolve => {
            this.budgetResume = resolve;
            this.setState("budget_paused");
            this.humanPause?.resolve(); this.humanPause = undefined;
          });
        } finally {
          this.budgetResume = undefined;
          this.budget.resumeClock();
        }
        this.throwIfStopped();
        this.budgetReason = null;
        this.reobserveAfterBudget = true;
        this.setState("running");
      }
    }
  }

  private async runTool(call: ToolCall, worker: TerminalWorker, signal: AbortSignal): Promise<ToolResult> {
    const { store } = this.deps;
    const decision = await this.policy.authorize(call, { runId: this.runId, networkMode: this.input.networkMode });
    const rowId = store.beginToolCall(this.runId, call);
    const preview = previewOf(call);
    const tool = (status: "executing" | "done" | "denied" | "error") => this.emit("tool", { name: call.name, status, callId: call.callId, preview });
    tool("executing");

    if (!decision.allow) {
      const error = { code: decision.code, message: decision.reason };
      store.finishToolCall(rowId, "denied", { error }, decision.code);
      store.appendEvent(this.runId, "tool.denied", { name: call.name, ...error });
      tool("denied");
      if (decision.handoff) {
        const observation = await this.handoff(decision.handoff, worker);
        return { callId: call.callId, output: JSON.stringify({ resumed: true, observation, note: decision.reason }) };
      }
      return { callId: call.callId, output: JSON.stringify({ error }) };
    }

    try {
      await this.waitForApprovals(signal);
      if (this.humanPause) throw new ProtocolError("INVALID_INPUT", "Human took control; re-observe after resuming");
      const result = await this.tools.execute(call, signal);
      store.finishToolCall(rowId, "done", safeJson(result.output));
      store.appendEvent(this.runId, "tool.done", { name: call.name, bytes: result.output.length, image: result.imageJpegBase64 !== undefined });
      tool("done");
      return { callId: call.callId, output: result.output, ...(result.imageJpegBase64 ? { imageJpegBase64: result.imageJpegBase64 } : {}) };
    } catch (e) {
      if (e instanceof HandoffRequested) {
        store.finishToolCall(rowId, "done", { handoff: e.reason });
        const observation = await this.handoff(e.reason, worker);
        tool("done");
        return { callId: call.callId, output: JSON.stringify({ resumed: true, observation }) };
      }
      const error = ProtocolError.is(e)
        ? e.toJSON()
        : { code: "INVALID_INPUT" as const, message: e instanceof Error ? e.message : String(e) };
      store.finishToolCall(rowId, "error", { error }, error.code);
      store.appendEvent(this.runId, "tool.error", { name: call.name, ...error });
      tool("error");
      if (signal.aborted) throw e;
      // A lost worker is not something the model can retry its way out of: end the run with a clear reason.
      if (error.code === "WORKER_UNAVAILABLE") throw new Error(`sandbox worker unavailable: ${error.message}`);
      return { callId: call.callId, output: JSON.stringify({ error }) };
    }
  }

  /** While a card is open for this run, hold the tool instead of letting the model poll the terminal. */
  private async waitForApprovals(signal: AbortSignal): Promise<void> {
    const approvals = this.deps.approvals;
    if (!approvals || !approvals.hasPending(this.runId)) return;
    this.budget.pauseClock();
    this.setState("awaiting_approval");
    try {
      while (approvals.hasPending(this.runId) && !signal.aborted) {
        await new Promise<void>((resolve) => {
          const done = () => { signal.removeEventListener("abort", done); approvals.off("resolved", done); resolve(); };
          approvals.once("resolved", done);
          signal.addEventListener("abort", done, { once: true });
        });
      }
    } finally {
      this.budget.resumeClock();
      if (!signal.aborted) this.setState("running");
    }
    this.throwIfStopped();
  }

  private async handoff(reason: string, worker: TerminalWorker) {
    this.controlRevision++;
    this.deps.store.appendEvent(this.runId, "handoff.start", { reason });
    this.budget.pauseClock();
    this.setState("handoff");
    this.emit("handoff", { reason });
    await new Promise<void>((resolve) => {
      this.handoffResume = resolve;
      this.humanPause?.resolve(); this.humanPause = undefined;
    });
    this.handoffResume = undefined;
    this.budget.resumeClock();
    this.throwIfStopped();
    this.deps.store.appendEvent(this.runId, "handoff.end", {});
    this.setState("running");
    return worker.observe({}, this.abort.signal);
  }

  private throwIfStopped(): void {
    if (this.abort.signal.aborted) throw new ProtocolError("CANCELLED", "run stopped");
  }

  private setState(state: RunState, endReason?: string): void {
    this._state = state;
    this.deps.store.setRunState(this.runId, state, endReason);
    this.emit("state", state);
  }

  private finish(state: RunState, endReason: string, finalText?: string): RunOutcome {
    this.setState(state, endReason);
    if (finalText !== undefined) this.deps.store.appendEvent(this.runId, "run.result", { text: finalText });
    return { runId: this.runId, state, endReason, ...(finalText !== undefined ? { finalText } : {}) };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A short, human-readable summary of what a tool call does, for the UI log.
function previewOf(call: ToolCall): string {
  const a = (call.args ?? {}) as Record<string, unknown>;
  const clip = (v: unknown, n = 60) => String(v ?? "").replace(/\s+/g, " ").slice(0, n);
  switch (call.name) {
    case "terminal_input":
      return a.kind === "key" ? `key ${String(a.key)}` : clip(a.text);
    case "terminal_wait":
      return a.until ? `until /${clip(a.until, 40)}/` : `idle ${String(a.idleMs ?? 1500)}ms`;
    case "request_human":
      return clip(a.reason);
    case "browser_act": {
      const act = (a.action ?? {}) as Record<string, unknown>;
      return clip([act.kind, act.ref, act.url, act.text, act.key, act.pageId].filter((v) => v !== undefined).join(" "));
    }
    case "browser_wait":
      return a.text ? `text /${clip(a.text, 40)}/` : a.selector ? `selector ${clip(a.selector, 40)}` : String(a.state ?? "load");
    default:
      return "";
  }
}
