import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { GateServer } from "../src/gate-server.js";

let server: GateServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

function ask(sock: string, req: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = net.createConnection(sock);
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString();
      if (buf.includes("\n")) {
        s.end();
        resolve(buf.trim());
      }
    });
    s.on("error", reject);
    s.on("connect", () => s.write(JSON.stringify(req) + "\n"));
  });
}

describe("GateServer", () => {
  it("answers one JSON line per connection with the handler's decision", async () => {
    const sock = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-gate-")), "g.sock");
    const seen: unknown[] = [];
    server = new GateServer(sock, async (req) => {
      seen.push(req);
      return req.command.startsWith("rm") ? { decision: "deny", reason: "needs approval" } : { decision: "allow" };
    });
    await server.listen();
    expect(JSON.parse(await ask(sock, { command: "ls", cwd: "/workspace", pid: 1 }))).toEqual({ decision: "allow" });
    expect(JSON.parse(await ask(sock, { command: "rm -rf x", cwd: "/workspace", pid: 1 }))).toEqual({ decision: "deny", reason: "needs approval" });
    expect(seen).toHaveLength(2);
  });

  it("denies malformed requests and handler failures", async () => {
    const sock = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-gate-")), "g.sock");
    server = new GateServer(sock, async () => { throw new Error("boom"); });
    await server.listen();
    expect(JSON.parse(await ask(sock, "garbage"))).toMatchObject({ decision: "deny" });
    expect(JSON.parse(await ask(sock, { command: "x", cwd: "/", pid: 2 }))).toMatchObject({ decision: "deny", reason: expect.stringContaining("boom") });
  });
});
