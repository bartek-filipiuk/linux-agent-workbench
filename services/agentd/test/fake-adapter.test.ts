import { describe, expect, it } from "vitest";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { ProtocolError } from "@law/protocol";

const ctx = (signal = new AbortController().signal) => ({ tools: [], system: "s", signal });

describe("FakeModelAdapter", () => {
  it("plays scripted turns in order with unique call ids and records inputs", async () => {
    const a = new FakeModelAdapter([
      { toolCalls: [{ name: "terminal_observe", args: {} }, { name: "terminal_input", args: { kind: "text", text: "ls" } }] },
      { text: "done" },
    ]);
    const t1 = await a.turn({ goal: "g" }, ctx());
    expect(t1.responseId).toBe("fake-resp-1");
    expect(t1.toolCalls.map((c) => [c.callId, c.name])).toEqual([["call-2", "terminal_observe"], ["call-3", "terminal_input"]]);
    const t2 = await a.turn({ toolResults: [{ callId: "call-2", output: "{}" }] }, { ...ctx(), previousResponseId: t1.responseId });
    expect(t2).toMatchObject({ text: "done", toolCalls: [], responseId: "fake-resp-4" });
    expect(a.inputs).toHaveLength(2);
    expect(a.contexts[1]?.previousResponseId).toBe("fake-resp-1");
  });

  it("returns an exhausted marker after the script ends", async () => {
    const a = new FakeModelAdapter([]);
    await expect(a.turn({ goal: "g" }, ctx())).resolves.toMatchObject({ text: "(script exhausted)", toolCalls: [] });
  });

  it("rejects with CANCELLED when aborted during a delayed turn", async () => {
    const a = new FakeModelAdapter([{ text: "slow", delayMs: 5_000 }]);
    const ac = new AbortController();
    const p = a.turn({ goal: "g" }, ctx(ac.signal));
    ac.abort();
    await expect(p).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
  });
});
