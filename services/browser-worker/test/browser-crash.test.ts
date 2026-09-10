import { expect, it } from "vitest";
import fs from "node:fs";
import http from "node:http";
import type { BrowserContext } from "playwright";
import type { BrowserInfo } from "@law/protocol";
import { BrowserSession } from "../src/browser-session.js";

it("reports a real renderer crash, rejects tools and recovers only on explicit request", async () => {
  let reads = 0, submissions = 0;
  const server = http.createServer((req, res) => {
    if (req.method === "POST") submissions++; else if (req.url === "/") reads++;
    res.setHeader("Content-Type", "text/html");
    res.end('<title>Recovery fixture</title><button>Fixture action</button>');
  });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const profileDir = fs.mkdtempSync("/tmp/law-crash-test-");
  const session = new BrowserSession({ profileDir });
  const states: BrowserInfo[] = []; session.onState(info => states.push(info));
  try {
    await session.start();
    await session.navigate(`http://127.0.0.1:${(server.address() as { port: number }).port}/`);
    const before = await session.observe();
    const context = (session as unknown as { context: BrowserContext }).context;
    await context.addCookies([{ name: "fixture", value: "retained", url: before.url }]);
    const page = context.pages()[0]!;
    const cdp = await context.newCDPSession(page);
    const crash = page.waitForEvent("crash", { timeout: 15000 });
    void cdp.send("Page.crash").catch(() => {});
    await crash;
    await expect.poll(() => states.some(s => s.crashed), { timeout: 5000 }).toBe(true);
    expect((await session.info()).frameError).toMatch(/Page crashed/);
    await expect(session.observe()).rejects.toThrow(/crashed/);
    await expect(session.wait({ timeoutMs: 100 })).rejects.toThrow(/crashed/);
    await expect(session.act({ kind: "navigate", url: before.url })).rejects.toThrow(/crashed/);
    await expect(session.control({ kind: "refresh" })).rejects.toThrow(/crashed/);
    const diagnostics = (await session.info()).diagnostics?.length;
    for (let i = 0; i < 20; i++) await session.input({ kind: "mousedown", x: 10, y: 10 });
    expect((await session.info()).diagnostics?.length).toBe(diagnostics);
    expect(reads).toBe(1); expect(submissions).toBe(0);
    const recovered = await session.control({ kind: "recover" });
    expect(recovered.crashed).toBe(false);
    expect(recovered.activePageId).not.toBe(before.activePageId);
    expect(recovered.title).toBe("Recovery fixture");
    expect(recovered.pages).toHaveLength(1);
    expect(reads).toBe(2); expect(submissions).toBe(0);
    expect((await context.cookies()).some(c => c.name === "fixture" && c.value === "retained")).toBe(true);
    await expect(session.act({ kind: "click", ref: before.elements[0]!.ref, revision: before.revision })).rejects.toThrow(/stale/);
    expect((await session.observe()).elements.length).toBeGreaterThan(0);
  } finally {
    await session.close();
    await new Promise<void>(r => server.close(() => r()));
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}, 30000);
