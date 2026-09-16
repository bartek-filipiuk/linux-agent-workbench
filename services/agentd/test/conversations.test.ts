import { afterEach, expect, it } from "vitest";
import path from "node:path";
import { Daemon, type AgentdToMain } from "../src/ipc.js";
import { Store } from "../src/storage/store.js";
import { TerminalSessionManager } from "../src/session/terminal-session-manager.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeModelAdapter, type ScriptedTurn } from "../src/provider/fake.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpDir } from "./helpers/tmp.js";

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function setup(scripts: ScriptedTurn[][], database = ":memory:", workspace = tmpDir("law-conversation-ws-")) {
  const store = new Store(database);
  let fw: FakeWorker | undefined;
  const posted: AgentdToMain[] = [];
  const adapters: FakeModelAdapter[] = [];
  const runtime = {
    ensureRunning: async (spec: { runtimeDir: string }) => { fw = await FakeWorker.listen(path.join(spec.runtimeDir, "worker.sock")); return "started" as const; },
    destroy: async () => {}, state: async () => "running" as const, logs: async () => "", imageExists: async () => true,
  };
  const d = new Daemon({ openStore: () => store,
    makeManager: (imageId, runtimeRoot) => new TerminalSessionManager({ imageId, runtimeRoot, runtime, connect: p => SocketTerminalWorker.connect(p) }),
    makeAdapter: () => { const a = new FakeModelAdapter(scripts.shift() ?? []); adapters.push(a); return a; },
    post: m => posted.push(m),
  });
  await d.handle({ type: "config.init", apiKey: "fixture", model: "fake-model", dbPath: database, imageId: "fixture", runtimeRoot: tmpDir("law-conversation-rt-") });
  await d.handle({ type: "session.start", workspacePath: workspace, networkMode: "open" });
  cleanup.push(async () => { await d.handle({ type: "session.stop", destroy: false }); await fw?.close(); store.close(); });
  const query = async (kind: string, runId?: string, message?: string) => {
    const requestId = String(Math.random());
    await d.handle({ type: "ui.query", kind, requestId, ...(runId ? { runId } : {}), ...(message ? { message } : {}) });
    return posted.findLast(m => m.type === "ui.reply" && m.requestId === requestId) as { result?: any; error?: string };
  };
  const completed = async () => { await expect.poll(() => posted.some(m => m.type === "run.state" && m.state === "completed")).toBe(true); };
  return { d, store, posted, adapters, query, completed, workspace };
}

it("continues the same conversation with file context and native API chain, and hydrates it after reopening the database", async () => {
  const db = path.join(tmpDir("law-conversation-db-"), "state.sqlite");
  const h = await setup([[{ text: "Saved /workspace/research.md with source links." }], [{ text: "Shortened /workspace/research.md." }]], db);
  await h.d.handle({ type: "run.start", goal: "Research this page", limits: { maxTurns: 20, maxDurationMinutes: 30 } });
  await h.completed();
  const first = (await h.query("conversation")).result;
  expect(first.messages[1].text).toContain("/workspace/research.md");
  const reply = await h.query("followup", first.runId, "Make the report shorter");
  expect(reply.error).toBeUndefined();
  await expect.poll(() => h.store.getRun(reply.result.runId)?.state).toBe("completed");
  expect(h.adapters[1]!.contexts[0]?.previousResponseId).toBe("fake-resp-1");
  expect(h.adapters[1]!.inputs[0]).toMatchObject({ message: expect.stringContaining("/workspace/research.md") });
  expect(h.store.getRun(reply.result.runId)).toMatchObject({ parent_run_id: first.runId, conversation_id: first.conversationId });
  expect((await h.query("followup", first.runId, "Duplicate stale send")).error).toMatch(/changed/);
  const restored = await setup([], db, h.workspace);
  const conversation = (await restored.query("conversation")).result;
  expect(conversation.messages.map((m: { text: string }) => m.text)).toEqual([
    "Research this page", "Saved /workspace/research.md with source links.", "Make the report shorter", "Shortened /workspace/research.md.",
  ]);
});

it("interrupts a pending model, rejects duplicate follow-ups and never executes its old tool", async () => {
  const h = await setup([[{ delayMs: 5000, toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "STALE" } }] }], [{ text: "Following the new instruction" }]]);
  await h.d.handle({ type: "run.start", goal: "Old instruction" });
  const id = h.store.listRecentRuns(h.workspace, 1)[0]!.id;
  const replies = await Promise.all([h.query("followup", id, "New instruction"), h.query("followup", id, "Duplicate")]);
  expect(replies.filter(r => r.error)).toHaveLength(1);
  await h.completed();
  expect(h.store.listToolCalls(id)).toHaveLength(0);
  expect(h.store.getRun(id)?.end_reason).toBe("followup");
  expect(h.adapters).toHaveLength(2);
});

it("pauses promptly, keeps context, and rejects a run from another workspace", async () => {
  const h = await setup([[{ delayMs: 5000, text: "old" }], [{ text: "continued" }]]);
  await h.d.handle({ type: "run.start", goal: "Work" });
  const id = h.store.listRecentRuns(h.workspace, 1)[0]!.id;
  expect((await h.query("pause", id)).result).toEqual({ paused: true });
  expect(h.store.getRun(id)?.end_reason).toBe("user_pause");
  expect(h.adapters).toHaveLength(1);
  expect((await h.query("followup", "another-workspace-run", "Continue")).error).toMatch(/changed/);
  expect(h.adapters).toHaveLength(1);
});
