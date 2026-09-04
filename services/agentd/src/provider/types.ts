export type ToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
};

export type ToolCall = { callId: string; name: string; args: unknown };
export type ToolResult = { callId: string; output: string };

export type ModelTurnInput = { goal: string } | { toolResults: ToolResult[] };

export type ModelUsage = { inputTokens: number; outputTokens: number };

export type ModelTurn = {
  responseId: string;
  text: string;
  toolCalls: ToolCall[];
  usage: ModelUsage;
};

export type TurnContext = {
  previousResponseId?: string;
  tools: ToolSpec[];
  system: string;
  signal: AbortSignal;
};

export interface ModelAdapter {
  readonly model: string;
  turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn>;
}
