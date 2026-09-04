import { setTimeout as sleep } from "node:timers/promises";
import { ProtocolError } from "@law/protocol";
import type { ModelAdapter, ModelTurn, ModelTurnInput, TurnContext } from "./types.js";

export type ScriptedTurn = {
  text?: string;
  toolCalls?: Array<{ name: string; args: unknown }>;
  delayMs?: number;
};

export class FakeModelAdapter implements ModelAdapter {
  readonly inputs: ModelTurnInput[] = [];
  readonly contexts: Omit<TurnContext, "signal">[] = [];
  private cursor = 0;
  private ids = 0;

  constructor(
    private readonly script: ScriptedTurn[],
    readonly model = "fake-model",
  ) {}

  async turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn> {
    this.inputs.push(input);
    const { signal, ...rest } = ctx;
    this.contexts.push(rest);
    const step = this.script[this.cursor++];
    if (step?.delayMs) {
      try {
        await sleep(step.delayMs, undefined, { signal });
      } catch {
        throw new ProtocolError("CANCELLED", "model turn aborted");
      }
    }
    if (signal.aborted) throw new ProtocolError("CANCELLED", "model turn aborted");
    const responseId = `fake-resp-${++this.ids}`;
    if (!step) return { responseId, text: "(script exhausted)", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } };
    return {
      responseId,
      text: step.text ?? "",
      toolCalls: (step.toolCalls ?? []).map((c) => ({ callId: `call-${++this.ids}`, name: c.name, args: c.args })),
      usage: { inputTokens: 100, outputTokens: 20 },
    };
  }
}
