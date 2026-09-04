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
