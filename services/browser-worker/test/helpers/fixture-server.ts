import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../fixtures/websites/", import.meta.url));
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".txt": "text/plain", ".js": "text/javascript", ".css": "text/css" };

export function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const file = path.join(root, path.normalize(new URL(req.url ?? "/", "http://x").pathname).replace(/^\/+/, "") || "index.html");
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}
