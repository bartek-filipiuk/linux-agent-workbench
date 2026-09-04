import { describe, expect, it } from "vitest";
import { BrowserInputEvent, decodeBrowserFrame, encodeBrowserFrame, normaliseNavigableUrl } from "../src/browser.js";

describe("browser protocol", () => {
  it("round-trips a frame header", () => {
    const f = decodeBrowserFrame(encodeBrowserFrame(1024, 640, new Uint8Array([0xff, 0xd8])));
    expect(f).toMatchObject({ width: 1024, height: 640 });
    expect(Array.from(f.jpeg)).toEqual([0xff, 0xd8]);
    expect(() => decodeBrowserFrame(new Uint8Array(2))).toThrow(RangeError);
  });
  it("normalises navigable urls and rejects other schemes", () => {
    expect(normaliseNavigableUrl("example.com")).toBe("https://example.com/");
    expect(normaliseNavigableUrl("http://x.test/a?b=1")).toBe("http://x.test/a?b=1");
    expect(normaliseNavigableUrl("file:///etc/passwd")).toBeNull();
    expect(normaliseNavigableUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseNavigableUrl("data:text/html,hi")).toBeNull();
    expect(normaliseNavigableUrl("not a url at all")).toBeNull();
  });
  it("validates input events", () => {
    expect(BrowserInputEvent.safeParse({ kind: "mousedown", x: 10, y: 20 }).success).toBe(true);
    expect(BrowserInputEvent.safeParse({ kind: "keydown", key: "Enter" }).success).toBe(true);
    expect(BrowserInputEvent.safeParse({ kind: "keydown", key: "" }).success).toBe(false);
    expect(BrowserInputEvent.safeParse({ kind: "teleport", x: 1 }).success).toBe(false);
  });
});

import { BrowserAction, BrowserObservation } from "../src/browser.js";
import { ErrorCode } from "../src/errors.js";

describe("browser actions and observation", () => {
  it("accepts every action kind and rejects malformed refs", () => {
    const ok = [
      { kind: "navigate", url: "https://x" },
      { kind: "click", ref: "e3", revision: 2 },
      { kind: "type", ref: "e1", revision: 2, text: "hi", submit: true },
      { kind: "press", key: "Enter" },
      { kind: "select", ref: "e2", revision: 2, values: ["b"] },
      { kind: "mouse", x: 1, y: 2, action: "wheel", deltaY: 100 },
      { kind: "switchPage", pageId: "p2" },
      { kind: "closePage", pageId: "p2" },
      { kind: "wait", ms: 500 },
    ];
    for (const a of ok) expect(BrowserAction.safeParse(a).success, JSON.stringify(a)).toBe(true);
    expect(BrowserAction.safeParse({ kind: "click", ref: "3", revision: 2 }).success).toBe(false);
    expect(BrowserAction.safeParse({ kind: "click", ref: "e3" }).success).toBe(false);
    expect(BrowserAction.safeParse({ kind: "wait", ms: 60_000 }).success).toBe(false);
  });
  it("has STALE_OBSERVATION and validates an observation", () => {
    expect(ErrorCode.options).toContain("STALE_OBSERVATION");
    const obs = { revision: 1, activePageId: "p1", url: "https://x", title: "t", viewport: { width: 1280, height: 800 }, scroll: { x: 0, y: 0, maxY: 0 }, elements: [], pages: [{ id: "p1", url: "https://x", title: "t" }] };
    expect(BrowserObservation.safeParse(obs).success).toBe(true);
  });
});
