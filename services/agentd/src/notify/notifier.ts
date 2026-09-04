// Pushes what needs a human to an ntfy topic and takes decisions back from a second topic, so an
// approval can be answered from a phone. Topic names are the secret: anyone who knows them reads
// the summaries and can answer; decisions are accepted only for approval ids that are pending.
import type { ApprovalDecision } from "@law/protocol";

export type NotifyConfig = { url: string; replyUrl?: string; token?: string };
export type Notification = { title: string; body: string; priority?: "high" | "default" | "low"; tags?: string[]; approvalId?: string };
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const REPLY = /^(once|session|deny)\s+([0-9a-f-]{36})$/i;

export function parseReply(text: string): { decision: ApprovalDecision; id: string } | undefined {
  const m = REPLY.exec(text.trim());
  return m ? { decision: m[1]!.toLowerCase() as ApprovalDecision, id: m[2]!.toLowerCase() } : undefined;
}

export class Notifier {
  private stopped = false;
  private lastErrorAt = 0;
  private readonly fetchImpl: FetchLike;
  private abort: AbortController | undefined;

  constructor(
    private readonly cfg: NotifyConfig,
    private readonly deps: { onReply: (decision: ApprovalDecision, id: string) => void; fetch?: FetchLike; log?: (line: string) => void; now?: () => number },
  ) {
    this.fetchImpl = deps.fetch ?? ((input, init) => fetch(input, init));
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}), ...extra };
  }

  /** Never throws: a notification that cannot be sent is logged at most once a minute. */
  async publish(n: Notification): Promise<void> {
    const headers: Record<string, string> = { Title: n.title, Priority: n.priority ?? "default" };
    if (n.tags?.length) headers.Tags = n.tags.join(",");
    if (n.approvalId && this.cfg.replyUrl) {
      const act = (label: string, decision: string) => `http, ${label}, ${this.cfg.replyUrl}, method=POST, body=${decision} ${n.approvalId}`;
      headers.Actions = [act("Allow once", "once"), act("Allow for run", "session"), act("Deny", "deny")].join("; ");
    }
    try {
      const res = await this.fetchImpl(this.cfg.url, { method: "POST", headers: this.headers(headers), body: n.body });
      if (!res.ok) throw new Error(`ntfy answered ${res.status}`);
    } catch (e) {
      const now = (this.deps.now ?? Date.now)();
      if (now - this.lastErrorAt > 60_000) {
        this.lastErrorAt = now;
        this.deps.log?.(`notify failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  /** Streams the reply topic and applies "once|session|deny <approvalId>" lines; reconnects with backoff until stop(). */
  start(): void {
    if (!this.cfg.replyUrl) return;
    const since = Math.floor((this.deps.now ?? Date.now)() / 1000);
    void this.loop(`${this.cfg.replyUrl}/json?since=${since}`);
  }

  private async loop(url: string): Promise<void> {
    let backoff = 1000;
    while (!this.stopped) {
      this.abort = new AbortController();
      try {
        const res = await this.fetchImpl(url, { headers: this.headers(), signal: this.abort.signal });
        if (!res.ok || !res.body) throw new Error(`ntfy answered ${res.status}`);
        backoff = 1000;
        await this.consume(res.body);
      } catch (e) {
        if (this.stopped) return;
        this.deps.log?.(`notify reply stream: ${e instanceof Error ? e.message : String(e)}; retry in ${backoff / 1000}s`);
      }
      if (this.stopped) return;
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 30_000);
    }
  }

  private async consume(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        this.handleLine(line);
      }
    }
  }

  handleLine(line: string): void {
    let ev: { event?: string; message?: string };
    try {
      ev = JSON.parse(line) as { event?: string; message?: string };
    } catch {
      return;
    }
    if (ev.event !== "message" || !ev.message) return;
    const reply = parseReply(ev.message);
    if (!reply) return this.deps.log?.(`notify: ignored reply "${ev.message.slice(0, 60)}"`);
    this.deps.onReply(reply.decision, reply.id);
  }

  stop(): void {
    this.stopped = true;
    this.abort?.abort();
  }
}
