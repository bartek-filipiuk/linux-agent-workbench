import { afterEach, describe, expect, it } from "vitest";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { FramedConnection } from "../src/node/connection.js";
import { ProtocolError } from "../src/errors.js";
import type { Envelope } from "../src/messages.js";

const sockets: string[] = [];
const servers: net.Server[] = [];
function sockPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-conn-"));
  const p = path.join(dir, "s.sock");
  sockets.push(p);
  return p;
}
async function pair(onServerMessage: (conn: FramedConnection, env: Envelope) => void) {
  const p = sockPath();
  const server = net.createServer((s) => {
    const c = new FramedConnection(s);
    c.on("message", (env: Envelope) => onServerMessage(c, env));
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(p, r));
  const socket = net.createConnection(p);
  await new Promise<void>((r) => socket.once("connect", r));
  return { client: new FramedConnection(socket), server };
}
afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise((r) => s.close(r));
  for (const p of sockets.splice(0)) fs.rmSync(path.dirname(p), { recursive: true, force: true });
});

describe("FramedConnection", () => {
  it("resolves a request with the reply payload", async () => {
    const { client } = await pair((c, env) => c.reply(env.id!, { ok: true, payload: { echoed: env.payload } }));
    await expect(client.request("echo", { a: 1 })).resolves.toEqual({ echoed: { a: 1 } });
    client.close();
  });

  it("rejects with the remote error code", async () => {
    const { client } = await pair((c, env) => c.reply(env.id!, { ok: false, error: { code: "POLICY_DENIED", message: "no" } }));
    await expect(client.request("x")).rejects.toMatchObject({ code: "POLICY_DENIED", message: "no" });
    client.close();
  });

  it("times out", async () => {
    const { client } = await pair(() => {});
    await expect(client.request("hang", {}, { timeoutMs: 50 })).rejects.toSatisfy((e) => ProtocolError.is(e, "TIMEOUT"));
    client.close();
  });

  it("rejects on abort", async () => {
    const { client } = await pair(() => {});
    const ac = new AbortController();
    const p = client.request("hang", {}, { signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
    client.close();
  });

  it("rejects pending requests when the socket closes", async () => {
    const { client } = await pair((c) => c.close());
    await expect(client.request("x")).rejects.toSatisfy((e) => ProtocolError.is(e, "CANCELLED"));
  });

  it("delivers raw pty frames and notifications", async () => {
    const { client } = await pair((c, env) => {
      if (env.type === "go") {
        c.sendRaw(1, new TextEncoder().encode("bytes"));
        c.notify("terminal.revision", { revision: 7 });
      }
    });
    const got = new Promise<[string, Envelope]>((r) => {
      let pty = "";
      client.on("pty", (b: Uint8Array) => (pty = new TextDecoder().decode(b)));
      client.on("message", (env: Envelope) => r([pty, env]));
    });
    client.notify("go");
    const [pty, env] = await got;
    expect(pty).toBe("bytes");
    expect(env).toMatchObject({ type: "terminal.revision", payload: { revision: 7 } });
    client.close();
  });
});
