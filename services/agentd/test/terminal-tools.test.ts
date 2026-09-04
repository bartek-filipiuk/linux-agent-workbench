import { afterEach, describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { HandoffRequested, TERMINAL_TOOLS, executeTerminalTool, slimTerminal } from "../src/tools/terminal-tools.js";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpSocketPath } from "./helpers/tmp.js";

let fw: FakeWorker;
let w: SocketTerminalWorker;
const sig = new AbortController().signal;

async function setup() {
  const p = tmpSocketPath();
  fw = await FakeWorker.listen(p);
  w = await SocketTerminalWorker.connect(p);
}
afterEach(async () => {
  w?.close();
  await fw?.close();
});

describe("terminal tools", () => {
  it("exposes four tools with JSON schema parameters", () => {
    expect(TERMINAL_TOOLS.map((t) => t.name)).toEqual(["terminal_observe", "terminal_input", "terminal_wait", "terminal_interrupt", "request_human"]);
    const input = TERMINAL_TOOLS.find((t) => t.name === "terminal_input")!;
    expect(JSON.stringify(input.parameters)).toContain("CTRL_C");
  });

  it("executes observe and input against the worker", async () => {
    await setup();
    const out = JSON.parse(await executeTerminalTool({ callId: "1", name: "terminal_input", args: { kind: "text", text: "pwd" } }, w, sig));
    expect(out).toEqual({ revision: 1 });
    const obs = JSON.parse(await executeTerminalTool({ callId: "2", name: "terminal_observe", args: {} }, w, sig));
    expect(obs.screen).toBe("$ pwd");
  });

  it("submit=true presses ENTER after the text in one call", async () => {
    await setup();
    const out = JSON.parse(await executeTerminalTool({ callId: "1", name: "terminal_input", args: { kind: "text", text: "pwd", submit: true } }, w, sig));
    expect(out).toEqual({ revision: 2 });
    const inputs = fw.received.map((r) => (r as { payload?: { kind?: string; key?: string } }).payload).filter((p) => p?.kind);
    expect(inputs.map((p) => p!.kind)).toEqual(["text", "key"]);
    expect(inputs[1]).toMatchObject({ kind: "key", key: "ENTER" });
  });

  it("slims observations: trailing blanks go, scrollback only on request", () => {
    const obs = { revision: 1, screen: "$ ls   \nfile.txt\n\n\n   \n", scrollbackTail: "older\nlines", cursor: { row: 1, col: 0 } };
    expect(slimTerminal(obs, false)).toEqual({ revision: 1, screen: "$ ls\nfile.txt", cursor: { row: 1, col: 0 } });
    expect(slimTerminal(obs, true).scrollbackTail).toBe("older\nlines");
  });

  it("rejects invalid args before touching the worker", async () => {
    await setup();
    await expect(executeTerminalTool({ callId: "1", name: "terminal_input", args: { kind: "text", text: "a\x00" } }, w, sig))
      .rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
    await expect(executeTerminalTool({ callId: "1", name: "nope", args: {} }, w, sig))
      .rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
    expect(fw.received).toHaveLength(0);
  });

  it("turns request_human into HandoffRequested", async () => {
    await setup();
    await expect(executeTerminalTool({ callId: "1", name: "request_human", args: { reason: "login needed" } }, w, sig))
      .rejects.toBeInstanceOf(HandoffRequested);
  });
});
