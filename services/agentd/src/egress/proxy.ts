// HTTP CONNECT / absolute-URI proxy served on Unix sockets that the sandbox containers mount.
// The containers have no network of their own, so this is the only way out: every hostname is
// resolved here, private ranges are refused by the resolved address, and the upstream connection
// goes to that exact address (no second lookup, no rebinding window).
import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import { isPrivateHost, isPrivateIp } from "../policy/private-address.js";

export type EgressDecision = { allow: true } | { allow: false; reason: string };
export type EgressLogEntry = { host: string; port: number; allowed: boolean; reason?: string };
export type Lookup = (host: string) => Promise<string[]>;

export type EgressProxyOptions = {
  decide: (host: string, port: number) => EgressDecision | Promise<EgressDecision>;
  log: (entry: EgressLogEntry) => void;
  lookup?: Lookup;
  /** Test seam: where the checked address really connects (default net.connect). */
  connect?: (address: string, port: number) => net.Socket;
  maxUpstreams?: number;
  upstreamIdleMs?: number;
};

const HEADER_CAP = 16 * 1024;
const REQUEST_LINE = /^([A-Z]+) (\S+) HTTP\/1\.[01]\r?\n/;

const defaultLookup: Lookup = async (host) => (await dns.promises.lookup(host, { all: true })).map((a) => a.address);

function respond(socket: net.Socket, status: number, text: string): void {
  const body = `${text}\n`;
  socket.end(`HTTP/1.1 ${status} ${text}\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
}

/** Parses "host:port" or "[v6]:port"; port defaults to 80/443 by scheme for absolute URIs. */
export function parseTarget(method: string, target: string): { host: string; port: number; path: string } | undefined {
  if (method === "CONNECT") {
    const m = /^(\[[^\]]+\]|[^:]+):(\d{1,5})$/.exec(target);
    if (!m) return undefined;
    return { host: m[1]!.replace(/^\[|\]$/g, ""), port: Number(m[2]), path: "" };
  }
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return undefined;
  }
  if (u.protocol !== "http:") return undefined;
  return { host: u.hostname.replace(/^\[|\]$/g, ""), port: Number(u.port || 80), path: `${u.pathname}${u.search}` };
}

export class EgressProxy {
  private readonly servers: net.Server[] = [];
  private upstreams = 0;
  private readonly lookup: Lookup;

  constructor(private readonly opts: EgressProxyOptions) {
    this.lookup = opts.lookup ?? defaultLookup;
  }

  async listen(socketPath: string): Promise<void> {
    fs.rmSync(socketPath, { force: true });
    const server = net.createServer((c) => this.handle(c));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => {
        server.off("error", reject);
        fs.chmodSync(socketPath, 0o600);
        resolve();
      });
    });
    this.servers.push(server);
  }

  async close(): Promise<void> {
    await Promise.all(this.servers.map((s) => new Promise<void>((r) => s.close(() => r()))));
    this.servers.length = 0;
  }

  private handle(client: net.Socket): void {
    let buf = Buffer.alloc(0);
    client.on("error", () => client.destroy());
    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      const end = buf.indexOf("\r\n\r\n");
      if (end < 0) {
        if (buf.length > HEADER_CAP) respond(client, 431, "Request Header Fields Too Large");
        return;
      }
      client.off("data", onData);
      client.pause();
      void this.route(client, buf.subarray(0, end + 4).toString("latin1"), buf.subarray(end + 4));
    };
    client.on("data", onData);
  }

  private async route(client: net.Socket, head: string, rest: Buffer): Promise<void> {
    const line = REQUEST_LINE.exec(head);
    const target = line ? parseTarget(line[1]!, line[2]!) : undefined;
    if (!line || !target) return respond(client, 400, "Bad Request");
    const { host, port } = target;
    const method = line[1]!;
    const deny = (reason: string) => {
      this.opts.log({ host, port, allowed: false, reason });
      respond(client, 403, `Forbidden: ${reason}`);
    };
    if (isPrivateHost(host)) return deny("private address");
    const decision = await this.opts.decide(host, port);
    if (!decision.allow) return deny(decision.reason);
    let addresses: string[];
    try {
      addresses = await this.lookup(host);
    } catch {
      return deny("name not found");
    }
    if (addresses.length === 0) return deny("name not found");
    if (addresses.some(isPrivateIp)) return deny("private address");
    if (this.upstreams >= (this.opts.maxUpstreams ?? 256)) return deny("too many connections");
    this.opts.log({ host, port, allowed: true });

    this.upstreams++;
    const upstream = (this.opts.connect ?? ((a, p) => net.connect({ host: a, port: p })))(addresses[0]!, port);
    upstream.setTimeout(this.opts.upstreamIdleMs ?? 5 * 60_000, () => upstream.destroy());
    const finish = () => {
      this.upstreams--;
      client.destroy();
    };
    upstream.once("close", finish);
    upstream.on("error", () => {
      if (!client.destroyed && client.writable && !client.bytesWritten) respond(client, 502, "Bad Gateway");
    });
    client.on("close", () => upstream.destroy());
    upstream.on("connect", () => {
      if (method === "CONNECT") {
        client.write("HTTP/1.1 200 Connection established\r\n\r\n");
        if (rest.length) upstream.write(rest);
      } else {
        // Plain HTTP: turn the absolute URI into an origin-form request and close after one exchange.
        const headers = head
          .split(/\r?\n/)
          .slice(1)
          .filter((h) => h && !/^(proxy-connection|connection|proxy-authorization):/i.test(h));
        upstream.write(`${method} ${target.path || "/"} HTTP/1.1\r\n${headers.join("\r\n")}\r\nConnection: close\r\n\r\n`);
        if (rest.length) upstream.write(rest);
      }
      client.pipe(upstream);
      upstream.pipe(client);
      client.resume();
    });
  }
}
