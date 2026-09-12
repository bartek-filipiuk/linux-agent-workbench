import { expect, it, vi } from "vitest";
import fs from "node:fs";
import { BrowserSession } from "../src/browser-session.js";

it("quarantines stalled human input and drops queued clicks instead of executing them late", async () => {
  const profile = fs.mkdtempSync("/tmp/law-browser-stall-");
  const s = new BrowserSession({ profileDir: profile });
  let release!: () => void;
  try {
    await s.start();
    const apply = vi.spyOn(s as unknown as { applyInput(e: unknown): Promise<void> }, "applyInput")
      .mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const first = s.input({ kind: "mousemove", x: 1, y: 1 });
    const queued = s.input({ kind: "mousedown", x: 1, y: 1 });
    await first;
    await queued;
    expect(apply).toHaveBeenCalledTimes(1);
    expect((await s.info()).frameError).toMatch(/Restart browser/);
    await expect(s.act({ kind: "navigate", url: "https://example.com" })).rejects.toThrow(/unresponsive/);
    await expect(s.control({ kind: "refresh" })).rejects.toThrow(/unresponsive/);
    release();
    await s.input({ kind: "mouseup", x: 1, y: 1 });
    expect(apply).toHaveBeenCalledTimes(1);
  } finally { release?.(); await s.close(); fs.rmSync(profile, { recursive: true, force: true }); }
}, 15000);
