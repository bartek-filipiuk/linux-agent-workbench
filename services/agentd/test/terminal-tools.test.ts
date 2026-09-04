import { afterEach, describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { HandoffRequested, TERMINAL_TOOLS, executeTerminalTool } from "../src/tools/terminal-tools.js";
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
    expect(TERMINAL_TOOLS.map((t) => t.name)).toEqual(["terminal_observe", "terminal_input", "terminal_interrupt", "request_human"]);
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
