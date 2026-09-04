import { describe, expect, it } from "vitest";
import { Notifier, parseReply } from "../src/notify/notifier.js";

type Sent = { url: string; init: RequestInit };

function fakeFetch(sent: Sent[], streamLines: string[] = [], status = 200) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    sent.push({ url, init: init ?? {} });
    if (init?.method === "POST") return new Response("", { status });
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const l of streamLines) c.enqueue(new TextEncoder().encode(`${l}\n`));
        c.close();
      },
    });
    return new Response(body, { status });
  };
}

describe("parseReply", () => {
  it("accepts decision + approval id, rejects anything else", () => {
    expect(parseReply("session 0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f")).toEqual({ decision: "session", id: "0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f" });
    expect(parseReply("  DENY 0F6D2D7E-4C3E-4A1B-9C0E-1A2B3C4D5E6F ")).toMatchObject({ decision: "deny" });
    expect(parseReply("allow 0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f")).toBeUndefined();
    expect(parseReply("once 123")).toBeUndefined();
  });
});

describe("Notifier", () => {
  const cfg = { url: "https://ntfy.example/out-topic", replyUrl: "https://ntfy.example/in-topic", token: "tk_secret" };

  it("publishes with title, priority, bearer token and phone actions for approvals", async () => {
    const sent: Sent[] = [];
    const n = new Notifier(cfg, { onReply: () => undefined, fetch: fakeFetch(sent) });
    await n.publish({ title: "Approval: push", body: "git push origin main", priority: "high", tags: ["lock"], approvalId: "0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f" });
    expect(sent[0]!.url).toBe(cfg.url);
    const h = sent[0]!.init.headers as Record<string, string>;
    expect(h).toMatchObject({ Title: "Approval: push", Priority: "high", Tags: "lock", Authorization: "Bearer tk_secret" });
    expect(h.Actions).toContain("http, Allow once, https://ntfy.example/in-topic, method=POST, body=once 0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f");
    expect(h.Actions).toContain("body=deny 0f6d2d7e");
    expect(sent[0]!.init.body).toBe("git push origin main");
    await n.publish({ title: "Run completed", body: "done" });
    expect((sent[1]!.init.headers as Record<string, string>).Actions).toBeUndefined();
  });

  it("swallows publish failures and logs them at most once a minute", async () => {
    const sent: Sent[] = [];
    const logs: string[] = [];
    let now = 1_000_000;
    const n = new Notifier(cfg, { onReply: () => undefined, fetch: fakeFetch(sent, [], 500), log: (l) => logs.push(l), now: () => now });
    await n.publish({ title: "a", body: "b" });
    await n.publish({ title: "a", body: "b" });
    expect(logs).toHaveLength(1);
    now += 61_000;
    await n.publish({ title: "a", body: "b" });
    expect(logs).toHaveLength(2);
  });

  it("applies decisions from the reply stream and ignores junk", async () => {
    const sent: Sent[] = [];
    const replies: string[] = [];
    const logs: string[] = [];
    const lines = [
      JSON.stringify({ event: "open" }),
      JSON.stringify({ event: "message", message: "once 0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f" }),
      "not json",
      JSON.stringify({ event: "message", message: "make me a sandwich" }),
      JSON.stringify({ event: "message", message: "deny 1f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f" }),
    ];
    const n = new Notifier(cfg, { onReply: (d, id) => replies.push(`${d}:${id}`), fetch: fakeFetch(sent, lines), log: (l) => logs.push(l) });
    n.start();
    await new Promise((r) => setTimeout(r, 50));
    n.stop();
    expect(sent[0]!.url).toMatch(/^https:\/\/ntfy\.example\/in-topic\/json\?since=\d+$/);
    expect(replies).toEqual(["once:0f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f", "deny:1f6d2d7e-4c3e-4a1b-9c0e-1a2b3c4d5e6f"]);
    expect(logs.some((l) => l.includes("ignored reply"))).toBe(true);
  });
});
