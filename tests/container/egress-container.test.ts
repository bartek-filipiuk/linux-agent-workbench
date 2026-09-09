import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { BrowserSessionManager, PodmanRuntime, SessionEgress, TerminalSessionManager, containerName, podmanLauncher, sessionIdFor } from "@law/agentd";
import { isolatedRuntime } from "./isolated-runtime";

const enabled = process.env.LAW_CONTAINER_TESTS === "1";
const readId = (name: string) => {
  const f = path.resolve(__dirname, `../../images/${name}/image.json`);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as { id: string }).id : "";
};
const terminalImage = readId("terminal");
const browserImage = readId("browser");

// Async on purpose: the proxy under test runs in this very process, so a blocking exec would starve it.
const curl = (container: string, ...args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile("podman", ["exec", container, "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "20", ...args], (err, stdout) =>
      err ? reject(new Error(`curl ${args.join(" ")} failed: exit ${err.code ?? "?"}`)) : resolve(stdout.toString().trim()),
    );
  });

describe.skipIf(!enabled || !terminalImage || !browserImage)("egress gateway in containers", { timeout: 180_000 }, () => {
  const runtimeRoot = fs.mkdtempSync(path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), "law-eg-"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "law-egws-"));
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "law-egdl-"));
  const isolation = isolatedRuntime();
  const runtime = isolation.runtime;
  const sessionId = sessionIdFor(workspace);
  const decisions: string[] = [];
  const egress = new SessionEgress({ runtimeRoot, log: (_s, e) => decisions.push(`${e.host}:${e.port}:${e.allowed ? "allow" : e.reason}`) });
  let terminal: TerminalSessionManager | undefined;
  let browser: BrowserSessionManager | undefined;

  afterAll(async () => {
    await browser?.destroy();
    await terminal?.destroy();
    await isolation.cleanup();
    await egress.close();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }, 90_000);

  it("terminal: the proxy is the only way out, private addresses get 403", async () => {
    await egress.ensure(sessionId, "open");
    terminal = new TerminalSessionManager({ runtime, runtimeRoot, imageId: terminalImage });
    const status = await terminal.start(workspace, "open");
    expect(status.state, status.message).toBe("ready");
    terminal.worker!.onRequest("gate.check", async () => ({ decision: "allow" }));
    const name = containerName(sessionId);
    expect(execFileSync("podman", ["exec", name, "env"]).toString()).toContain("HTTPS_PROXY=http://127.0.0.1:3128");
    expect(await curl(name, "https://example.com/")).toBe("200");
    expect(await curl(name, "http://10.0.2.2/")).toBe("403");
    expect(await curl(name, "http://app.internal:8080/")).toBe("403"); // private name, refused before any lookup
    await expect(curl(name, "--noproxy", "*", "https://example.com/")).rejects.toThrow(); // no route without the proxy
    expect(decisions).toContain("example.com:443:allow");
    expect(decisions).toContain("10.0.2.2:80:private address");
  });

  it("browser: pages load through the proxy and private addresses show the proxy's refusal", async () => {
    browser = new BrowserSessionManager({
      socketDir: path.join(runtimeRoot, sessionId, "browser"),
      launcher: podmanLauncher({ runtime, sessionId, imageId: browserImage, networkMode: "open", downloadsDir: downloads }),
      connectTimeoutMs: 90_000,
    });
    const status = await browser.start();
    expect(status.state, status.message).toBe("ready");
    const info = await browser.navigate("https://example.com");
    expect(info.title).toMatch(/Example Domain/);
    await browser.navigate("http://10.0.2.2/");
    const seen = await browser.wait({ text: "private address", timeoutMs: 10_000 });
    expect(seen.matched).toBe(true);
  });
});
