import { describe, expect, it } from "vitest";
import path from "node:path";
import { AgentdReady, Daemon, handleConfigInit } from "../src/ipc.js";
import { Store } from "../src/storage/store.js";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

describe("handleConfigInit", () => {
  it("accepts subscription without an API key and discards API credentials and prices", () => {
    const config = { type: "config.init", provider: "codex", model: "codex-default", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot: "/tmp" };
    const first = handleConfigInit(config, (p) => new Store(p));
    expect(first.reply).toMatchObject({ type: "agentd.ready", model: "Codex subscription · default model" });
    first.runtime?.store.close();
    const second = handleConfigInit({ ...config, apiKey: "sk-ignore", prices: { inputUsdPerMTok: 99, outputUsdPerMTok: 99 } }, (p) => new Store(p));
    expect(second.runtime).toMatchObject({ apiKey: "", prices: {} });
    second.runtime?.store.close();
    expect(handleConfigInit({ ...config, provider: "openai" }, (p) => new Store(p)).reply).toMatchObject({ type: "agentd.error" });
  });
  it("accepts OpenRouter only with a key and keeps its config off renderer replies", () => {
    const config = { type: "config.init", provider: "openrouter", model: "google/gemini-3.8-flash", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot: "/tmp", openrouter: { effort: "low", provider: "google-ai-studio" } };
    expect(handleConfigInit(config, p => new Store(p)).reply.type).toBe("agentd.error");
    const result = handleConfigInit({ ...config, apiKey: "sk-or-test-secret" }, p => new Store(p));
    expect(result.runtime).toMatchObject({ provider: "openrouter", openrouter: config.openrouter });
    expect(JSON.stringify(result.reply)).not.toContain("sk-or-test");
    result.runtime?.store.close();
  });
  it("opens the store, marks interrupted runs and never echoes the key", () => {
    const { reply } = handleConfigInit(
      { type: "config.init", apiKey: "sk-test-secret-value-1234567890", model: "gpt-5.6-sol", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot: "/tmp" },
      (p) => new Store(p),
    );
    const ready = AgentdReady.parse(reply);
    expect(ready).toMatchObject({ schemaVersion: 5, model: "gpt-5.6-sol", interruptedRuns: 0 });
    expect(JSON.stringify(reply)).not.toContain("sk-test");
  });

  it("returns agentd.error on invalid config", () => {
    expect(handleConfigInit({ type: "config.init" }, (p) => new Store(p)).reply).toMatchObject({ type: "agentd.error" });
  });
});

describe("Daemon", () => {
  it("routes config.init, session.start, terminal.write and session.stop", async () => {
    const posted: unknown[] = [];
    let fw: FakeWorker | undefined;
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
      makeAdapter: () => { throw new Error("unused"); },
      post: (m) => posted.push(m),
    });
    await d.handle({ type: "config.init", apiKey: "sk-x", model: "m", dbPath: ":memory:", imageId: "sha256:x", runtimeRoot });
    expect(posted[0]).toMatchObject({ type: "agentd.ready" });
    await d.handle({ type: "session.start", workspacePath: tmpDir("law-ws-"), networkMode: "open" });
    expect(posted.map((p) => (p as { type: string }).type)).toEqual(["agentd.ready", "session.state", "session.state"]);
    expect(posted[2]).toMatchObject({ type: "session.state", state: "ready" });
    await d.handle({ type: "terminal.write", data: new TextEncoder().encode("pwd\r") });
    await expect.poll(() => fw!.screen).toContain("pwd");
    fw!.emitPty("OUT");
    await expect.poll(() => posted.some((p) => (p as { type: string }).type === "terminal.data")).toBe(true);
    fw!.emitPty("X".repeat(256 * 1024));
    await expect.poll(() => fw!.received.some(m => m.type === "terminal.flow" && m.payload.paused === true)).toBe(true);
    for (let i = 0; i < 4; i++) await d.handle({ type: "terminal.ack", bytes: 65536 });
    await expect.poll(() => fw!.received.some(m => m.type === "terminal.flow" && m.payload.paused === false)).toBe(true);
    await d.handle({ type: "session.network", networkMode: "none" });
    expect(posted.at(-1)).toMatchObject({ type: "session.state", state: "ready", networkMode: "none" });
    await d.handle({ type: "session.network", networkMode: "open" });
    expect(posted.at(-1)).toMatchObject({ type: "session.state", state: "ready", networkMode: "open" });
    await d.handle({ type: "session.stop", destroy: false });
    expect(posted.at(-1)).toMatchObject({ type: "session.state", state: "disconnected" });
    await d.handle({ type: "bogus" });
    expect(posted.at(-1)).toMatchObject({ type: "agentd.error" });
    await fw?.close();
  });
});
