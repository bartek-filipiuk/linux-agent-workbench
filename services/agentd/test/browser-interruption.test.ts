import { expect, it, vi } from "vitest";
import { BrowserSessionManager } from "../src/session/browser-session-manager.js";

it("keeps tracking a browser action after caller cancellation before allowing follow-up work", async () => {
  const manager = new BrowserSessionManager({ socketDir: "/tmp/unused", launcher: async () => { throw new Error("unused"); } });
  let complete!: (payload: unknown) => void;
  const request = vi.fn(() => new Promise(resolve => { complete = resolve; }));
  Object.assign(manager, { conn: { request } });
  const abort = new AbortController();
  const action = manager.act({ kind: "navigate", url: "https://example.com" }, abort.signal);
  const rejected = expect(action).rejects.toMatchObject({ code: "CANCELLED" });
  abort.abort(); await rejected;
  let settled = false;
  const wait = manager.settleActions().then(() => { settled = true; });
  await Promise.resolve();
  expect(settled).toBe(false);
  complete({ url: "https://example.com", title: "Example", activePageId: "p1" });
  await wait;
  expect(settled).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  expect(manager.lastObservation).toBeUndefined();
});
