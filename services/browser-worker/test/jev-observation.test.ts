import { afterAll, beforeAll, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BrowserContext } from "playwright";
import { BrowserSession } from "../src/browser-session.js";
import { startFixtureServer } from "./helpers/fixture-server.js";

let session: BrowserSession;
let site: Awaited<ReturnType<typeof startFixtureServer>>;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "law-jev-observe-"));
beforeAll(async () => { site = await startFixtureServer(); session = new BrowserSession({ profileDir }); await session.start(); }, 60_000);
afterAll(async () => { await session?.close(); await site?.close(); fs.rmSync(profileDir, { recursive: true, force: true }); });
const page = () => (session as unknown as { context: BrowserContext }).context.pages()[0]!;

it("keeps node identity across observations but changes it for replacement and navigation", async () => {
  await session.navigate(`${site.url}/index.html`);
  const first=await session.observe();
  const link=first.elements.find(e=>e.name.includes("Go to form"))!;
  expect(link.nodeId).toBeTruthy();
  expect((await session.observe()).elements.find(e=>e.name===link.name)!.nodeId).toBe(link.nodeId);
  await page().evaluate(()=>{const a=document.querySelector('a')!;a.replaceWith(a.cloneNode(true));});
  expect((await session.observe()).elements.find(e=>e.name===link.name)!.nodeId).not.toBe(link.nodeId);
  await session.navigate(`${site.url}/index.html`);
  expect((await session.observe()).elements.find(e=>e.name===link.name)!.nodeId).not.toBe(link.nodeId);
});

it("marks covered controls without making unrelated visible controls unavailable", async () => {
  await session.navigate(`${site.url}/index.html`);
  const before=await session.observe();const link=before.elements.find(e=>e.name.includes('Go to form'))!;
  await page().evaluate(()=>{const cover=document.createElement('div');cover.id='test-cover';cover.style.cssText='position:fixed;inset:0;background:white;z-index:99999';cover.innerHTML='<button>Dialog action</button>';document.body.append(cover);});
  await expect(session.act({kind:"click",ref:link.ref,revision:before.revision})).rejects.toMatchObject({code:"STALE_OBSERVATION"});
  const covered=await session.observe();
  expect(covered.elements.find(e=>e.name.includes('Go to form'))?.occluded).toBe(true);
  expect(covered.elements.find(e=>e.name==='Dialog action')?.occluded).toBe(false);
});

it("observes select choices, checkbox state and safe capabilities without exporting secret fields", async () => {
  await session.navigate(`${site.url}/form.html`);
  await page().evaluate(() => {
    document.querySelector<HTMLInputElement>('[type=password]')!.value = "secret-password";
    const input = document.createElement("input"); input.autocomplete = "one-time-code"; input.value = "654321"; document.body.append(input);
    const file = document.createElement("input"); file.type = "file"; document.body.append(file);
  });
  const obs = await session.observe({ pageText: true });
  expect(obs.elements.find(e => e.role === "combobox")).toMatchObject({ operations: ["select"], options: [{ value: "en", label: "English" }, { value: "pl", label: "Polish" }] });
  expect(obs.elements.find(e => e.role === "checkbox")).toMatchObject({ checked: false, operations: ["click"] });
  const sensitive = obs.elements.filter(e => e.sensitive);
  expect(sensitive).toHaveLength(3);
  for (const field of sensitive) { expect(field.operations).toEqual([]); expect(field.value).toBeUndefined(); }
  expect(JSON.stringify(obs)).not.toMatch(/secret-password|654321/);
  expect((await session.observe()).pageText).toBeUndefined();
});

it.each(["label", "href", "disabled", "replaced"])("rejects a target changed after observation: %s", async change => {
  await session.navigate(`${site.url}/index.html`);
  const obs = await session.observe(); const link = obs.elements.find(e => e.name.includes("Go to form"))!;
  await page().evaluate(change => {
    const el = document.querySelector<HTMLAnchorElement>('a[href="/form.html"]') ?? document.querySelector<HTMLAnchorElement>('a[href="form.html"]')!;
    if (change === "label") el.textContent = "Purchase";
    if (change === "href") el.href = "https://example.net/other";
    if (change === "disabled") el.setAttribute("aria-disabled", "true");
    if (change === "replaced") el.replaceWith(el.cloneNode(true));
  }, change);
  await expect(session.act({ kind: "click", ref: link.ref, revision: obs.revision })).rejects.toMatchObject({ code: "STALE_OBSERVATION" });
  expect((await session.info()).url).toContain("index.html");
});

it("handles an externally closed context without an unhandled tab-recreation rejection", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-jev-close-"));
  const other = new BrowserSession({ profileDir: dir });
  await other.start();
  const context = (other as unknown as { context: BrowserContext }).context;
  await context.close();
  await expect.poll(() => (other as unknown as { diagnostics: { message: string }[] }).diagnostics.some(d => d.message.includes("connection closed"))).toBe(true);
  await expect(other.observe()).rejects.toThrow(/unresponsive|not started/);
  await other.close(); fs.rmSync(dir, { recursive: true, force: true });
});
