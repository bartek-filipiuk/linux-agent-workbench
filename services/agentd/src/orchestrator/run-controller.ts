import { EventEmitter } from "node:events";
import { DEFAULT_BUDGETS, ProtocolError, type Budgets, type NetworkMode, type RunState } from "@law/protocol";
import type { Store } from "../storage/store.js";
import type { ModelAdapter, ModelTurnInput, ToolCall, ToolResult } from "../provider/types.js";
import type { TerminalWorker } from "../worker/types.js";
import { allowAllPolicy, type Policy } from "../policy/types.js";
import { TERMINAL_TOOLS, HandoffRequested, executeTerminalTool } from "../tools/terminal-tools.js";
import { BudgetExceededError, BudgetTracker, costOf, type PriceTable } from "./budgets.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export type RunControllerDeps = {
  store: Store;
  adapter: ModelAdapter;
  worker: TerminalWorker;
  policy?: Policy;
  budgets?: Budgets;
  prices?: PriceTable;
  systemPrompt?: string;
  now?: () => number;
};

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
  private handoffResume: (() => void) | undefined;
  private costKnown: boolean;

  constructor(
    private readonly deps: RunControllerDeps,
    private readonly input: RunInput,
  ) {
    super();
    this.policy = deps.policy ?? allowAllPolicy;
    this.prices = deps.prices ?? {};
    this.costKnown = deps.adapter.model in this.prices;
    this.system = deps.systemPrompt ?? SYSTEM_PROMPT;
    this.budget = new BudgetTracker(deps.budgets ?? DEFAULT_BUDGETS, deps.now);
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

  stop(): void {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    this.deps.worker.cancel();
    this.handoffResume?.();
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

    try {
      for (;;) {
        this.throwIfStopped();
        this.budget.check();

        const turn = await adapter.turn(next, {
          ...(previousResponseId ? { previousResponseId } : {}),
          tools: TERMINAL_TOOLS,
          system: this.system,
          signal,
        });
        previousResponseId = turn.responseId;
        this.budget.addTurn();
        const usd = costOf(adapter.model, turn.usage, this.prices);
        if (usd === undefined) {
          this.costKnown = false;
          store.appendEvent(this.runId, "cost.unknown_model", { model: adapter.model });
        } else this.budget.addCost(usd);
        store.recordUsage(this.runId, { responseId: turn.responseId, ...turn.usage, costUsd: usd ?? 0 });
        store.addRunTotals(this.runId, { turns: 1, costUsd: usd ?? 0 });
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
          this.budget.check();
          results.push(await this.runTool(call, worker, signal));
          this.budget.addToolCall();
          store.addRunTotals(this.runId, { toolCalls: 1 });
        }
        next = { toolResults: results };
      }
    } catch (e) {
      if (signal.aborted) return this.finish("stopped", "user_stop");
      if (e instanceof BudgetExceededError) return this.finish("budget_exceeded", e.limit);
      return this.finish("failed", e instanceof Error ? e.message : String(e));
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
      const output = await executeTerminalTool(call, worker, signal);
      store.finishToolCall(rowId, "done", JSON.parse(output));
      store.appendEvent(this.runId, "tool.done", { name: call.name, bytes: output.length });
      tool("done");
      return { callId: call.callId, output };
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
      return { callId: call.callId, output: JSON.stringify({ error }) };
    }
  }

  private async handoff(reason: string, worker: TerminalWorker) {
    this.deps.store.appendEvent(this.runId, "handoff.start", { reason });
    this.setState("handoff");
    this.emit("handoff", { reason });
    await new Promise<void>((resolve) => {
      this.handoffResume = resolve;
    });
    this.handoffResume = undefined;
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
    return { runId: this.runId, state, endReason, ...(finalText !== undefined ? { finalText } : {}) };
  }
}

// A short, human-readable summary of what a tool call does, for the UI log.
function previewOf(call: ToolCall): string {
  const a = (call.args ?? {}) as Record<string, unknown>;
  const clip = (v: unknown, n = 60) => String(v).replace(/\s+/g, " ").slice(0, n);
  switch (call.name) {
    case "terminal_input":
      return a.kind === "key" ? `key ${String(a.key)}` : clip(a.text);
    case "terminal_wait":
      return a.until ? `until /${clip(a.until, 40)}/` : `idle ${String(a.idleMs ?? 1500)}ms`;
    case "request_human":
      return clip(a.reason);
    default:
      return "";
  }
}
