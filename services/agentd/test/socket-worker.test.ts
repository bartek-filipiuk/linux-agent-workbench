import { afterEach, describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { SocketTerminalWorker } from "../src/worker/socket-worker.js";
import { FakeWorker } from "./helpers/fake-worker.js";
import { tmpSocketPath } from "./helpers/tmp.js";

let fw: FakeWorker | undefined;
afterEach(async () => {
  await fw?.close();
  fw = undefined;
});

describe("SocketTerminalWorker", () => {
  it("observes, inputs and tracks revisions", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    const w = await SocketTerminalWorker.connect(p);
    expect((await w.observe({})).revision).toBe(0);
    expect(await w.input({ kind: "text", text: "ls" })).toEqual({ revision: 1 });
    expect(await w.input({ kind: "key", key: "ENTER" })).toEqual({ revision: 2 });
    expect((await w.observe({})).screen).toBe("$ ls\n$ ");
    w.close();
  });

  it("surfaces STALE_REVISION as a ProtocolError", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    const w = await SocketTerminalWorker.connect(p);
    await expect(w.input({ kind: "text", text: "x", expectedRevision: 5 })).rejects.toSatisfy((e) => ProtocolError.is(e, "STALE_REVISION"));
    w.close();
  });

  it("aborts a hanging input via signal", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    fw.hangInputs = true;
    const w = await SocketTerminalWorker.connect(p);
    const ac = new AbortController();
    const pending = w.input({ kind: "text", text: "sleep" }, ac.signal);
    ac.abort();
    await expect(pending).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
    w.close();
  });

  it("fans out pty data and reports close", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    const w = await SocketTerminalWorker.connect(p);
    const data = new Promise<string>((r) => w.onPtyData((b) => r(new TextDecoder().decode(b))));
    fw.emitPty("hello");
    expect(await data).toBe("hello");
    const closed = new Promise<void>((r) => w.onClose(r));
    await fw.close();
    await closed;
  });

  it("fails to connect when no worker listens", async () => {
    await expect(SocketTerminalWorker.connect(tmpSocketPath())).rejects.toSatisfy((e) => ProtocolError.is(e, "WORKER_UNAVAILABLE"));
  });

  it("answers requests coming from the worker via onRequest", async () => {
    const p = tmpSocketPath();
    fw = await FakeWorker.listen(p);
    const w = await SocketTerminalWorker.connect(p);
    w.onRequest("gate.check", async (payload) => ({ decision: payload.command === "ls" ? "allow" : "deny" }));
    expect(await fw.askClient("gate.check", { command: "ls" })).toEqual({ decision: "allow" });
    expect(await fw.askClient("gate.check", { command: "rm" })).toEqual({ decision: "deny" });
    await expect(fw.askClient("nope", {})).rejects.toMatchObject({ code: "INVALID_INPUT" });
    w.close();
  });
});
