import { chromium, type BrowserContext, type Page } from "playwright";
import { normaliseNavigableUrl, type BrowserInfo, type BrowserInputEvent, type BrowserScreencastOptions } from "@law/protocol";

export type FrameListener = (frame: { width: number; height: number; jpeg: Uint8Array }) => void;

export type BrowserSessionOptions = {
  profileDir: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
  activeFps?: number;
  idleFps?: number;
};

export class BrowserSession {
  private context: BrowserContext | undefined;
  private page: Page | undefined;
  private readonly listeners = new Set<FrameListener>();
  private lastFrameAt = 0;
  private lastInputAt = 0;
  private readonly viewport: { width: number; height: number };
  private readonly activeFps: number;
  private readonly idleFps: number;

  constructor(private readonly opts: BrowserSessionOptions) {
    this.viewport = opts.viewport ?? { width: 1280, height: 800 };
    this.activeFps = opts.activeFps ?? 12;
    this.idleFps = opts.idleFps ?? 2;
  }

  async start(screencast: BrowserScreencastOptions = {}): Promise<void> {
    this.context = await chromium.launchPersistentContext(this.opts.profileDir, {
      headless: this.opts.headless ?? true,
      viewport: this.viewport,
    });
    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    this.context.on("page", (p) => {
      // ponytail: one visible page; popups replace the active page until multi-tab lands in B3
      this.page = p;
      void this.attachScreencast(p, screencast);
    });
    await this.attachScreencast(this.page, screencast);
  }

  private async attachScreencast(page: Page, screencast: BrowserScreencastOptions): Promise<void> {
    await page.screencast.start({
      size: screencast.size ?? { width: 1024, height: 640 },
      quality: screencast.quality ?? 60,
      onFrame: ({ data, viewportWidth, viewportHeight }) => {
        const now = Date.now();
        const fps = now - this.lastInputAt < 2000 ? this.activeFps : this.idleFps;
        if (now - this.lastFrameAt < 1000 / fps) return;
        this.lastFrameAt = now;
        for (const l of this.listeners) l({ width: viewportWidth, height: viewportHeight, jpeg: new Uint8Array(data) });
      },
    });
  }

  onFrame(cb: FrameListener): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }

  async navigate(url: string): Promise<BrowserInfo> {
    const target = normaliseNavigableUrl(url);
    if (!target) throw new Error("only http and https URLs can be opened");
    await this.requirePage().goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
    this.lastInputAt = Date.now();
    return this.info();
  }

  async info(): Promise<BrowserInfo> {
    const page = this.requirePage();
    return { url: page.url(), title: await page.title(), viewport: page.viewportSize() ?? this.viewport };
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

  async close(): Promise<void> {
    await this.context?.close();
    this.context = undefined;
    this.page = undefined;
  }

  private requirePage(): Page {
    if (!this.page) throw new Error("browser not started");
    return this.page;
  }
}
