import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrowserSession } from "../src/browser-session.js";

const fixture = `data:text/html,${encodeURIComponent(`<!doctype html><title>start</title>
<button id="b" onclick="document.title='clicked'" style="position:absolute;left:100px;top:100px;width:80px;height:40px">go</button>
<input id="i" style="position:absolute;left:100px;top:200px" oninput="document.title='typed:'+this.value">`)}`;

let s: BrowserSession;
beforeAll(async () => {
  s = new BrowserSession({ profileDir: fs.mkdtempSync(path.join(os.tmpdir(), "law-bw-")), viewport: { width: 640, height: 400 }, activeFps: 30, idleFps: 30 });
  await s.start({ size: { width: 320, height: 200 } });
}, 60_000);
afterAll(async () => {
  await s.close();
});
const until = async (pred: () => Promise<boolean> | boolean, ms = 10_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await pred()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("condition not met in time");
};

describe("BrowserSession", { timeout: 30_000 }, () => {
  it("streams frames with the viewport size", async () => {
    const frames: Array<{ width: number; height: number; jpeg: Uint8Array }> = [];
    const off = s.onFrame((f) => frames.push(f));
    // A data: URL is not navigable through navigate(); load the fixture through the page directly for the test.
    await (s as unknown as { page: { goto(u: string): Promise<unknown> } }).page.goto(fixture);
    await until(() => frames.length > 0);
    off();
    expect(frames[0]).toMatchObject({ width: 640, height: 400 });
    expect(frames[0]!.jpeg[0]).toBe(0xff);
    expect((await s.info()).title).toBe("start");
  });

  it("clicks and types through input events", async () => {
    await s.input({ kind: "mousemove", x: 140, y: 120 });
    await s.input({ kind: "mousedown", x: 140, y: 120 });
    await s.input({ kind: "mouseup", x: 140, y: 120 });
    await until(async () => (await s.info()).title === "clicked");
    await s.input({ kind: "mousemove", x: 150, y: 210 });
    await s.input({ kind: "mousedown", x: 150, y: 210 });
    await s.input({ kind: "mouseup", x: 150, y: 210 });
    await s.input({ kind: "keydown", key: "h" });
    await s.input({ kind: "keyup", key: "h" });
    await s.input({ kind: "insert", text: "ey" });
    await until(async () => (await s.info()).title === "typed:hey");
  });

  it("refuses non-http navigation", async () => {
    await expect(s.navigate("file:///etc/passwd")).rejects.toThrow(/http/);
    await expect(s.navigate("javascript:alert(1)")).rejects.toThrow(/http/);
  });
});
