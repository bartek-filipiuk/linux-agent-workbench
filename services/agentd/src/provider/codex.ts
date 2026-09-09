import { z } from "zod";
import { CodexProcess, codexHome, type CodexOptions } from "./codex-process.js";
import path from "node:path";
import type { ModelAdapter, ModelTurn, ModelTurnInput, ModelUsage, TurnContext } from "./types.js";

const ToolRequest = z.object({ threadId: z.string(), turnId: z.string(), callId: z.string(), tool: z.string(), arguments: z.unknown() });
const Usage = z.object({ inputTokens: z.number().nonnegative(), outputTokens: z.number().nonnegative(), cachedInputTokens: z.number().nonnegative().default(0) });
const zero = (): ModelUsage => ({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });

export type CodexAdapterOptions = CodexOptions & { model?: string; effort?: string; timeoutMs?: number };

/** A LAW turn ends when Codex asks LAW to execute a tool, or finishes its answer. */
export class CodexAppServerAdapter implements ModelAdapter {
  readonly model: string;
  readonly managesContext = true;
  private rpc: CodexProcess | undefined;
  private threadId: string | undefined;
  private turnId: string | undefined;
  private pending = new Map<string, number | string>();
  private total = zero();
  private reported = zero();
  private sequence = 0;
  private removeAbort: (() => void) | undefined;

  constructor(private readonly options: CodexAdapterOptions = {}) { this.model = options.model ?? "codex-default"; }

  async turn(input: ModelTurnInput, ctx: TurnContext): Promise<ModelTurn> {
    const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(this.options.timeoutMs ?? 180_000)]);
    try {
      signal.throwIfAborted();
      if (!this.rpc) {
        this.rpc = new CodexProcess(this.options);
        const stop = () => this.close();
        ctx.signal.addEventListener("abort", stop, { once: true });
        this.removeAbort = () => ctx.signal.removeEventListener("abort", stop);
        await this.rpc.request("initialize", { clientInfo: { name: "linux_agent_workbench", version: "0.0.1" }, capabilities: { experimentalApi: true } }, signal);
        this.rpc.send({ method: "initialized", params: {} });
        const auth = await this.rpc.request("account/read", { refreshToken: false }, signal);
        if (auth?.account?.type !== "chatgpt") throw new Error("Codex requires ChatGPT login. Run pnpm codex:login on the host, then retry. API fallback is disabled.");
      }
      const rpc = this.rpc;
      if ("goal" in input) {
        if (this.threadId) throw new Error("Codex manages its own context; start a new adapter for a new goal");
        const started = await rpc.request("thread/start", {
          ...(this.model !== "codex-default" ? { model: this.model } : {}), modelProvider: "openai",
          cwd: path.join(codexHome(this.options), "operator"), approvalPolicy: "untrusted", sandbox: "read-only", ephemeral: true,
          baseInstructions: `${ctx.system}\nUse only the provided LAW tools for terminal, files, browser and human handoff. The host is not the workspace. Never use built-in tools to perform work.`,
          dynamicTools: ctx.tools.map((tool) => ({ type: "function", name: tool.name, description: tool.description, inputSchema: tool.parameters })),
        }, signal);
        this.threadId = z.string().parse(started?.thread?.id);
        const startedTurn = await rpc.request("turn/start", { threadId: this.threadId, ...(this.options.effort ? { effort: this.options.effort } : {}), input: [{ type: "text", text: input.goal, text_elements: [] }] }, signal);
        this.turnId = z.string().parse(startedTurn?.turn?.id);
      } else {
        if (!this.threadId) throw new Error("Codex tool results have no active thread");
        if (input.message) await rpc.request("turn/steer", { threadId: this.threadId, expectedTurnId: this.turnId, input: [{ type: "text", text: input.message, text_elements: [] }] }, signal);
        for (const result of input.toolResults) {
          const id = this.pending.get(result.callId);
          if (id === undefined) throw new Error(`Unknown Codex tool call: ${result.callId}`);
          rpc.send({ id, result: { success: true, contentItems: [
            { type: "inputText", text: result.output },
            ...(result.imageJpegBase64 ? [{ type: "inputImage", imageUrl: `data:image/jpeg;base64,${result.imageJpegBase64}` }] : []),
          ] } });
          this.pending.delete(result.callId);
        }
      }
      const texts: string[] = [];
      for (;;) {
        const msg = await rpc.next(signal);
        if (msg.id !== undefined) {
          if (msg.method !== "item/tool/call") {
            rpc.send({ id: msg.id, error: { message: "Use LAW tools and request_human; host operations are unavailable", code: -32601 } });
            throw new Error(`Codex requested unsupported host operation: ${msg.method}`);
          }
          const call = ToolRequest.parse(msg.params);
          if (call.threadId !== this.threadId || !ctx.tools.some((tool) => tool.name === call.tool)) throw new Error(`Unexpected Codex tool: ${call.tool}`);
          this.pending.set(call.callId, msg.id);
          this.turnId = call.turnId;
          return this.result(texts, [{ callId: call.callId, name: call.tool, args: call.arguments }]);
        }
        const params = msg.params;
        if (params?.threadId !== this.threadId) continue;
        if (msg.method === "thread/tokenUsage/updated") this.total = Usage.parse(params.tokenUsage.total);
        if (msg.method === "item/completed" && params.item?.type === "agentMessage") texts.push(z.string().parse(params.item.text));
        if (msg.method === "turn/completed") {
          if (params.turn?.status !== "completed") throw new Error(`Codex turn ${params.turn?.status}: ${params.turn?.error?.message ?? "interrupted or failed"}`);
          return this.result(texts, []);
        }
      }
    } catch (error) {
      this.close();
      if (!ctx.signal.aborted && signal.aborted) throw new Error("Codex timed out waiting for a model response. Retry the run; no API fallback was used.");
      throw error;
    }
  }

  private result(texts: string[], toolCalls: ModelTurn["toolCalls"]): ModelTurn {
    const usage = {
      inputTokens: Math.max(0, this.total.inputTokens - this.reported.inputTokens),
      outputTokens: Math.max(0, this.total.outputTokens - this.reported.outputTokens),
      cachedInputTokens: Math.max(0, (this.total.cachedInputTokens ?? 0) - (this.reported.cachedInputTokens ?? 0)),
    };
    this.reported = { ...this.total };
    return { responseId: `${this.threadId}:${++this.sequence}`, text: texts.join("\n"), toolCalls, usage };
  }

  close(): void {
    this.removeAbort?.();
    this.removeAbort = undefined;
    this.rpc?.close();
    this.rpc = undefined;
    this.pending.clear();
  }
}
