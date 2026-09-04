import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, type BrowserContext, type ElementHandle, type Frame, type Page } from "playwright";
import {
  ProtocolError,
  normaliseNavigableUrl,
  type BrowserAction,
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

export type FrameListener = (frame: { width: number; height: number; jpeg: Uint8Array }) => void;

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
};

type PageEntry = { id: string; page: Page };

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
    if (t === "a") item.href = clip(el.getAttribute("href") || "", 400);
    if (editable && t !== "select") item.value = clip(el.value || "");
    if (t === "select") item.value = clip(el.options[el.selectedIndex]?.text || "");
    out.push(item);
  }
  out.sort((a, b) => (a.inViewport === b.inViewport ? 0 : a.inViewport ? -1 : 1));
  const kept = out.slice(0, max);
  const els = new Map();
  const elements = kept.map((it, i) => { const ref = "e" + (start + i + 1); els.set(ref, it.el); const { el, ...rest } = it; return { ref, ...rest }; });
  window[key] = { els };
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
  private lastDialog: { type: string; message: string } | undefined;
  private readonly downloadsDir: string;
  private readonly downloads: BrowserDownload[] = [];
  revision = 0;

  constructor(private readonly opts: BrowserSessionOptions) {
    this.viewport = opts.viewport ?? { width: 1280, height: 800 };
    this.activeFps = opts.activeFps ?? 12;
    this.idleFps = opts.idleFps ?? 2;
    // Container: LAW_BROWSER_DOWNLOADS=/downloads (a per-session host dir). Host: next to the profile.
    this.downloadsDir = opts.downloadsDir ?? process.env.LAW_BROWSER_DOWNLOADS ?? path.join(opts.profileDir, "..", "downloads");
  }

  async start(screencast: BrowserScreencastOptions = {}): Promise<void> {
    this.screencast = screencast;
    fs.mkdirSync(this.downloadsDir, { recursive: true });
    // One Chromium per profile is guaranteed by the session; a lock left by a killed container
    // (different hostname in the symlink) would otherwise make Chromium refuse the profile.
    for (const f of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
      fs.rmSync(path.join(this.opts.profileDir, f), { force: true });
    }
    const channel = this.opts.channel ?? process.env.LAW_BROWSER_CHANNEL;
    this.context = await chromium.launchPersistentContext(this.opts.profileDir, {
      headless: this.opts.headless ?? true,
      viewport: this.viewport,
      acceptDownloads: true,
      ...(channel ? { channel } : {}),
      ...(this.opts.proxyServer ? { proxy: { server: this.opts.proxyServer } } : {}),
      // Sites such as x.com answer 403 to the headless signature; present as a regular Chrome.
      userAgent: chromeUserAgent(chromium.executablePath()),
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    for (const p of this.context.pages()) await this.registerPage(p);
    if (!this.active) await this.registerPage(await this.context.newPage());
    this.context.on("page", (p) => void this.registerPage(p));
  }

  private async registerPage(page: Page): Promise<void> {
    const entry: PageEntry = { id: `p${++this.pageSeq}`, page };
    this.pages.push(entry);
    this.active = entry; // new pages (popups) take focus, like a real browser
    page.on("dialog", (d) => {
      this.lastDialog = { type: d.type(), message: d.message() };
      void d.dismiss().catch(() => {});
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
        this.active = this.pages.at(-1);
        if (this.active) void this.attachScreencast(this.active.page);
      }
    });
    await this.attachScreencast(page);
  }

  private async attachScreencast(page: Page): Promise<void> {
    try {
      await page.screencast.start({
        size: this.screencast.size ?? { width: 1024, height: 640 },
        quality: this.screencast.quality ?? 60,
        onFrame: ({ data, viewportWidth, viewportHeight }) => {
          if (this.active?.page !== page) return;
          const now = Date.now();
          const fps = now - this.lastInputAt < 2000 ? this.activeFps : this.idleFps;
          if (now - this.lastFrameAt < 1000 / fps) return;
          this.lastFrameAt = now;
          for (const l of this.listeners) l({ width: viewportWidth, height: viewportHeight, jpeg: new Uint8Array(data) });
        },
      });
    } catch {
      // a page that closed while we were attaching; nothing to stream
    }
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
    const page = this.requirePage();
    return { url: page.url(), title: await page.title().catch(() => ""), viewport: page.viewportSize() ?? this.viewport };
  }

  async input(e: BrowserInputEvent): Promise<void> {
    const page = this.requirePage();
    this.lastInputAt = Date.now();
    switch (e.kind) {
      case "mousemove":
        return page.mouse.move(e.x, e.y);
      case "mousedown":
        return page.mouse.down({ button: e.button ?? "left" });
      case "mouseup":
        return page.mouse.up({ button: e.button ?? "left" });
      case "wheel":
        await page.mouse.move(e.x, e.y);
        return page.mouse.wheel(e.deltaX ?? 0, e.deltaY ?? 0);
      case "keydown":
        return page.keyboard.down(e.key);
      case "keyup":
        return page.keyboard.up(e.key);
      case "insert":
        return page.keyboard.insertText(e.text);
    }
  }

  async observe(input: BrowserObserveInput = {}): Promise<BrowserObservation> {
    const page = this.requirePage();
    this.revision++;
    const max = input.maxElements ?? 200;
    const { elements, scroll } = await this.walkFrames(page, max);
    const screenshot = input.screenshot === false ? undefined : (await page.screenshot({ type: "jpeg", quality: 50 })).toString("base64");
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
    const h = frame && !frame.isDetached() ? await frame.evaluateHandle(`(window[${JSON.stringify(this.registryKey)}]?.els.get(${JSON.stringify(ref)}) ?? null)`) : undefined;
    const el = h?.asElement();
    if (!el) throw new ProtocolError("STALE_OBSERVATION", `unknown element ref ${ref}; observe again`);
    return el;
  }

  async act(action: BrowserAction): Promise<BrowserActResult> {
    const page = this.requirePage();
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
        await entry.page.bringToFront();
        await this.attachScreencast(entry.page);
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
    const current = this.requirePage();
    return { url: current.url(), title: await current.title().catch(() => ""), activePageId: this.active!.id };
  }

  async wait(input: BrowserWaitInput): Promise<BrowserWaitResult> {
    const page = this.requirePage();
    const timeout = input.timeoutMs ?? 15_000;
    const done = async (matched: boolean, timedOut: boolean): Promise<BrowserWaitResult> => ({ matched, timedOut, url: page.url(), title: await page.title().catch(() => "") });
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
    return [...this.downloads];
  }

  async close(): Promise<void> {
    await this.context?.close();
    this.context = undefined;
    this.pages.length = 0;
    this.active = undefined;
  }

  private requirePage(): Page {
    if (!this.active) throw new ProtocolError("WORKER_UNAVAILABLE", "browser not started");
    return this.active.page;
  }
}
