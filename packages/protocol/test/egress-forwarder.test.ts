import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { startEgressForwarder } from "../src/node/egress-forwarder.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-fw-"));
const socketPath = path.join(dir, "egress.sock");
let echo: net.Server;
let forwarder: { close(): Promise<void> };
let port: number;

const freePort = () =>
  new Promise<number>((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });

beforeAll(async () => {
  echo = net.createServer((c) => c.pipe(c));
  await new Promise<void>((r) => echo.listen(socketPath, r));
  port = await freePort();
  forwarder = await startEgressForwarder({ socketPath, port });
});
afterAll(async () => {
  await forwarder.close();
  await new Promise<void>((r) => echo.close(() => r()));
  fs.rmSync(dir, { recursive: true, force: true });
});

const roundTrip = (p: string) =>
  new Promise<string>((resolve, reject) => {
    const c = net.connect(port, "127.0.0.1", () => c.write(p));
    let got = "";
    c.on("data", (d) => {
      got += d.toString();
      if (got.length >= p.length) c.end();
    });
    c.on("close", () => resolve(got));
    c.on("error", reject);
  });

describe("egress forwarder", () => {
  it("pipes TCP bytes through the Unix socket and back", async () => {
    expect(await roundTrip("hello proxy")).toBe("hello proxy");
  });

  it("closes the client at once when the socket is missing", async () => {
    const p2 = await freePort();
    const f2 = await startEgressForwarder({ socketPath: path.join(dir, "missing.sock"), port: p2 });
    const closed = await new Promise<boolean>((resolve) => {
      const c = net.connect(p2, "127.0.0.1");
      c.on("close", () => resolve(true));
      c.on("error", () => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });
    expect(closed).toBe(true);
    await f2.close();
  });
});
