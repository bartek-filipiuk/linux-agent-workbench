import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { readPage } from "./read-page.js";
import { deadline } from "./deadline.js";
import os from "node:os";
import { ManualBrowser, type ManualBrowserOptions } from "./manual-browser.js";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, type BrowserContext, type ElementHandle, type Frame, type Page, type Dialog } from "playwright";
import {
  ProtocolError,
  normaliseNavigableUrl,
  type BrowserReadInput,
  type BrowserAction,
  type BrowserControl,
  type BrowserActResult,
  type BrowserDownload,
  type BrowserElement,
  type BrowserInfo,
  type BrowserInputEvent,
  type BrowserObservation,
  type BrowserObserveInput,
  type BrowserScreencastOptions,
  type BrowserWaitInput,
  type BrowserWaitResult,
} from "@law/protocol";

export type FrameListener = (frame: { width: number; height: number; jpeg: Uint8Array; generation: number; sequence: number }) => void;

export type BrowserSessionOptions = {
  profileDir: string;
  downloadsDir?: string;
  /** "chromium" = full Chromium in new headless mode (needed by sites that refuse the headless shell). */
  channel?: string;
  /** HTTP proxy for all page traffic, e.g. the sandbox egress forwarder on 127.0.0.1:3128. */
  proxyServer?: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
  activeFps?: number;
  idleFps?: number;
  manualAvailable?: boolean;
  manualFactory?: (opts: ManualBrowserOptions) => ManualBrowser;
  /** BCP 47 tag and IANA zone of the human at the keyboard; a mismatch with the IP is an anti-bot signal (DataDome on allegro.pl). */
  locale?: string;
  timeZone?: string;
  /** How long one human input event may wait for the page before the next one is sent. */
  inputTimeoutMs?: number;
};

type PageEntry = { id: string; page: Page; opener?: Page | null; crashed?: boolean };

// Playwright errors carry a multi-line, ANSI-coloured call log; the model and the UI need the first line only.
const firstLine = (m: string) => m.replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0]!.trim();

// Runs inside the page: collects interactive elements and parks them in a registry the worker resolves refs against.
const OBSERVE_SCRIPT = `
(({ key, max, start }) => {
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=radio],[role=switch],[role=textbox],[role=combobox],[role=option],[contenteditable=""],[contenteditable="true"],[onclick],h1,h2,h3';
  const clip = (s, n = 120) => (s || "").replace(/\\s+/g, " ").trim().slice(0, n);
  const roleOf = (el) => {
    const r = el.getAttribute("role"); if (r) return r;
    const t = el.tagName.toLowerCase();
    if (t === "a") return "link";
    if (t === "button" || t === "summary") return "button";
    if (t === "select") return "combobox";
    if (t === "textarea") return "textbox";
    if (/^h[1-3]$/.test(t)) return "heading";
    if (t === "input") { const ty = (el.getAttribute("type") || "text").toLowerCase(); return ty === "checkbox" || ty === "radio" ? ty : ty === "submit" || ty === "button" ? "button" : ty === "password" ? "password" : "textbox"; }
    if (el.isContentEditable) return "textbox";
    return "generic";
  };
  const labelText = (el) => {
    if (el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) return l.innerText; }
    const p = el.closest("label"); return p ? p.innerText : "";
  };
  const nameOf = (el) => {
    const aria = el.getAttribute("aria-label"); if (aria) return aria;
    const by = el.getAttribute("aria-labelledby"); if (by) { const n = document.getElementById(by); if (n) return n.innerText; }
    const t = el.tagName.toLowerCase();
    if (t === "input" || t === "select" || t === "textarea") return labelText(el) || el.getAttribute("placeholder") || el.getAttribute("name") || "";
    if (t === "img") return el.getAttribute("alt") || "";
    return el.innerText || el.getAttribute("title") || el.getAttribute("value") || "";
  };
  const signature = el => JSON.stringify([el.tagName, roleOf(el), nameOf(el), el.getAttribute("href"), el.getAttribute("type"), el.getAttribute("autocomplete"), el.disabled, el.getAttribute("aria-disabled"), el.checked, el.value, el.getAttribute("aria-expanded"), el.getAttribute("aria-checked"), el.tagName === "SELECT" ? Array.from(el.options).map(o => [o.value, o.label, o.disabled]) : null]);
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const st = getComputedStyle(el); if (st.visibility === "hidden" || st.display === "none") continue;
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    const t = el.tagName.toLowerCase();
    const editable = t === "input" || t === "textarea" || t === "select" || el.isContentEditable === true;
    const item = { el, role: roleOf(el), name: clip(nameOf(el)), text: clip(el.innerText), enabled: !(el.disabled === true || el.getAttribute("aria-disabled") === "true"), editable, inViewport, bounds: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } };
    const hit = inViewport ? document.elementFromPoint(Math.max(0,Math.min(vw-1,r.x+r.width/2)),Math.max(0,Math.min(vh-1,r.y+r.height/2))) : null;
    item.occluded = inViewport && (!hit || !(hit === el || el.contains(hit)));
    if (t === "a") item.href = clip(el.getAttribute("href") || "", 400);
    if (editable && t !== "select" && el.type !== "password" && el.autocomplete !== "one-time-code") item.value = clip(el.value || "");
    if (t === "select") item.value = clip(el.options[el.selectedIndex]?.text || "");
    item.sensitive = el.type === "password" || el.type === "file" || /one-time-code|cc-number|cc-csc/.test(el.autocomplete || "") || /verification code|one.?time|2fa|authenticator|passcode/i.test(item.name);
    const fillable = (t === "textarea" || el.isContentEditable || (t === "input" && /^(text|search|email|url|tel|number|date|time|datetime-local|month|week)$/.test(el.type))) && !el.readOnly;
    item.operations = item.sensitive || !item.enabled ? [] : t === "select" ? ["select"] : fillable ? ["click", "type"] : item.role === "heading" ? [] : ["click"];
    if (item.sensitive) delete item.value;
    if (el.type === "checkbox" || el.type === "radio" || el.hasAttribute("aria-checked")) item.checked = el.checked === true || el.getAttribute("aria-checked") === "true";
    if (el.hasAttribute("aria-expanded")) item.expanded = el.getAttribute("aria-expanded") === "true";
    if (t === "select") item.options = Array.from(el.options).slice(0, 100).map(o => ({ label: clip(o.label), value: o.value.slice(0, 200), disabled: o.disabled || o.parentElement?.disabled === true }));
    out.push(item);
  }
  out.sort((a, b) => (a.inViewport === b.inViewport ? 0 : a.inViewport ? -1 : 1));
  const kept = out.slice(0, max);
  const prior = window[key];
  const identities = prior?.identities || new WeakMap();
  const documentId = prior?.documentId || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  let nextId = prior?.nextId || 0;
  const els = new Map();
  const elements = kept.map((it, i) => { const ref = "e" + (start + i + 1); els.set(ref, { el: it.el, signature: signature(it.el) }); const { el, ...rest } = it; if (!identities.has(el)) identities.set(el, documentId + ":" + (++nextId)); return { ref, nodeId: identities.get(el), ...rest }; });
  window[key] = { els, signature, identities, documentId, nextId };
  const doc = document.documentElement;
  return { elements, scroll: { x: Math.round(window.scrollX), y: Math.round(window.scrollY), maxY: Math.max(0, doc.scrollHeight - vh) } };
})
`;

/** Chrome's stock UA for the installed major version, without the "Headless" marker. */
export function chromeUserAgent(executablePath: string): string {
  let major = "140";
  try {
    const out = execFileSync(executablePath, ["--version"], { encoding: "utf8", timeout: 5000 });
    major = /(\d+)\./.exec(out)?.[1] ?? major;
  } catch {
    /* keep the fallback */
  }
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

export class BrowserSession {
  private context: BrowserContext | undefined;
  private readonly pages: PageEntry[] = [];
  private active: PageEntry | undefined;
  private pageSeq = 0;
  private readonly listeners = new Set<FrameListener>();
  private lastFrameAt = 0;
  private lastInputAt = 0;
  private readonly viewport: { width: number; height: number };
  private readonly activeFps: number;
  private readonly idleFps: number;
  private readonly registryKey = `__law_${randomBytes(6).toString("hex")}`;
  private refFrames = new Map<string, Frame>(); // which frame registered each ref of the current revision
  private screencast: BrowserScreencastOptions = {};
  private framesEnabled = false;
  private generation = randomBytes(4).readUInt32BE(0);
  private frameSequence = 0;
  private frameError: string | null = null;
  private pendingDialog: Dialog | undefined;
  private readonly stateListeners = new Set<(info: BrowserInfo) => void>();
  private diagnostics: Array<{ ts: number; message: string }> = [];
  private stateTimer: ReturnType<typeof setTimeout> | undefined;
  private inputQueue: Array<{ event: BrowserInputEvent; generation: number }> = [];
  private draining: Promise<void> | undefined;
  private readonly inputTimeoutMs: number;
  private unresponsive = false;

  /** Control operations that hang mark the browser unresponsive; "Refresh preview" re-probes it (see control). */
  private async bounded<T>(work: Promise<T>, ms = 15_000): Promise<T> {
    try { return await deadline(work, ms); }
    catch (error) {
      if (error instanceof Error && error.message.includes("operation timed out")) {
        this.unresponsive = true; this.generation++; this.frameError = error.message; this.publishState();
      }
      throw error;
    }
  }
  private closing = false;
  private manual: ManualBrowser | undefined;
  private manualMode = false;
  private transitioning = false;
  private returnUrl = "https://example.com";
  private get markerPath(): string { return path.join(this.opts.profileDir, ".law-manual.json"); }
  private get manualAvailable(): boolean { return this.opts.manualAvailable ?? process.env.LAW_BROWSER_MANUAL === "1"; }


  onState(cb: (info: BrowserInfo) => void): () => void { this.stateListeners.add(cb); return () => { this.stateListeners.delete(cb); }; }
  private publishState(): void {
    clearTimeout(this.stateTimer);
    this.stateTimer = setTimeout(() => {
      const generation = this.generation;
      void this.info().then(info => { if (generation === this.generation) for (const cb of this.stateListeners) cb(info); }).catch(() => {});
    }, 30);
  }
  private diagnostic(message: string): void {
    this.diagnostics = [...this.diagnostics.slice(-19), { ts: Date.now(), message }];
    this.publishState();
  }
  private changedPage(): void {
    this.revision++; this.refFrames.clear(); this.generation = (this.generation + 1) >>> 0;
    this.frameError = this.active?.crashed ? "Page crashed. Recover the tab to continue; unsaved page input may be lost." : null; this.publishState();
    void this.attachScreencast(this.active?.page, true);
  }
  async control(command: BrowserControl): Promise<BrowserInfo> {
    if (this.unresponsive) {
      if (command.kind !== "refresh" || !(await this.probe())) throw new ProtocolError("WORKER_UNAVAILABLE", "Browser is unresponsive. Restart browser to recover.");
      this.unresponsive = false; this.frameError = null; this.diagnostic("The browser answers again.");
    }
    if (this.transitioning) throw new ProtocolError("INVALID_INPUT", "Browser mode is changing; please wait");
    if (command.kind === "recover") return this.bounded(this.recoverPage(), 45000);
    if (command.kind === "manual") { await this.bounded(this.setManual(command.enabled), 45000); return this.info(); }
    if (command.kind === "refresh" && this.manualMode) {
      this.generation = (this.generation + 1) >>> 0; this.frameError = null; this.publishState();
      await this.manual?.setFramesEnabled(this.framesEnabled); return this.info();
    }
    if (command.kind === "switch" || command.kind === "close") {
      await this.act({ kind: command.kind === "switch" ? "switchPage" : "closePage", pageId: command.pageId });
    } else if (command.kind === "refresh") { this.requirePage(); this.changedPage(); await this.castTransition; }
    else if (command.kind === "clearSiteData") await this.clearSiteData();
    else if (command.kind === "dialog") {
      const d = this.pendingDialog; this.pendingDialog = undefined;
      if (d) { if (command.accept) await d.accept(); else await d.dismiss(); }
      this.publishState();
    } else throw new ProtocolError("INVALID_INPUT", "Manual login is not available in this worker yet");
    return this.info();
  }

  /** Cookies of the active page's host and its parent domains, then a fresh GET of the same address. */
  private async clearSiteData(): Promise<void> {
    if (this.manualMode) throw new ProtocolError("INVALID_INPUT", "Finish manual login before clearing site data");
    const page = this.requirePage();
    let host: string;
    try { host = new URL(page.url()).hostname.replace(/^www\./, ""); } catch { host = ""; }
    if (!host) throw new ProtocolError("INVALID_INPUT", "Open a site first");
    // ".allegro.pl" and "allegro.pl" both hold the cookie; ".pl" must not match.
    const suffixes = host.split(".").map((_, i, parts) => parts.slice(i).join(".")).filter(d => d.includes(".") || d === host);
    await this.context!.clearCookies({ domain: new RegExp(`^\\.?(${suffixes.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`) });
    const url = normaliseNavigableUrl(page.url());
    if (url) await this.navigate(url);
  }

  /** A page that evaluates a constant within the input deadline is alive, whatever the screencast says. */
  private async probe(): Promise<boolean> {
    if (this.manualMode) return this.manual !== undefined;
    const page = this.active?.page;
    if (!page || page.isClosed()) return false;
    try { await deadline(page.evaluate("1"), Math.min(this.inputTimeoutMs, 5000)); return true; } catch { return false; }
  }

  /** Explicit human recovery creates a fresh GET navigation, never replays a tool or form submission. */
  private async recoverPage(): Promise<BrowserInfo> {
    if (this.manualMode || !this.active?.crashed) throw new ProtocolError("INVALID_INPUT", "No crashed tab to recover");
    const old = this.active;
    const url = normaliseNavigableUrl(old.page.url());
    this.transitioning = true; this.publishState();
    try {
      const page = await this.context!.newPage();
      await this.registerPage(page);
      await old.page.close().catch(() => {});
      this.transitioning = false;
      if (url) await this.navigate(url);
      this.changedPage(); await this.castTransition;
      return await this.info();
    } finally { this.transitioning = false; this.publishState(); }
  }
  private castPage: Page | undefined;
  private castTransition: Promise<void> = Promise.resolve();

  setFramesEnabled(enabled: boolean): Promise<void> {
    if (this.framesEnabled !== enabled) { this.generation = (this.generation + 1) >>> 0; this.publishState(); }
    this.framesEnabled = enabled;
    if (this.manualMode) return this.manual?.setFramesEnabled(enabled) ?? Promise.resolve();
    return this.attachScreencast(this.active?.page, true);
  }
  private lastDialog: { type: string; message: string } | undefined;
  private readonly downloadsDir: string;
  private readonly downloads: BrowserDownload[] = [];
  revision = 0;

  constructor(private readonly opts: BrowserSessionOptions) {
    this.viewport = opts.viewport ?? { width: 1280, height: 800 };
    this.activeFps = opts.activeFps ?? 12;
    this.idleFps = opts.idleFps ?? 2;
    this.inputTimeoutMs = opts.inputTimeoutMs ?? 15_000;
    // Container: LAW_BROWSER_DOWNLOADS=/downloads (a per-session host dir). Host: next to the profile.
    this.downloadsDir = opts.downloadsDir ?? process.env.LAW_BROWSER_DOWNLOADS ?? path.join(opts.profileDir, "..", "downloads");
  }

  async start(screencast: BrowserScreencastOptions = {}): Promise<void> {
    this.screencast = screencast;
    if (fs.existsSync(this.markerPath)) {
      this.manualMode = true;
      try { this.returnUrl = normaliseNavigableUrl(JSON.parse(fs.readFileSync(this.markerPath, "utf8")).url) ?? this.returnUrl; } catch {}
      await this.waitForProfile();
      await this.openManual(); return;
    }
    await this.startAutomated(screencast);
  }

  private async waitForProfile(): Promise<void> {
    const lock = path.join(this.opts.profileDir, "SingletonLock");
    const deadline = Date.now() + 6500;
    for (;;) {
      let live = false;
      try {
        const value = fs.readlinkSync(lock); const pid = Number(value.slice(value.lastIndexOf("-") + 1));
        if (value.startsWith(`${os.hostname()}-`) && pid > 1) { try { process.kill(pid, 0); live = true; } catch {} }
      } catch {}
      if (!live) break;
      if (Date.now() >= deadline) throw new Error("The previous browser still owns this profile; close it before retrying");
      await sleep(150);
    }
    for (const f of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) fs.rmSync(path.join(this.opts.profileDir, f), { force: true });
  }

  private async openManual(): Promise<void> {
    const options: ManualBrowserOptions = {
      executablePath: chromium.executablePath(), profileDir: this.opts.profileDir, url: this.returnUrl,
      viewport: this.viewport, ...(this.opts.proxyServer ? { proxyServer: this.opts.proxyServer } : {}),
      ...(this.opts.locale ? { locale: this.opts.locale } : {}),
      onFrame: jpeg => {
        if (!this.framesEnabled || !this.manualMode || this.transitioning) return;
        for (const l of this.listeners) l({ ...this.viewport, jpeg, generation: this.generation, sequence: ++this.frameSequence });
      },
      onError: message => { this.frameError = message; this.publishState(); },
    };
    this.manual = this.opts.manualFactory?.(options) ?? new ManualBrowser(options);
    try { await this.manual.start(); await this.manual.setFramesEnabled(this.framesEnabled); }
    catch (e) { await this.manual.close(); this.manual = undefined; throw e; }
  }

  private async setManual(enabled: boolean): Promise<void> {
    if (!this.manualAvailable) throw new ProtocolError("INVALID_INPUT", "Manual login requires the updated browser image");
    if (enabled === this.manualMode) return;
    this.transitioning = true; this.generation = (this.generation + 1) >>> 0;
    this.frameError = null; this.refFrames.clear(); this.revision++; this.publishState();
    try {
      await this.bounded(this.draining ?? Promise.resolve());
      if (enabled) {
        // Only a regular return URL is persisted, never the OAuth query/fragment or credentials.
        const target = normaliseNavigableUrl(this.active?.page.url() ?? "");
        if (target) { const u = new URL(target); u.search = ""; u.hash = ""; u.username = ""; u.password = ""; this.returnUrl = u.toString(); }
        fs.writeFileSync(this.markerPath, JSON.stringify({ url: this.returnUrl }), { mode: 0o600 });
        this.closing = true;
        if (this.pendingDialog) { await this.pendingDialog.dismiss().catch(() => {}); this.pendingDialog = undefined; }
        await this.bounded(this.castTransition);
        await this.bounded(this.context?.close() ?? Promise.resolve()); this.context = undefined; this.active = undefined; this.pages.length = 0;
        this.manualMode = true;
        await this.waitForProfile(); await this.openManual();
      } else {
        await this.manual?.finish(); this.manual = undefined;
        await this.startAutomated(this.screencast);
        this.manualMode = false;
        fs.rmSync(this.markerPath, { force: true });
      }
    } catch (e) {
      this.closing = true;
      await this.bounded(this.context?.close() ?? Promise.resolve()).catch(() => {}); this.context = undefined; this.active = undefined; this.pages.length = 0;
      // Keep manual mode/marker on a failed transition: the agent must not resume into a login.
      this.manualMode = true;
      this.frameError = this.unresponsive ? "Browser is unresponsive. Restart browser to recover." : "Browser mode could not switch. Choose Finish manual login to recover.";
      throw e;
    } finally { this.transitioning = false; this.generation = (this.generation + 1) >>> 0; this.publishState(); }
    if (!enabled) {
      await this.navigate(this.returnUrl).catch(() => { this.frameError = "Login was saved, but the return page could not load. Enter its address to retry."; this.publishState(); });
      await this.attachScreencast(this.active?.page, true);
    }
  }

  private async startAutomated(screencast: BrowserScreencastOptions = {}): Promise<void> {
    this.closing = false;
    this.screencast = screencast;
    fs.mkdirSync(this.downloadsDir, { recursive: true });
    // One Chromium per profile is guaranteed by the session; a lock left by a killed container
    // (different hostname in the symlink) would otherwise make Chromium refuse the profile.
    await this.waitForProfile();
    const channel = this.opts.channel ?? process.env.LAW_BROWSER_CHANNEL;
    this.context = await chromium.launchPersistentContext(this.opts.profileDir, {
      headless: this.opts.headless ?? true,
      viewport: this.viewport,
      acceptDownloads: true,
      ...(channel ? { channel } : {}),
      ...(this.opts.proxyServer ? { proxy: { server: this.opts.proxyServer } } : {}),
      ...(this.opts.locale ? { locale: this.opts.locale } : {}),
      ...(this.opts.timeZone ? { timezoneId: this.opts.timeZone } : {}),
      // Sites such as x.com answer 403 to the headless signature; present as a regular Chrome.
      userAgent: chromeUserAgent(chromium.executablePath()),
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    for (const p of this.context.pages()) await this.registerPage(p);
    if (!this.active) await this.registerPage(await this.context.newPage());
    this.context.on("page", (p) => void this.registerPage(p).catch(() => { if (!this.closing) { this.unresponsive = true; this.diagnostic("Could not register the new tab. Restart browser to recover."); } }));
  }

  private async registerPage(page: Page): Promise<void> {
    if (this.pages.some(e => e.page === page)) return;
    const opener = await page.opener();
    if (this.pages.some(e => e.page === page) || page.isClosed()) return;
    const entry: PageEntry = { id: `p${++this.pageSeq}`, page, opener };
    this.pages.push(entry);
    this.active = entry;
    this.changedPage();
    page.on("crash", () => {
      entry.crashed = true;
      if (this.active === entry) this.changedPage();
      this.diagnostic("A browser tab crashed, possibly because its memory limit was reached. Recover the affected tab.");
    });
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) { if (this.active === entry) this.changedPage(); else this.publishState(); } });
    page.on("domcontentloaded", () => this.publishState());
    page.on("load", () => this.publishState());
    page.on("response", response => { if (response.status() >= 400) { const url = new URL(response.url()); this.diagnostic(`${url.hostname}: HTTP ${response.status()}`); } });
    page.on("requestfailed", request => { try { this.diagnostic(`${new URL(request.url()).hostname}: ${request.failure()?.errorText.match(/ERR_[A-Z_]+/)?.[0] ?? "connection failed"}`); } catch {} });
    // SPA title/history updates do not necessarily create a navigation event.
    await page.exposeBinding("__lawPageChanged", () => this.publishState()).then(() => page.addInitScript(`
      document.addEventListener("DOMContentLoaded", () => {
        if (document.head) new MutationObserver(() => { window.__lawPageChanged(); }).observe(document.head, { childList: true, subtree: true, characterData: true });
      });
    `)).catch(() => {});
    page.on("dialog", (d) => {
      this.lastDialog = { type: d.type(), message: d.message() };
      this.pendingDialog = d; this.publishState();
    });
    page.on("download", (d) => {
      const name = path.basename(d.suggestedFilename()).replace(/[^\w.\-]+/g, "_") || "download";
      const target = path.join(this.downloadsDir, `${Date.now()}-${name}`);
      void d
        .saveAs(target)
        .then(() => this.downloads.push({ name, bytes: fs.statSync(target).size, pageUrl: page.url() }))
        .catch(() => {});
    });
    page.on("close", () => {
      const i = this.pages.findIndex((e) => e.page === page);
      if (i >= 0) this.pages.splice(i, 1);
      if (this.active?.page === page) {
        this.active = this.pages.find(e => e.page === entry.opener) ?? this.pages.at(-1);
        if (this.active) this.changedPage();
        else if (!this.closing) void this.context?.newPage().catch(() => { if (!this.closing) { this.unresponsive = true; this.diagnostic("Browser connection closed. Restart browser to recover."); } });
      }
      this.publishState();
    });
    await this.attachScreencast(page);
  }

  private attachScreencast(_page?: Page, force = false): Promise<void> {
    const next = this.castTransition.then(async () => {
      const page = this.framesEnabled && !this.active?.crashed ? this.active?.page : undefined;
      if (!force && this.castPage === page) return;
      await this.castPage?.screencast.stop().catch(() => {});
      this.castPage = undefined;
      if (!page) return;
      this.castPage = page;
      this.lastFrameAt = 0;
      const generation = this.generation;
      try {
      await page.screencast.start({
        size: this.screencast.size ?? { width: 1024, height: 640 },
        quality: this.screencast.quality ?? 60,
        onFrame: ({ data, viewportWidth, viewportHeight }) => {
          if (!this.framesEnabled || this.active?.page !== page || generation !== this.generation) return;
          const now = Date.now();
          const fps = now - this.lastInputAt < 2000 ? this.activeFps : this.idleFps;
          if (now - this.lastFrameAt < 1000 / fps) return;
          this.lastFrameAt = now;
          for (const l of this.listeners) l({ width: viewportWidth, height: viewportHeight, jpeg: new Uint8Array(data), generation, sequence: ++this.frameSequence });
        },
      });
    } catch {
        this.frameError = "Preview could not start. Refresh the preview to retry."; this.publishState();
        this.castPage = undefined;
      }
    });
    this.castTransition = next.catch(() => {});
    return next;
  }

  onFrame(cb: FrameListener): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }

  async navigate(url: string): Promise<BrowserInfo> {
    const target = normaliseNavigableUrl(url);
    if (!target) throw new ProtocolError("INVALID_INPUT", "only http and https URLs can be opened");
    const page = this.requirePage();
    try {
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
    } catch (e) {
      // A container's network is still settling in the first seconds after start (ERR_NETWORK_CHANGED); one retry covers it.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/ERR_NETWORK_CHANGED|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/.test(msg)) throw new ProtocolError("INVALID_INPUT", firstLine(msg));
      await sleep(1500);
      try {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      } catch (e2) {
        throw new ProtocolError("INVALID_INPUT", firstLine(e2 instanceof Error ? e2.message : String(e2)));
      }
    }
    this.lastInputAt = Date.now();
    this.revision++;
    return this.info();
  }

  async info(): Promise<BrowserInfo> {
    if (this.manualMode || this.transitioning) return {
      url: this.returnUrl, title: this.transitioning ? "Switching browser mode" : "Manual login", viewport: this.viewport,
      generation: this.generation, pages: [], manual: this.manualMode, manualAvailable: this.manualAvailable,
      transitioning: this.transitioning, frameError: this.frameError, dialog: null, diagnostics: this.diagnostics,
    };
    const page = this.requirePage(true);
    return { url: page.url(), title: this.active?.crashed ? "Page crashed" : this.pendingDialog ? "Browser dialog" : await page.title().catch(() => ""), viewport: page.viewportSize() ?? this.viewport,
      generation: this.generation, activePageId: this.active!.id,
      pages: await Promise.all(this.pages.map(async e => ({ id: e.id, url: e.page.url(), title: e.crashed ? "Page crashed" : this.pendingDialog ? e.page.url() : await e.page.title().catch(() => ""), crashed: e.crashed === true }))),
      crashed: this.active?.crashed === true,
      frameError: this.frameError, manual: false, manualAvailable: this.manualAvailable, transitioning: false,
      dialog: this.pendingDialog ? { type: this.pendingDialog.type(), message: this.pendingDialog.message().slice(0, 500) } : null,
      diagnostics: this.diagnostics,
    };
  }

  /**
   * Human input is best effort: a busy page delays it, consecutive moves keep only the latest and wheel deltas add up,
   * and a key or button release is never dropped. A slow page is not a hung browser, so nothing here quarantines it.
   */
  input(event: BrowserInputEvent): Promise<void> {
    if (this.transitioning || this.active?.crashed || this.unresponsive) return Promise.resolve();
    const generation = this.generation;
    const last = this.inputQueue.at(-1);
    if (last?.generation === generation && last.event.kind === "mousemove" && event.kind === "mousemove") last.event = event;
    else if (last?.generation === generation && last.event.kind === "wheel" && event.kind === "wheel") {
      last.event = { ...event, deltaX: (last.event.deltaX ?? 0) + (event.deltaX ?? 0), deltaY: (last.event.deltaY ?? 0) + (event.deltaY ?? 0) };
    } else this.inputQueue.push({ event, generation });
    return this.kickDrain();
  }
  private kickDrain(): Promise<void> {
    this.draining ??= this.drainInput().finally(() => { this.draining = undefined; if (this.inputQueue.length) void this.kickDrain(); });
    return this.draining;
  }
  private async drainInput(): Promise<void> {
    for (let next = this.inputQueue.shift(); next; next = this.inputQueue.shift()) {
      if (this.transitioning || this.active?.crashed || this.unresponsive) { this.inputQueue.length = 0; return; }
      if (next.generation !== this.generation) continue; // meant for a page that is gone
      try {
        await deadline(this.manualMode ? this.manual?.input(next.event) ?? Promise.resolve() : this.applyInput(next.event), this.inputTimeoutMs);
      } catch (error) {
        const timedOut = error instanceof Error && error.message.includes("timed out");
        this.diagnostic(timedOut ? `The page was slow to accept input (over ${Math.round(this.inputTimeoutMs / 1000)} s); later input may arrive late.` : "Browser input could not be delivered. Refresh the preview and try again.");
      }
    }
  }
  private async applyInput(e: BrowserInputEvent): Promise<void> {
    const page = this.requirePage();
    this.lastInputAt = Date.now();
    switch (e.kind) {
      case "mousemove":
        return page.mouse.move(e.x, e.y);
      case "mousedown":
        await page.mouse.move(e.x, e.y);
        this.requirePage();
        return page.mouse.down({ button: e.button ?? "left" });
      case "mouseup":
        await page.mouse.move(e.x, e.y);
        this.requirePage();
        return page.mouse.up({ button: e.button ?? "left" });
      case "wheel":
        await page.mouse.move(e.x, e.y);
        this.requirePage();
        return page.mouse.wheel(e.deltaX ?? 0, e.deltaY ?? 0);
      case "keydown":
        return page.keyboard.down(e.key);
      case "keyup":
        return page.keyboard.up(e.key);
      case "insert":
        return page.keyboard.insertText(e.text);
    }
  }

  async read(input: BrowserReadInput = {}) {
    const page = this.requirePage();
    const pageId = this.active!.id;
    const generation = this.generation;
    const result = await readPage(page, pageId, input);
    if (generation !== this.generation || this.active?.page !== page) throw new ProtocolError("STALE_OBSERVATION", "Active page changed while reading; read again");
    return result;
  }

  async observe(input: BrowserObserveInput = {}): Promise<BrowserObservation> {
    const page = this.requirePage();
    this.revision++;
    const max = input.maxElements ?? 200;
    const { elements, scroll } = await this.walkFrames(page, max);
    const pageText = input.pageText && /^https?:/.test(page.url()) ? (await readPage(page, this.active!.id, { scope: "page" }, 12000)).content : undefined;
    this.requirePage(); // A crash during observation must not become an empty successful result.
    // Opt-in, as the tool contract says: a screenshot costs 100-300 ms here and an image in the model's context.
    const screenshot = input.screenshot === true ? (await page.screenshot({ type: "jpeg", quality: 50 })).toString("base64") : undefined;
    const pages = await Promise.all(this.pages.map(async (e) => ({ id: e.id, url: e.page.url(), title: await e.page.title().catch(() => "") })));
    const dialog = this.lastDialog;
    this.lastDialog = undefined;
    return {
      revision: this.revision,
      activePageId: this.active!.id,
      url: page.url(),
      title: await page.title().catch(() => ""),
      viewport: page.viewportSize() ?? this.viewport,
      scroll,
      elements,
      ...(pageText !== undefined ? { pageText } : {}),
      pages,
      ...(screenshot ? { screenshotJpegBase64: screenshot } : {}),
      ...(dialog ? { lastDialog: dialog } : {}),
    };
  }

  /** Main frame first, then every child frame (where the reCAPTCHA checkbox and embedded widgets live), refs numbered across all of them. */
  private async walkFrames(page: Page, max: number): Promise<{ elements: BrowserElement[]; scroll: { x: number; y: number; maxY: number } }> {
    const elements: BrowserElement[] = [];
    let scroll = { x: 0, y: 0, maxY: 0 };
    this.refFrames = new Map();
    for (const frame of page.frames()) {
      if (elements.length >= max) break;
      let offset = { x: 0, y: 0 };
      const isMain = frame === page.mainFrame();
      if (!isMain) {
        const box = await frame.frameElement().then((fe) => fe.boundingBox()).catch(() => null);
        if (!box) continue; // detached or not rendered
        offset = { x: Math.round(box.x), y: Math.round(box.y) };
      }
      const data = (await frame
        .evaluate(`${OBSERVE_SCRIPT}(${JSON.stringify({ key: this.registryKey, max: max - elements.length, start: elements.length })})`)
        .catch(() => null)) as { elements: BrowserElement[]; scroll: { x: number; y: number; maxY: number } } | null;
      if (!data) continue; // navigated away or sandboxed
      if (isMain) scroll = data.scroll;
      for (const el of data.elements) {
        this.refFrames.set(el.ref, frame);
        elements.push(isMain ? el : { ...el, bounds: { ...el.bounds, x: el.bounds.x + offset.x, y: el.bounds.y + offset.y } });
      }
    }
    return { elements, scroll };
  }

  private async handleFor(ref: string, revision: number): Promise<ElementHandle> {
    if (revision !== this.revision) {
      throw new ProtocolError("STALE_OBSERVATION", `revision ${revision} is stale (current ${this.revision}); observe again before acting`);
    }
    const frame = this.refFrames.get(ref);
    const h = frame && !frame.isDetached() ? await frame.evaluateHandle(`(() => { const registry = window[${JSON.stringify(this.registryKey)}]; const item = registry?.els.get(${JSON.stringify(ref)}); if (!item || !item.el.isConnected || item.signature !== registry.signature(item.el)) return null;
      const r=item.el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      if (x>=0 && y>=0 && x<innerWidth && y<innerHeight) { const hit=document.elementFromPoint(x,y); if (!hit || !(hit===item.el || item.el.contains(hit))) return null; }
      return item.el; })()`) : undefined;
    const el = h?.asElement();
    if (!el) throw new ProtocolError("STALE_OBSERVATION", `unknown element ref ${ref}; observe again`);
    return el;
  }

  async act(action: BrowserAction): Promise<BrowserActResult> {
    const page = this.requirePage(action.kind === "switchPage" || action.kind === "closePage");
    this.lastInputAt = Date.now();
    switch (action.kind) {
      case "navigate":
        await this.navigate(action.url);
        break;
      case "click":
        await (await this.handleFor(action.ref, action.revision)).click({ timeout: 10_000 });
        break;
      case "type": {
        const el = await this.handleFor(action.ref, action.revision);
        await el.fill(action.text, { timeout: 10_000 });
        if (action.submit) await el.press("Enter");
        break;
      }
      case "press":
        await page.keyboard.press(action.key);
        break;
      case "select":
        await (await this.handleFor(action.ref, action.revision)).selectOption(action.values, { timeout: 10_000 });
        break;
      case "mouse":
        if (action.action === "move") await page.mouse.move(action.x, action.y);
        else if (action.action === "down") await page.mouse.down();
        else if (action.action === "up") await page.mouse.up();
        else {
          await page.mouse.move(action.x, action.y);
          await page.mouse.wheel(0, action.deltaY ?? 0);
        }
        break;
      case "switchPage": {
        const entry = this.pages.find((e) => e.id === action.pageId);
        if (!entry) throw new ProtocolError("INVALID_INPUT", `no page ${action.pageId}`);
        this.active = entry;
        if (!entry.crashed) await entry.page.bringToFront();
        this.changedPage();
        await this.castTransition;
        break;
      }
      case "closePage": {
        const entry = this.pages.find((e) => e.id === action.pageId);
        if (!entry) throw new ProtocolError("INVALID_INPUT", `no page ${action.pageId}`);
        if (this.pages.length === 1) throw new ProtocolError("INVALID_INPUT", "cannot close the last page");
        await entry.page.close();
        break;
      }
      case "upload":
        throw new ProtocolError("INVALID_INPUT", "upload is not available yet");
      case "wait":
        await sleep(action.ms);
        break;
    }
    this.revision++;
    const current = this.requirePage(action.kind === "switchPage" || action.kind === "closePage");
    return { url: current.url(), title: this.active?.crashed ? "Page crashed" : await current.title().catch(() => ""), activePageId: this.active!.id };
  }

  async wait(input: BrowserWaitInput): Promise<BrowserWaitResult> {
    const page = this.requirePage();
    const timeout = input.timeoutMs ?? 15_000;
    const done = async (matched: boolean, timedOut: boolean): Promise<BrowserWaitResult> => { this.requirePage(); return { matched, timedOut, url: page.url(), title: await page.title().catch(() => "") }; };
    try {
      if (input.state) await page.waitForLoadState(input.state, { timeout });
      if (input.selector) await page.waitForSelector(input.selector, { timeout });
      if (input.text) {
        const re = new RegExp(input.text, "i");
        const deadline = Date.now() + timeout;
        for (;;) {
          const body = (await page.evaluate("document.body ? document.body.innerText : ''").catch(() => "")) as string;
          if (re.test(body)) return done(true, false);
          if (Date.now() >= deadline) return done(false, true);
          await sleep(200);
        }
      }
      return done(Boolean(input.state || input.selector), false);
    } catch {
      return done(false, true);
    }
  }

  listDownloads(): BrowserDownload[] {
    this.requirePage();
    return [...this.downloads];
  }

  async close(): Promise<void> {
    this.closing = true; clearTimeout(this.stateTimer);
    await this.manual?.close(); this.manual = undefined;
    await this.context?.close();
    this.context = undefined;
    this.pages.length = 0;
    this.active = undefined;
  }

  private requirePage(allowCrashed = false): Page {
    if (this.unresponsive && !allowCrashed) throw new ProtocolError("WORKER_UNAVAILABLE", "Browser is unresponsive. Restart browser to recover.");
    if (this.manualMode || this.transitioning) throw new ProtocolError("INVALID_INPUT", "Manual login active; wait for the human to finish and resume the agent");
    if (!this.active) throw new ProtocolError("WORKER_UNAVAILABLE", "browser not started");
    if (!allowCrashed && this.active.crashed) throw new ProtocolError("WORKER_UNAVAILABLE", "Browser tab crashed. Ask the human to recover the tab; no action was replayed.");
    return this.active.page;
  }
}
