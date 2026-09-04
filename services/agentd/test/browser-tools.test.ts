import { describe, expect, it } from "vitest";
import { ProtocolError } from "@law/protocol";
import { BROWSER_TOOLS, browserExecutor } from "../src/tools/browser-tools.js";

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
  it("lists four tools with schemas mentioning the action kinds", () => {
    expect(BROWSER_TOOLS.map((t) => t.name)).toEqual(["browser_observe", "browser_act", "browser_wait", "browser_downloads"]);
    expect(JSON.stringify(BROWSER_TOOLS[1]!.parameters)).toContain("switchPage");
  });
  it("keeps the screenshot out of the text and returns it as an image", async () => {
    const { b } = fakeBrowser();
    const ex = browserExecutor(b as never);
    const r = await ex.execute({ callId: "1", name: "browser_observe", args: { screenshot: true } }, sig);
    expect(r.imageJpegBase64).toBe("QUJD");
    expect(r.output).not.toContain("QUJD");
    expect(JSON.parse(r.output)).toMatchObject({ revision: 3, url: "https://x/" });
    const plain = await ex.execute({ callId: "2", name: "browser_observe", args: {} }, sig);
    expect(plain.imageJpegBase64).toBeUndefined();
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
