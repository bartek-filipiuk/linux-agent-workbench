import { it, expect } from "vitest";
import fs from "node:fs";
import http from "node:http";
import { BrowserSession } from "../src/browser-session.js";
it("publishes human navigation/popups, restores opener, rejects stale refs and masks passwords", async () => {
  const server = http.createServer((req,res) => {res.setHeader("Content-Type","text/html");res.end(req.url === "/popup" ? '<title>Identity provider</title><input type="password" value="fixture-secret"><input autocomplete="one-time-code" value="123456">' : '<title>Source</title><button style="width:200px;height:80px" onclick="window.open(\'/popup\')">Login</button>');});
  await new Promise<void>(r => server.listen(0,"127.0.0.1",r));
  const profile = fs.mkdtempSync("/tmp/law-browser-ui-");
  const s = new BrowserSession({profileDir:profile});
  const states: any[] = []; s.onState(x => states.push(x));
  try {
    await s.start(); await s.setFramesEnabled(true);
    await s.navigate(`http://127.0.0.1:${(server.address() as any).port}`);
    const before = await s.observe({});
    // No preceding mousemove: down/up must honor their own coordinates.
    await s.input({kind:"mousedown",x:60,y:40}); await s.input({kind:"mouseup",x:60,y:40});
    await expect.poll(() => states.some(x => x.pages?.length === 2 && x.url.endsWith("/popup"))).toBe(true);
    const popup = await s.observe({});
    expect(JSON.stringify(popup)).not.toContain("fixture-secret"); expect(JSON.stringify(popup)).not.toContain("123456");
    expect(popup.activePageId).not.toBe(before.activePageId);
    await expect(s.act({kind:"click",ref:before.elements[0]!.ref,revision:before.revision})).rejects.toThrow();
    await s.control({kind:"close",pageId:popup.activePageId});
    expect((await s.info()).activePageId).toBe(before.activePageId);
  } finally {await s.close(); await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(profile,{recursive:true,force:true});}
},30000);

import { ManualBrowser } from "../src/manual-browser.js";
it("blocks automation throughout manual transitions, persists the mode and recovers a failed launch", async () => {
  const profile = fs.mkdtempSync("/tmp/law-browser-mode-");
  let fail = false; let opened = 0; let closed = 0; let inputs = 0;
  class FakeManual extends ManualBrowser {
    override async start() { opened++; if (fail) throw new Error("fixture launch failed"); }
    override async close() { closed++; }
    override async setFramesEnabled() {}
    override async input() { inputs++; }
  }
  const options = { profileDir: profile, manualAvailable: true, manualFactory: (o: ConstructorParameters<typeof ManualBrowser>[0]) => new FakeManual(o) };
  let s = new BrowserSession(options);
  try {
    await s.start();
    const transition = s.control({ kind: "manual", enabled: true });
    await expect(s.observe({ screenshot: true })).rejects.toThrow(/Manual login/);
    expect((await transition).manual).toBe(true);
    await expect(s.act({ kind: "navigate", url: "https://example.com" })).rejects.toThrow(/Manual login/);
    await expect(s.wait({ timeoutMs: 100 })).rejects.toThrow(/Manual login/);
    expect(() => s.listDownloads()).toThrow(/Manual login/);
    await s.input({ kind: "insert", text: "fixture-password" }); expect(inputs).toBe(1);
    expect(fs.existsSync(`${profile}/.law-manual.json`)).toBe(true);
    await s.close();
    s = new BrowserSession(options); await s.start();
    expect((await s.info()).manual).toBe(true); expect(opened).toBe(2);
    // Avoid public network requests in this lifecycle test.
    (s as unknown as { returnUrl: string }).returnUrl = "about:blank";
    expect((await s.control({ kind: "manual", enabled: false })).manual).toBe(false);
    expect(fs.existsSync(`${profile}/.law-manual.json`)).toBe(false);
    fail = true;
    await expect(s.control({ kind: "manual", enabled: true })).rejects.toThrow("fixture launch failed");
    expect((await s.info()).manual).toBe(true);
    await expect(s.observe()).rejects.toThrow(/Manual login/);
    (s as unknown as { returnUrl: string }).returnUrl = "about:blank";
    expect((await s.control({ kind: "manual", enabled: false })).manual).toBe(false);
    expect(closed).toBeGreaterThanOrEqual(3);
  } finally { await s.close(); fs.rmSync(profile, { recursive: true, force: true }); }
}, 30000);
