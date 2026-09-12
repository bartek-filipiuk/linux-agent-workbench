import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CodexAppServerAdapter } from "../src/provider/codex.js";
import { codexBinary } from "../src/provider/codex-process.js";
import type { TurnContext } from "../src/provider/types.js";
import { tmpDir } from "./helpers/tmp.js";

const adapters: CodexAppServerAdapter[] = [];
afterEach(() => { adapters.splice(0).forEach((a) => a.close()); vi.unstubAllEnvs(); });
function setup(mode = "normal", timeoutMs = 2000, selection: { model?: string; effort?: string } = {}) {
  vi.stubEnv("LAW_CODEX_TEST_MODE", mode);
  vi.stubEnv("OPENAI_API_KEY", "sk-must-not-reach-codex");
  vi.stubEnv("CODEX_API_KEY", "sk-must-not-reach-codex-either");
  const home = tmpDir("law-codex-");
  const adapter = new CodexAppServerAdapter({ binary: fileURLToPath(new URL("../../../fixtures/codex/app-server.mjs", import.meta.url)), home, timeoutMs, ...selection });
  adapters.push(adapter);
  const abort = new AbortController();
  const ctx: TurnContext = { system: "Use LAW tools", signal: abort.signal, tools: ["browser_observe", "terminal_observe"].map((name) => ({ name, description: name, parameters: { type: "object", properties: {} } })) };
  return { adapter, home, ctx, abort };
}

describe("Codex App Server adapter", () => {
  it("resumes a durable thread without opening a new one and checkpoints its identity", async () => {
    const { adapter, home, ctx } = setup();
    adapter.restore({ threadId: "thread-1", usage: { inputTokens: 90, outputTokens: 5, cachedInputTokens: 30 } });
    const checkpoint = vi.fn();
    const result = await adapter.turn({ goal: "Update /workspace/research.md" }, { ...ctx, onCheckpoint: checkpoint });
    expect(fs.existsSync(path.join(home, "thread.json"))).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(home, "resume.json"), "utf8"))).toMatchObject({ threadId: "thread-1", sandbox: "read-only", approvalPolicy: "untrusted" });
    expect(result.usage).toMatchObject({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 10 });
    expect(checkpoint).toHaveBeenCalledWith(expect.objectContaining({ threadId: "thread-1" }));
    await adapter.interrupt();
    expect(JSON.parse(fs.readFileSync(path.join(home, "interrupt.json"), "utf8"))).toMatchObject({ threadId: "thread-1", turnId: "turn-1" });
  });
  it("sends an explicit model and reasoning effort to the App Server", async () => {
    const { adapter, home, ctx } = setup("normal", 2000, { model: "gpt-6-astra", effort: "medium" });
    await adapter.turn({ goal: "Observe" }, ctx);
    expect(JSON.parse(fs.readFileSync(path.join(home, "thread.json"), "utf8"))).toMatchObject({ model: "gpt-6-astra" });
    expect(JSON.parse(fs.readFileSync(path.join(home, "turn.json"), "utf8"))).toMatchObject({ effort: "medium" });
  });
  it("finds Codex installed under another nvm Node version after switching to Node 24", () => {
    const nvm = tmpDir("law-nvm-");
    const file = path.join(nvm, "versions/node/v20.19.5/bin/codex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    vi.stubEnv("NVM_DIR", nvm);
    vi.stubEnv("PATH", "/nonexistent-law-bin");
    expect(codexBinary()).toBe(file);
    expect(codexBinary({ binary: "/custom/codex" })).toBe("/custom/codex");
  });
  it("round trips tools, text, screenshots and usage while isolating credentials and host tools", async () => {
    const { adapter, home, ctx } = setup();
    const first = await adapter.turn({ goal: "Observe" }, ctx);
    expect(first).toMatchObject({ text: "Inspecting the screen.", toolCalls: [{ callId: "tool-1", name: "browser_observe" }], usage: { inputTokens: 100, outputTokens: 10, cachedInputTokens: 40 } });
    const launch = JSON.parse(fs.readFileSync(path.join(home, "process.json"), "utf8"));
    expect(launch.apiKeyPresent).toBe(false);
    expect(launch.cwd).toBe(path.join(home, "operator"));
    expect(launch.args).toContain('forced_login_method="chatgpt"');
    expect(launch.args).toContain("features.shell_tool=false");
    expect(launch.args).toContain("features.computer_use=false");
    expect(launch.args).toContain("features.code_mode_host=true");
    expect(launch.args).not.toContain("features.code_mode_host=false");
    const thread = JSON.parse(fs.readFileSync(path.join(home, "thread.json"), "utf8"));
    expect(thread).toMatchObject({ sandbox: "read-only", ephemeral: false, dynamicTools: [{ type: "function", name: "browser_observe" }, { type: "function", name: "terminal_observe" }] });
    expect(thread).not.toHaveProperty("model");
    expect(JSON.parse(fs.readFileSync(path.join(home, "turn.json"), "utf8"))).not.toHaveProperty("effort");
    const last = await adapter.turn({ toolResults: [{ callId: "tool-1", output: '{"ok":true}', imageJpegBase64: "jpeg-data" }] }, { ...ctx, previousResponseId: first.responseId });
    expect(last).toMatchObject({ text: "Done: \u{1f680}.", toolCalls: [], usage: { inputTokens: 60, outputTokens: 15, cachedInputTokens: 20 } });
    expect(last.responseId).not.toBe(first.responseId);
    const result = JSON.parse(fs.readFileSync(path.join(home, "results.jsonl"), "utf8").trim());
    expect(result).toEqual({ id: "tool-1", result: { success: true, contentItems: [{ type: "inputText", text: '{"ok":true}' }, { type: "inputImage", imageUrl: "data:image/jpeg;base64,jpeg-data" }] } });
    adapter.close();
    await expect.poll(() => { try { process.kill(launch.pid, 0); return false; } catch { return true; } }).toBe(true);
  });

  it("queues simultaneous requests and correlates the original server IDs", async () => {
    const { adapter, ctx } = setup("parallel");
    const first = await adapter.turn({ goal: "Observe" }, ctx);
    const second = await adapter.turn({ toolResults: [{ callId: first.toolCalls[0]!.callId, output: "one" }] }, ctx);
    expect(second.toolCalls).toEqual([{ callId: "tool-2", name: "terminal_observe", args: {} }]);
    expect(second.usage.inputTokens).toBe(0);
    const last = await adapter.turn({ toolResults: [{ callId: "tool-2", output: "two" }] }, ctx);
    expect(last.toolCalls).toEqual([]);
    expect(last.usage.inputTokens).toBe(60);
  });

  it.each(["no-auth", "api-auth"])("refuses %s before starting a model thread", async (mode) => {
    const { adapter, home, ctx } = setup(mode);
    await expect(adapter.turn({ goal: "Observe" }, ctx)).rejects.toThrow("pnpm codex:login");
    expect(fs.existsSync(path.join(home, "thread.json"))).toBe(false);
  });

  it.each([["host-request", "unsupported host operation"], ["unknown-tool", "Unexpected Codex tool"], ["rpc-error", "unsupported model"], ["model-failure", "usage limit reached"], ["crash", "exited"], ["malformed", "Invalid JSON"]])("reports %s without API fallback", async (mode, error) => {
    const { adapter, ctx } = setup(mode);
    await expect(adapter.turn({ goal: "Observe" }, ctx)).rejects.toThrow(error);
  });

  it("times out a stalled model", async () => {
    const { adapter, ctx } = setup("hang", 250);
    await expect(adapter.turn({ goal: "Observe" }, ctx)).rejects.toThrow("timed out");
  });

  it("interrupts an active request promptly", async () => {
    const { adapter, home, ctx, abort } = setup("hang");
    const result = adapter.turn({ goal: "Observe" }, ctx);
    const rejected = expect(result).rejects.toThrow();
    await expect.poll(() => fs.existsSync(path.join(home, "thread.json"))).toBe(true);
    abort.abort();
    await rejected;
  });

  it("closes during human handoff, between model requests", async () => {
    const { adapter, home, ctx, abort } = setup();
    await adapter.turn({ goal: "Observe" }, ctx);
    const { pid } = JSON.parse(fs.readFileSync(path.join(home, "process.json"), "utf8"));
    abort.abort();
    await expect.poll(() => { try { process.kill(pid, 0); return false; } catch { return true; } }).toBe(true);
  });
});
