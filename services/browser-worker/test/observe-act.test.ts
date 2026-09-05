import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProtocolError } from "@law/protocol";
import { BrowserSession } from "../src/browser-session.js";
import { startFixtureServer } from "./helpers/fixture-server.js";

let s: BrowserSession;
let site: { url: string; close: () => Promise<void> };
const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "law-dl-"));

beforeAll(async () => {
  site = await startFixtureServer();
  s = new BrowserSession({ profileDir: fs.mkdtempSync(path.join(os.tmpdir(), "law-bw-")), downloadsDir: downloads, viewport: { width: 1000, height: 600 } });
  await s.start({ size: { width: 500, height: 300 } });
}, 60_000);
afterAll(async () => {
  await s.close();
  await site.close();
});

const byName = (obs: { elements: Array<{ ref: string; name: string; role: string }> }, name: string) => obs.elements.find((e) => e.name.includes(name))!;

describe("observe and act", { timeout: 30_000 }, () => {
  it("observes elements with refs, roles, names, viewport flags and a screenshot", async () => {
    await s.navigate(`${site.url}/index.html`);
    const obs = await s.observe({ screenshot: true });
    expect(obs.title).toBe("Fixture Home");
    expect(obs.pages).toHaveLength(1);
    expect(obs.activePageId).toBe(obs.pages[0]!.id);
    const link = byName(obs, "Go to form");
    expect(link).toMatchObject({ role: "link", href: "/form.html", enabled: true, editable: false, inViewport: true });
    expect(byName(obs, "Show alert").role).toBe("button");
    expect(byName(obs, "Fixture Home").role).toBe("heading");
    expect(byName(obs, "Bottom button").inViewport).toBe(false);
    expect(obs.elements.map((e) => e.ref)).toEqual(obs.elements.map((_, i) => `e${i + 1}`));
    expect(obs.screenshotJpegBase64!.length).toBeGreaterThan(1000);
    expect(obs.scroll.maxY).toBeGreaterThan(1000);
    const again = await s.observe();
    expect(again.revision).toBe(obs.revision + 1);
    expect(again.screenshotJpegBase64).toBeUndefined(); // default: no screenshot
  });

  it("clicks by ref, and refuses stale refs", async () => {
    await s.navigate(`${site.url}/index.html`);
    const obs = await s.observe({ screenshot: false });
    const link = byName(obs, "Go to form");
    const r = await s.act({ kind: "click", ref: link.ref, revision: obs.revision });
    expect(r.url).toContain("/form.html");
    await expect(s.act({ kind: "click", ref: link.ref, revision: obs.revision })).rejects.toSatisfy((e) => ProtocolError.is(e, "STALE_OBSERVATION"));
    const fresh = await s.observe({ screenshot: false });
    await expect(s.act({ kind: "click", ref: "e999", revision: fresh.revision })).rejects.toSatisfy((e) => ProtocolError.is(e, "STALE_OBSERVATION"));
  });

  it("observes and clicks elements inside iframes with page coordinates", async () => {
    await s.navigate(`${site.url}/frame.html`);
    const obs = await s.observe({ screenshot: false });
    const cb = byName(obs, "not a robot");
    expect(cb).toMatchObject({ role: "checkbox" });
    expect(cb.ref).toBe(`e${obs.elements.length}`);
    expect((cb as { bounds: { y: number } }).bounds.y).toBeGreaterThan(150);
    await s.act({ kind: "click", ref: cb.ref, revision: obs.revision });
    expect((await s.info()).title).toBe("FRAMED_CLICK");
  });

  it("types, selects and submits a form", async () => {
    await s.navigate(`${site.url}/form.html`);
    let obs = await s.observe({ screenshot: false });
    const q = byName(obs, "Query");
    expect(q).toMatchObject({ role: "textbox", editable: true });
    expect(obs.elements.some((e) => e.role === "password")).toBe(true);
    const lang = obs.elements.find((e) => e.role === "combobox")!;
    await s.act({ kind: "select", ref: lang.ref, revision: obs.revision, values: ["pl"] });
    obs = await s.observe({ screenshot: false });
    expect(obs.elements.find((e) => e.role === "combobox")!.value).toBe("Polski");
    await s.act({ kind: "type", ref: byName(obs, "Query").ref, revision: obs.revision, text: "hello", submit: true });
    const w = await s.wait({ text: "QUERY=hello LANG=pl", timeoutMs: 5000 });
    expect(w.matched).toBe(true);
    expect(w.url).toContain("/result.html?q=hello");
  });

  it("handles popups as pages: switch and close", async () => {
    await s.navigate(`${site.url}/popup.html`);
    const obs = await s.observe({ screenshot: false });
    await s.act({ kind: "click", ref: byName(obs, "Open form in a new tab").ref, revision: obs.revision });
    await expect.poll(async () => (await s.observe({ screenshot: false })).pages.length, { timeout: 5000 }).toBe(2);
    let now = await s.observe({ screenshot: false });
    const popup = now.pages.find((p) => p.url.includes("/form.html"))!;
    expect(now.activePageId).toBe(popup.id); // the popup took focus
    const first = now.pages.find((p) => p.id !== popup.id)!;
    await s.act({ kind: "switchPage", pageId: first.id });
    now = await s.observe({ screenshot: false });
    expect(now.url).toContain("/popup.html");
    await s.act({ kind: "closePage", pageId: popup.id });
    now = await s.observe({ screenshot: false });
    expect(now.pages).toHaveLength(1);
    await expect(s.act({ kind: "closePage", pageId: first.id })).rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
  });

  it("waits for text and reports timeouts", async () => {
    await s.navigate(`${site.url}/index.html`);
    const obs = await s.observe({ screenshot: false });
    await s.act({ kind: "click", ref: byName(obs, "Load later").ref, revision: obs.revision });
    expect((await s.wait({ text: "LATE_CONTENT", timeoutMs: 5000 })).matched).toBe(true);
    expect(await s.wait({ text: "NEVER_THERE", timeoutMs: 400 })).toMatchObject({ matched: false, timedOut: true });
  });

  it("captures downloads and dismisses dialogs", async () => {
    await s.navigate(`${site.url}/index.html`);
    let obs = await s.observe({ screenshot: false });
    await s.act({ kind: "click", ref: byName(obs, "Download report").ref, revision: obs.revision });
    await expect.poll(() => s.listDownloads().length, { timeout: 5000 }).toBe(1);
    expect(s.listDownloads()[0]).toMatchObject({ name: "report.txt", bytes: 15 });
    obs = await s.observe({ screenshot: false });
    await s.act({ kind: "click", ref: byName(obs, "Show alert").ref, revision: obs.revision });
    obs = await s.observe({ screenshot: false });
    expect(obs.lastDialog).toEqual({ type: "alert", message: "hello from alert" });
    expect((await s.observe({ screenshot: false })).lastDialog).toBeUndefined();
  });

  it("rejects upload for now and non-http navigation", async () => {
    const obs = await s.observe({ screenshot: false });
    await expect(s.act({ kind: "upload", ref: "e1", revision: obs.revision, workspacePaths: ["a"] })).rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
    await expect(s.act({ kind: "navigate", url: "file:///etc/passwd" })).rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
  });
});
