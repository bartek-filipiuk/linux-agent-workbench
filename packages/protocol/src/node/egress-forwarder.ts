// Runs inside a sandbox container: a TCP listener on loopback that pipes each connection into the
// egress proxy's Unix socket mounted from the host. With the socket absent (network mode "none")
// every connection is closed at once, so proxy-aware tools fail fast instead of hanging.
import net from "node:net";

export type EgressForwarderOptions = { socketPath: string; port: number; host?: string };

export function startEgressForwarder(opts: EgressForwarderOptions): Promise<{ close(): Promise<void> }> {
  const server = net.createServer((client) => {
    const upstream = net.connect(opts.socketPath);
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
    upstream.on("connect", () => {
      client.pipe(upstream);
      upstream.pipe(client);
    });
    client.on("close", () => upstream.destroy());
    upstream.on("close", () => client.destroy());
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port, opts.host ?? "127.0.0.1", () => {
      server.off("error", reject);
      resolve({ close: () => new Promise<void>((done) => server.close(() => done())) });
    });
  });
}
