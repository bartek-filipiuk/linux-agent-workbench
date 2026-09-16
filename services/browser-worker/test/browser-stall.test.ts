import { expect, it, vi } from "vitest";
import fs from "node:fs";
import http from "node:http";
import type { Page } from "playwright";
import type { BrowserInputEvent } from "@law/protocol";
import { BrowserSession } from "../src/browser-session.js";

type Internals = { active: { page: Page }; unresponsive: boolean; frameError: string | null; applyInput(e: BrowserInputEvent): Promise<void> };

async function fixture(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_req, res) => { res.setHeader("Content-Type", "text/html"); res.end("<title>Stall fixture</title><button>Go</button>"); });
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}/`, close: () => new Promise(r => server.close(() => r())) };
}

it("delivers human input late on a busy page and never quarantines the browser", async () => {
  const site = await fixture();
  const profile = fs.mkdtempSync("/tmp/law-browser-stall-");
  const s = new BrowserSession({ profileDir: profile, inputTimeoutMs: 300 });
  try {
    await s.start();
    await s.navigate(site.url);
    const page = (s as unknown as Internals).active.page;
    void page.evaluate(() => { const end = Date.now() + 1500; while (Date.now() < end) { /* block the main thread */ } }).catch(() => {});
    await new Promise(r => setTimeout(r, 50));
    const t0 = Date.now();
    await s.input({ kind: "mousemove", x: 5, y: 5 });
    expect(Date.now() - t0).toBeLessThan(1400);
    const info = await s.info();
    expect(info.frameError).toBeNull();
    expect(info.diagnostics?.some(d => /slow/i.test(d.message))).toBe(true);
    await s.act({ kind: "navigate", url: site.url });
    expect((await s.control({ kind: "refresh" })).frameError).toBeNull();
  } finally { await s.close(); await site.close(); fs.rmSync(profile, { recursive: true, force: true }); }
}, 20000);

it("coalesces pointer moves and wheel deltas queued behind a stalled input, keeps every button event", async () => {
  const profile = fs.mkdtempSync("/tmp/law-browser-stall-");
  const s = new BrowserSession({ profileDir: profile });
  let release!: () => void;
  try {
    await s.start();
    const apply = vi.spyOn(s as unknown as Internals, "applyInput").mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    void s.input({ kind: "mousemove", x: 1, y: 1 });
    void s.input({ kind: "mousemove", x: 2, y: 2 });
    void s.input({ kind: "mousemove", x: 3, y: 3 });
    void s.input({ kind: "wheel", x: 3, y: 3, deltaY: 100 });
    void s.input({ kind: "wheel", x: 4, y: 4, deltaX: 10, deltaY: 200 });
    void s.input({ kind: "mousedown", x: 4, y: 4 });
    const last = s.input({ kind: "mouseup", x: 4, y: 4 });
    await new Promise(r => setTimeout(r, 100));
    expect(apply).toHaveBeenCalledTimes(1);
    release();
    await last;
    expect(apply.mock.calls.map(c => c[0])).toEqual([
      { kind: "mousemove", x: 1, y: 1 },
      { kind: "mousemove", x: 3, y: 3 },
      { kind: "wheel", x: 4, y: 4, deltaX: 10, deltaY: 300 },
      { kind: "mousedown", x: 4, y: 4 },
      { kind: "mouseup", x: 4, y: 4 },
    ]);
    expect((await s.info()).frameError).toBeNull();
  } finally { release?.(); await s.close(); fs.rmSync(profile, { recursive: true, force: true }); }
}, 15000);

it("re-probes a quarantined browser on refresh and clears the quarantine once it answers", async () => {
  const site = await fixture();
  const profile = fs.mkdtempSync("/tmp/law-browser-stall-");
  const s = new BrowserSession({ profileDir: profile, inputTimeoutMs: 300 });
  try {
    await s.start();
    const internals = s as unknown as Internals;
    internals.unresponsive = true; internals.frameError = "Browser is unresponsive. Restart browser to recover.";
    await expect(s.act({ kind: "navigate", url: site.url })).rejects.toThrow(/unresponsive/);
    await expect(s.control({ kind: "recover" })).rejects.toThrow(/unresponsive/);
    expect((await s.control({ kind: "refresh" })).frameError).toBeNull();
    await s.navigate(site.url);
    internals.unresponsive = true;
    vi.spyOn(internals.active.page, "evaluate").mockImplementation(() => new Promise(() => {}));
    await expect(s.control({ kind: "refresh" })).rejects.toThrow(/unresponsive/);
  } finally { await s.close(); await site.close(); fs.rmSync(profile, { recursive: true, force: true }); }
}, 20000);
