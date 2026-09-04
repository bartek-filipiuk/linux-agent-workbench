import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { EgressProxy, parseTarget, type EgressLogEntry } from "../src/egress/proxy.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-egress-"));
const sock = path.join(dir, "egress.sock");
const log: EgressLogEntry[] = [];
let echoPort = 0;
let httpPort = 0;
let upstreamConnections = 0;
let proxy: EgressProxy;
let echo: net.Server;
let web: http.Server;

// "public.test" resolves to a public address; the connect seam redirects that address to the local
// servers so the tunnel is real while the private-address rule stays intact ("rebinder.test").
const PUBLIC_IP = "93.184.216.34";
const lookup = async (host: string): Promise<string[]> => {
  if (host === "public.test") return [PUBLIC_IP];
  if (host === "rebinder.test") return ["93.184.216.34", "10.0.0.5"];
  throw new Error("ENOTFOUND");
};

beforeAll(async () => {
  echo = net.createServer((c) => {
    upstreamConnections++;
    c.pipe(c);
  });
  await new Promise<void>((r) => echo.listen(0, "127.0.0.1", r));
  echoPort = (echo.address() as net.AddressInfo).port;
  web = http.createServer((req, res) => res.end(`path=${req.url} host=${req.headers.host}`));
  await new Promise<void>((r) => web.listen(0, "127.0.0.1", r));
  httpPort = (web.address() as net.AddressInfo).port;
  proxy = new EgressProxy({
    decide: (host) => (host === "blocked.test" ? { allow: false, reason: "blocked by policy" } : { allow: true }),
    log: (e) => log.push(e),
    lookup,
    connect: (address, port) => {
      expect(address).toBe(PUBLIC_IP);
      return net.connect({ host: "127.0.0.1", port });
    },
  });
  await proxy.listen(sock);
});
afterAll(async () => {
  await proxy.close();
  await new Promise<void>((r) => echo.close(() => r()));
  await new Promise<void>((r) => web.close(() => r()));
  fs.rmSync(dir, { recursive: true, force: true });
});

function request(raw: string, opts: { after?: string; waitFor?: (got: string) => boolean } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = net.connect(sock, () => c.write(raw));
    let got = "";
    let sentAfter = false;
    c.on("data", (d) => {
      got += d.toString();
      if (opts.after && !sentAfter && got.includes("200 Connection established")) {
        sentAfter = true;
        c.write(opts.after);
      }
      if (opts.waitFor?.(got)) c.end();
    });
    c.on("close", () => resolve(got));
    c.on("error", reject);
  });
}

describe("parseTarget", () => {
  it("parses CONNECT authorities and absolute URIs", () => {
    expect(parseTarget("CONNECT", "example.com:443")).toEqual({ host: "example.com", port: 443, path: "" });
    expect(parseTarget("CONNECT", "[::1]:22")).toEqual({ host: "::1", port: 22, path: "" });
    expect(parseTarget("CONNECT", "example.com")).toBeUndefined();
    expect(parseTarget("GET", "http://example.com/a?b=1")).toEqual({ host: "example.com", port: 80, path: "/a?b=1" });
    expect(parseTarget("GET", "/relative")).toBeUndefined();
    expect(parseTarget("GET", "https://example.com/")).toBeUndefined();
  });
});

describe("EgressProxy", { timeout: 15_000 }, () => {
  it("tunnels CONNECT to an allowed host and logs it", async () => {
    const got = await request(`CONNECT public.test:${echoPort} HTTP/1.1\r\nHost: public.test\r\n\r\n`, { after: "ping", waitFor: (g) => g.endsWith("ping") });
    expect(got).toMatch(/^HTTP\/1\.1 200 Connection established\r\n\r\nping$/);
    expect(log.at(-1)).toEqual({ host: "public.test", port: echoPort, allowed: true });
  });

  it("refuses literal private addresses without opening an upstream", async () => {
    const before = upstreamConnections;
    const got = await request(`CONNECT 127.0.0.1:${echoPort} HTTP/1.1\r\n\r\n`);
    expect(got).toMatch(/^HTTP\/1\.1 403 Forbidden: private address/);
    expect(upstreamConnections).toBe(before);
    expect(log.at(-1)).toMatchObject({ host: "127.0.0.1", allowed: false, reason: "private address" });
  });

  it("refuses names that resolve to a private address, unknown names and policy denials", async () => {
    expect(await request(`CONNECT rebinder.test:443 HTTP/1.1\r\n\r\n`)).toMatch(/403 Forbidden: private address/);
    expect(await request(`CONNECT nowhere.test:443 HTTP/1.1\r\n\r\n`)).toMatch(/403 Forbidden: name not found/);
    expect(await request(`CONNECT blocked.test:443 HTTP/1.1\r\n\r\n`)).toMatch(/403 Forbidden: blocked by policy/);
    expect(log.at(-1)).toMatchObject({ host: "blocked.test", allowed: false, reason: "blocked by policy" });
  });

  it("forwards plain HTTP with an absolute URI as an origin-form request", async () => {
    const got = await request(`GET http://public.test:${httpPort}/hello?x=1 HTTP/1.1\r\nHost: public.test:${httpPort}\r\nProxy-Connection: keep-alive\r\n\r\n`);
    expect(got).toMatch(/^HTTP\/1\.1 200 OK/);
    expect(got).toMatch(/path=\/hello\?x=1 host=public\.test:\d+$/);
  });

  it("answers 502 when the upstream never connects", async () => {
    const sock2 = path.join(dir, "egress2.sock");
    const p2 = new EgressProxy({
      decide: () => ({ allow: true }),
      log: () => undefined,
      lookup,
      connect: () => new net.Socket(), // never connects
      connectTimeoutMs: 200,
    });
    await p2.listen(sock2);
    const got = await new Promise<string>((resolve) => {
      const c = net.connect(sock2, () => c.write("CONNECT public.test:443 HTTP/1.1\r\n\r\n"));
      let s = "";
      c.on("data", (d) => (s += d.toString()));
      c.on("close", () => resolve(s));
    });
    expect(got).toMatch(/^HTTP\/1\.1 502 Bad Gateway/);
    await p2.close();
  });

  it("answers 400 to junk and 431 to oversized headers", async () => {
    expect(await request("HELLO\r\n\r\n")).toMatch(/^HTTP\/1\.1 400/);
    expect(await request(`GET http://public.test/ HTTP/1.1\r\nX: ${"a".repeat(20_000)}`)).toMatch(/^HTTP\/1\.1 431/);
  });
});
