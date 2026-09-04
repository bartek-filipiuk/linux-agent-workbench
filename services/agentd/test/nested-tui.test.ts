// End to end on the host: real tmux + worker socket, fake model, real policies. Drives the mock nested-agent TUI.
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { TerminalSession, WorkerServer } from "@law/terminal-worker";
import { Store } from "../src/storage/store.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { RunController } from "../src/orchestrator/run-controller.js";
import { Lease, LeasePolicy } from "../src/policy/lease.js";
import { NestedPromptPolicy, composePolicies } from "../src/policy/nested-prompts.js";
import { tmpDir } from "./helpers/tmp.js";

let session: TerminalSession | undefined;
let server: WorkerServer | undefined;
let tmuxSocket = "";
afterEach(async () => {
  await server?.close();
  session?.dispose();
  try { execFileSync("tmux", ["-S", tmuxSocket, "kill-server"], { stdio: "ignore" }); } catch {}
});

describe("nested agent TUI end to end", () => {
  it("fake model answers the menu with arrows, hands the permission prompt to the human, finishes", { timeout: 60_000 }, async () => {
    const dir = tmpDir("law-e2e-");
    tmuxSocket = path.join(dir, "t.sock");
    session = new TerminalSession({ tmuxSocket, cwd: dir, cols: 100, rows: 30, env: { PS1: "$ ", TERM: "xterm-256color", LANG: "C.UTF-8", PATH: process.env.PATH ?? "" } });
    await session.start();
    server = new WorkerServer(path.join(dir, "w.sock"), session);
    await server.listen();
    const worker = await SocketTerminalWorker.connect(path.join(dir, "w.sock"), { requestTimeoutMs: 70_000 });
    const fixture = path.resolve(__dirname, "../../../fixtures/terminal/mock-agent.mjs");

    const adapter = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_wait", args: { idleMs: 300 } }] },
      { toolCalls: [{ name: "terminal_input", args: { kind: "text", text: `node ${fixture}` } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }, { name: "terminal_wait", args: { idleMs: 500, timeoutMs: 10000 } }] },
      { toolCalls: [{ name: "terminal_input", args: { kind: "text", text: "create hello.txt" } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }, { name: "terminal_wait", args: { until: "Which approach", timeoutMs: 10000 } }] },
      { toolCalls: [{ name: "terminal_input", args: { kind: "key", key: "DOWN" } }, { name: "terminal_input", args: { kind: "key", key: "ENTER" } }, { name: "terminal_wait", args: { idleMs: 500, timeoutMs: 10000 } }] },
      // The permission prompt is now on screen: this ENTER must be blocked and turned into a handoff.
      { toolCalls: [{ name: "terminal_input", args: { kind: "key", key: "ENTER" } }] },
      { toolCalls: [{ name: "terminal_wait", args: { until: "Done: created hello.txt", timeoutMs: 10000 } }] },
      { text: "hello.txt created via the careful path." },
    ]);
    const store = new Store(":memory:");
    const lease = new Lease();
    lease.take("agent");
    const rc = new RunController(
      { store, adapter, worker, policy: composePolicies(new LeasePolicy(lease), new NestedPromptPolicy(() => worker.observe({}))) },
      { workspaceId: store.createWorkspace(dir), goal: "use the mock agent to create hello.txt", networkMode: "none" },
    );
    const handoffs: string[] = [];
    rc.on("handoff", (h: { reason: string }) => {
      handoffs.push(h.reason);
      // The human answers the permission prompt in the terminal, then gives control back.
      setTimeout(() => {
        worker.writeRaw(new TextEncoder().encode("1\r"));
        setTimeout(() => {
          lease.take("agent");
          rc.resumeFromHandoff();
        }, 400);
      }, 200);
    });
    const out = await rc.start();
    expect(out).toMatchObject({ state: "completed", finalText: "hello.txt created via the careful path." });
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0]).toMatch(/permission prompt/);
    expect(fs.readFileSync(path.join(dir, "hello.txt"), "utf8")).toBe("hello\n");
    const hints = adapter.inputs
      .flatMap((i) => ("toolResults" in i ? i.toolResults : []))
      .map((r) => JSON.parse(r.output) as { hint?: { state: string }; observation?: { hint?: { state: string } } })
      .map((o) => o.hint?.state ?? o.observation?.hint?.state)
      .filter(Boolean);
    expect(hints).toContain("nested_agent_idle");
    expect(hints).toContain("question_menu");
    expect(store.listToolCalls(out.runId).filter((t) => t.status === "denied")).toHaveLength(1);
    worker.close();
  });
});
