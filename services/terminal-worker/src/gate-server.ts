import fs from "node:fs";
import net from "node:net";

export type GateRequest = { command: string; cwd: string; pid: number };
export type GateDecision = { decision: "allow" | "deny"; reason?: string };

const MAX_LINE = 64 * 1024;

export class GateServer {
  private readonly server = net.createServer((s) => this.accept(s));

  constructor(
    private readonly socketPath: string,
    private readonly check: (req: GateRequest) => Promise<GateDecision>,
  ) {}

  listen(): Promise<void> {
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.socketPath, () => {
        fs.chmodSync(this.socketPath, 0o600);
        resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((r) => this.server.close(() => r()));
  }

  private accept(socket: net.Socket): void {
    let buf = "";
    let answered = false;
    const reply = (d: GateDecision) => {
      if (answered) return;
      answered = true;
      socket.end(JSON.stringify(d) + "\n");
    };
    socket.on("error", () => {});
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.length > MAX_LINE) return reply({ decision: "deny", reason: "request too large" });
      const nl = buf.indexOf("\n");
      if (nl < 0) return;
      let req: GateRequest;
      try {
        const parsed = JSON.parse(buf.slice(0, nl)) as Partial<GateRequest>;
        if (typeof parsed.command !== "string" || typeof parsed.cwd !== "string" || typeof parsed.pid !== "number") throw new Error("bad shape");
        req = { command: parsed.command, cwd: parsed.cwd, pid: parsed.pid };
      } catch {
        return reply({ decision: "deny", reason: "malformed gate request" });
      }
      this.check(req).then(reply, (e) => reply({ decision: "deny", reason: `gate error: ${e instanceof Error ? e.message : String(e)}` }));
    });
  }
}
