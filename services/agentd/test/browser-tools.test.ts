import { describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { BROWSER_TOOLS, browserExecutor, formatBrowserObservation } from "../src/tools/browser-tools.js";

function fakeBrowser(state: "ready" | "stopped" = "ready") {
  const calls: string[] = [];
  const obs = { revision: 3, activePageId: "p1", url: "https://x/", title: "X", viewport: { width: 10, height: 10 }, scroll: { x: 0, y: 0, maxY: 0 }, elements: [], pages: [{ id: "p1", url: "https://x/", title: "X" }] };
  const b = {
    status: { state },
    start: async () => { calls.push("start"); b.status = { state: "ready" as const }; return { state: "ready" as const }; },
    observe: async (i: { screenshot?: boolean }) => { calls.push("observe"); return { ...obs, ...(i.screenshot ? { screenshotJpegBase64: "QUJD" } : {}) }; },
    act: async (a: { kind: string }) => { calls.push(`act:${a.kind}`); return { url: "https://x/2", title: "X2", activePageId: "p1" }; },
    wait: async () => { calls.push("wait"); return { matched: true, timedOut: false, url: "https://x/", title: "X" }; },
    downloads: async () => { calls.push("downloads"); return []; },
  };
  return { b, calls };
}
const sig = new AbortController().signal;

describe("browser tools", () => {
  it("lists browser tools with schemas mentioning the action kinds", () => {
    expect(BROWSER_TOOLS.map((t) => t.name)).toEqual(["browser_observe", "browser_act", "browser_wait", "browser_read", "browser_save", "browser_downloads"]);
    expect(JSON.stringify(BROWSER_TOOLS[1]!.parameters)).toContain("switchPage");
  });
  it("keeps the screenshot out of the text and returns it as an image", async () => {
    const { b } = fakeBrowser();
    const ex = browserExecutor(b as never);
    const r = await ex.execute({ callId: "1", name: "browser_observe", args: { screenshot: true } }, sig);
    expect(r.imageJpegBase64).toBe("QUJD");
    expect(r.output).not.toContain("QUJD");
    expect(r.output).toContain("revision 3");
    expect(r.output).toContain("url https://x/");
    const plain = await ex.execute({ callId: "2", name: "browser_observe", args: {} }, sig);
    expect(plain.imageJpegBase64).toBeUndefined();
  });
  it("formats elements one per line, with bounds only next to a screenshot", () => {
    const el = { enabled: true, editable: false, inViewport: true, bounds: { x: 10, y: 20, width: 30, height: 40 } };
    const obs = {
      revision: 9, activePageId: "p1", url: "https://d/", title: "D", viewport: { width: 1280, height: 800 }, scroll: { x: 0, y: 100, maxY: 900 },
      pages: [{ id: "p1", url: "https://d/", title: "D" }, { id: "p2", url: "https://d/popup", title: "Popup" }],
      lastDialog: { type: "alert", message: "hi" },
      elements: [
        { ...el, ref: "e1", role: "link", name: "Meet us! - Droptica", text: "Meet us! - Droptica", href: "https://www.droptica.com/company/team" },
        { ...el, ref: "e2", role: "textbox", name: "q", text: "", value: "Droptica", editable: true },
        { ...el, ref: "e3", role: "button", name: "Next", inViewport: false, enabled: false },
        { ...el, ref: "e4", role: "heading", name: "Title", text: "Different text" },
      ],
    };
    const out = formatBrowserObservation(obs, { hints: ["captcha: x"] });
    expect(out).toContain('e1 link "Meet us! - Droptica" → https://www.droptica.com/company/team');
    expect(out).toContain('e2 textbox "q" = "Droptica"');
    expect(out).toContain('e3 button "Next" [disabled] [off]');
    expect(out).toContain('e4 heading "Title" — Different text');
    expect(out).toContain("pages: p1* \"D\"");
    expect(out).toContain('dialog (auto-dismissed): alert "hi"');
    expect(out).toContain("hints: captcha: x");
    expect(out).not.toContain("@10,20");
    expect(out).not.toMatch(/enabled|inViewport|bounds/);
    expect(formatBrowserObservation(obs, { bounds: true })).toContain("@10,20 30x40");
    expect(out.length).toBeLessThan(JSON.stringify(obs).length / 2);
  });
  it("starts the browser lazily and validates actions", async () => {
    const { b, calls } = fakeBrowser("stopped");
    const ex = browserExecutor(b as never);
    const r = await ex.execute({ callId: "1", name: "browser_act", args: { action: { kind: "navigate", url: "https://x/2" } } }, sig);
    expect(calls).toEqual(["start", "act:navigate"]);
    expect(JSON.parse(r.output)).toMatchObject({ url: "https://x/2" });
    await expect(ex.execute({ callId: "2", name: "browser_act", args: { action: { kind: "click", ref: "nope" } } }, sig)).rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
    await expect(ex.execute({ callId: "3", name: "browser_nope", args: {} }, sig)).rejects.toSatisfy((e) => ProtocolError.is(e, "INVALID_INPUT"));
  });
});
