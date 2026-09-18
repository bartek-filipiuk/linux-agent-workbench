export type ToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
};

export type ToolCall = { callId: string; name: string; args: unknown };
export type ToolResult = { callId: string; output: string; imageJpegBase64?: string };

/**
 * goal: first turn of a chain; toolResults: continue the chain; message: a user message appended after the
 * pending tool results (context compaction asks for a state summary this way, so no function call is left unanswered).
 */
export type ModelTurnInput = { goal: string } | { toolResults: ToolResult[]; message?: string };

/** cachedInputTokens: the part of inputTokens served from the provider's prompt cache (billed at a fraction). */
export type ModelUsage = { inputTokens: number; outputTokens: number; cachedInputTokens?: number; costUsd?: number };

export type ModelTurn = {
  responseId: string;
  text: string;
  toolCalls: ToolCall[];
  usage: ModelUsage;
  timing?: { attempts: number; headersMs: number; responseMs: number; upstream?: string };
};

export type TurnContext = {
  onCheckpoint?: (checkpoint: { threadId: string; usage?: ModelUsage }) => void;
  previousResponseId?: string;
  tools: ToolSpec[];
  system: string;
  signal: AbortSignal;
};

export interface ModelAdapter {
  exportContext?(): unknown;
  restoreContext?(context: unknown): void;
  restore?(checkpoint: { threadId: string; usage?: ModelUsage }): void;
  interrupt?(): Promise<void>;
  readonly model: string;
  readonly managesContext?: boolean;
  close?(): void;
  turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn>;
}

/** What a run can call: tool specs for the model plus the executor that runs them. */
export type ToolOutput = { output: string; imageJpegBase64?: string };
export interface ToolExecutor {
  readonly specs: ToolSpec[];
  execute(call: ToolCall, signal: AbortSignal): Promise<ToolOutput>;
}

export function composeExecutors(...executors: ToolExecutor[]): ToolExecutor {
  return {
    specs: executors.flatMap((e) => e.specs),
    async execute(call, signal) {
      const owner = executors.find((e) => e.specs.some((s) => s.name === call.name));
      if (!owner) throw new Error(`unknown tool ${call.name}`);
      return owner.execute(call, signal);
    },
  };
}
