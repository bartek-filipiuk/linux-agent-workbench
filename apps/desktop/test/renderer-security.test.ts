import { describe, expect, it } from "vitest";
import { isRendererUrl, isTrustedRenderer } from "../src/main/renderer-security.js";

describe("privileged renderer boundary", () => {
  const url = "file:///app/out/renderer/index.html";
  it("accepts only the app's current top frame and exact entry URL", () => {
    const mainFrame = { url };
    const contents = { mainFrame };
    expect(isTrustedRenderer({ sender: contents, senderFrame: mainFrame }, contents, url)).toBe(true);
    expect(isTrustedRenderer({ sender: {}, senderFrame: mainFrame }, contents, url)).toBe(false);
    expect(isTrustedRenderer({ sender: contents, senderFrame: { url } }, contents, url)).toBe(false);
    expect(isTrustedRenderer({ sender: contents, senderFrame: null }, contents, url)).toBe(false);
    mainFrame.url = "https://attacker.example/";
    expect(isTrustedRenderer({ sender: contents, senderFrame: mainFrame }, contents, url)).toBe(false);
  });
  it("rejects sibling files, changed dev origins, injected queries and blank frames", () => {
    for (const actual of ["file:///app/out/renderer/evil.html", url + "?untrusted=1", "https://example.com", "about:blank", ""]) expect(isRendererUrl(actual, url)).toBe(false);
    expect(isRendererUrl(url + "#settings", url)).toBe(true);
    expect(isRendererUrl("http://localhost:5173/", "http://localhost:5173")).toBe(true);
    expect(isRendererUrl("http://localhost:5174/", "http://localhost:5173/")).toBe(false);
  });
});
