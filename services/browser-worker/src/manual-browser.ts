import { spawn, execFile, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import type { BrowserInputEvent } from "@law/protocol";

// The pipe is a parent-liveness signal. Even a SIGKILL of the worker closes it,
// so the watchdog shuts down the entire owned process group before a restart.
const WATCHDOG = `
import os, signal, subprocess, sys, threading, time
closed = threading.Event()
signal.signal(signal.SIGTERM, lambda *_: closed.set())
signal.signal(signal.SIGINT, lambda *_: closed.set())
def watch():
    sys.stdin.buffer.read()
    closed.set()
threading.Thread(target=watch, daemon=True).start()
p = subprocess.Popen(sys.argv[1:], stdin=subprocess.DEVNULL)
while p.poll() is None and not closed.wait(.1): pass
signal.signal(signal.SIGTERM, signal.SIG_IGN)
os.killpg(os.getpgrp(), signal.SIGTERM)
try: p.wait(timeout=4)
except subprocess.TimeoutExpired: pass
os.killpg(os.getpgrp(), signal.SIGKILL)
`;

export type ManualBrowserOptions = {
  executablePath: string; profileDir: string; url: string; proxyServer?: string;
  viewport: { width: number; height: number };
  onFrame: (jpeg: Uint8Array) => void;
  onError: (message: string) => void;
};

/** A standalone browser with no Playwright/CDP connection. Only pixels and human input cross this boundary. */
export class ManualBrowser {
  private processes: ChildProcess[] = [];
  private capture: ChildProcess | undefined;
  private browser: ChildProcess | undefined;
  private finishing = false;
  private display = "";
  private closed = false;
  private captureTransition = Promise.resolve();
  constructor(private readonly opts: ManualBrowserOptions) {}

  private launch(command: string, args: string[], display = this.display): ChildProcess {
    const p = spawn("python3", ["-u", "-c", WATCHDOG, command, ...args], {
      detached: true, env: { ...process.env, DISPLAY: display }, stdio: ["pipe", "pipe", "ignore"],
    });
    p.stdin!.on("error", () => {});
    p.on("error", () => { if (!this.closed) this.opts.onError("Manual browser process could not start. Close and reopen the browser."); });
    this.processes.push(p);
    return p;
  }

  async start(): Promise<void> {
    const { width, height } = this.opts.viewport;
    const x = this.launch("Xvfb", ["-displayfd", "1", "-screen", "0", `${width}x${height}x24`, "-nolisten", "tcp", "-ac"]);
    this.display = await new Promise<string>((resolve, reject) => {
      let text = "";
      const timer = setTimeout(() => { cleanup(); reject(new Error("Manual display did not start")); }, 8000);
      const cleanup = () => { clearTimeout(timer); x.stdout!.off("data", data); x.off("exit", failed); x.off("error", failed); };
      const failed = () => { cleanup(); reject(new Error("Manual display unavailable; install the updated browser image")); };
      const data = (b: Buffer) => { text += b.toString(); if (/^\d+\n/.test(text)) { cleanup(); resolve(`:${text.trim()}`); } };
      x.stdout!.on("data", data); x.once("exit", failed); x.once("error", failed);
    });
    this.launch("openbox", ["--sm-disable"]);
    const browser = this.launch(this.opts.executablePath, [
      `--user-data-dir=${this.opts.profileDir}`, "--no-sandbox", "--disable-dev-shm-usage",
      "--no-first-run", "--no-default-browser-check", "--password-store=basic", "--disable-background-mode",
      `--window-size=${width},${height}`, "--start-maximized", "--restore-last-session",
      ...(this.opts.proxyServer ? [`--proxy-server=${this.opts.proxyServer}`, "--proxy-bypass-list=<-loopback>"] : []),
      this.opts.url,
    ]);
    this.browser = browser;
    browser.once("exit", () => { if (!this.closed && !this.finishing) this.opts.onError("Manual browser closed. Choose Finish manual login to return to the agent browser."); });
    await sleep(800);
    if (browser.exitCode !== null || browser.signalCode !== null) throw new Error("Manual browser failed to open the saved profile");
  }

  setFramesEnabled(enabled: boolean): Promise<void> {
    const next = this.captureTransition.then(async () => {
      if (this.capture) { const p = this.capture; this.capture = undefined; await this.stopProcess(p); }
      if (!enabled || this.closed) return;
      const { width, height } = this.opts.viewport;
      const p = this.launch("ffmpeg", ["-nostdin", "-loglevel", "error", "-f", "x11grab", "-draw_mouse", "1", "-video_size", `${width}x${height}`, "-framerate", "6", "-i", this.display, "-f", "image2pipe", "-vcodec", "mjpeg", "-threads", "1", "-q:v", "5", "pipe:1"]);
      this.capture = p;
      let pending = Buffer.alloc(0);
      p.stdout!.on("data", (chunk: Buffer) => {
        if (this.capture !== p || this.closed) return;
        pending = Buffer.concat([pending, chunk]);
        if (pending.length > 8 * 1024 * 1024) { pending = Buffer.alloc(0); this.opts.onError("Manual preview exceeded its frame limit. Refresh the preview."); return; }
        for (;;) {
          const start = pending.indexOf(Buffer.from([0xff, 0xd8]));
          const end = start >= 0 ? pending.indexOf(Buffer.from([0xff, 0xd9]), start + 2) : -1;
          if (end < 0) break;
          this.opts.onFrame(pending.subarray(start, end + 2)); pending = pending.subarray(end + 2);
        }
      });
      p.once("exit", () => { if (this.capture === p && !this.closed) { this.capture = undefined; this.opts.onError("Manual preview stopped. Refresh the preview to reconnect."); } });
    });
    this.captureTransition = next.catch(() => {}); return next;
  }

  async input(event: BrowserInputEvent): Promise<void> {
    if (this.closed) return;
    const button = (b?: string) => b === "middle" ? "2" : b === "right" ? "3" : "1";
    let args: string[]; let text: string | undefined;
    switch (event.kind) {
      case "mousemove": args = ["mousemove", String(event.x), String(event.y)]; break;
      case "mousedown": case "mouseup": args = ["mousemove", String(event.x), String(event.y), event.kind, button(event.button)]; break;
      case "wheel": {
        args = ["mousemove", String(event.x), String(event.y)];
        for (const [delta, negative, positive] of [[event.deltaY ?? 0, 4, 5], [event.deltaX ?? 0, 6, 7]]) {
          if (delta) args.push("click", "--repeat", String(Math.min(12, Math.max(1, Math.ceil(Math.abs(delta!) / 100)))), "--delay", "10", String(delta! < 0 ? negative : positive));
        }
        break;
      }
      case "insert": args = ["type", "--clearmodifiers", "--delay", "0", "--file", "-"]; text = event.text; break;
      case "keydown": case "keyup": {
        const keys: Record<string, string> = { Enter: "Return", Backspace: "BackSpace", Control: "Control_L", Shift: "Shift_L", Alt: "Alt_L", Meta: "Super_L", ArrowLeft: "Left", ArrowRight: "Right", ArrowUp: "Up", ArrowDown: "Down", Space: "space", PageUp: "Prior", PageDown: "Next" };
        const key = keys[event.key] ?? (/^[a-zA-Z0-9]+$/.test(event.key) ? event.key : `U${event.key.codePointAt(0)!.toString(16)}`);
        args = [event.kind, key]; break;
      }
    }
    await new Promise<void>((resolve, reject) => {
      const p = spawn("xdotool", args, { env: { ...process.env, DISPLAY: this.display }, stdio: ["pipe", "ignore", "ignore"] });
      const timer = setTimeout(() => { p.kill("SIGKILL"); }, 5000);
      p.stdin.on("error", () => {});
      // Pasted credentials never enter process arguments or diagnostic logs.
      p.stdin.end(text);
      p.once("error", () => { clearTimeout(timer); reject(new Error("Manual input unavailable")); });
      p.once("exit", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error("Manual input failed")); });
    });
  }

  private async stopProcess(p: ChildProcess): Promise<void> {
    if (p.exitCode !== null || p.signalCode !== null) return;
    p.stdin?.end();
    await Promise.race([new Promise<void>(resolve => p.once("exit", () => resolve())), sleep(5000)]);
    if (p.pid) { try { process.kill(-p.pid, "SIGKILL"); } catch {} }
  }
  async finish(): Promise<void> {
    const p = this.browser;
    if (p && p.exitCode === null && p.signalCode === null) {
      this.finishing = true;
      try {
        // WM close requests let Chromium flush cookies/preferences; SIGTERM can lose recent logins.
        // Alt+F4 is handled by our private Openbox display, including OAuth popup windows.
        for (let attempt = 0; attempt < 10 && p.exitCode === null && p.signalCode === null; attempt++) {
          await new Promise<void>((resolve, reject) => execFile("xdotool", ["key", "--clearmodifiers", "alt+F4"], { env: { ...process.env, DISPLAY: this.display }, timeout: 5000 }, error => error ? reject(new Error("Could not close the manual browser")) : resolve()));
          await new Promise<void>(resolve => {
            const done = () => { clearTimeout(timer); p.off("exit", done); resolve(); };
            const timer = setTimeout(done, 500); p.once("exit", done);
          });
        }
        if (p.exitCode === null && p.signalCode === null) throw new Error("Close the browser's confirmation dialog or download prompt, then choose Finish manual login again");
      } finally { this.finishing = false; }
    }
    await this.close();
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.setFramesEnabled(false);
    // Browser before display: Chromium must flush the shared profile before automation can reopen it.
    for (const p of [...this.processes].reverse()) await this.stopProcess(p);
    this.processes = [];
  }
}
