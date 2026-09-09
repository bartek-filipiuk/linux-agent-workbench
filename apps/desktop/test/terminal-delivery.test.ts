import { expect, it, vi } from "vitest";
import { TerminalDelivery } from "../src/main/terminal-delivery";
it("fails explicitly at the memory limit instead of dropping part of a terminal stream", () => {
  let failures = 0, sent = 0;
  const d = new TerminalDelivery(() => sent++, () => {}, () => failures++);
  d.push(new Uint8Array(4 * 1024 * 1024));
  d.push(new Uint8Array(1));
  d.setReady(true);
  expect(failures).toBe(1);
  expect(sent).toBe(0);
});

it("batches a burst of small TUI updates without changing their byte order", () => {
  const sent: Array<{ id: number; data: Uint8Array }> = [];
  const credits: number[] = [];
  const d = new TerminalDelivery(c => sent.push(c), n => credits.push(n));
  d.setReady(true);
  for (let i = 0; i < 4000; i++) d.push(new Uint8Array([i % 256]));
  expect(sent).toHaveLength(1);
  d.acknowledge(sent[0]!.id);
  expect(sent).toHaveLength(2);
  expect([...sent[1]!.data]).toEqual(Array.from({ length: 3999 }, (_, i) => (i + 1) % 256));
  d.acknowledge(sent[1]!.id);
  expect(credits.reduce((a, b) => a + b, 0)).toBe(4000);
});

it("detects a lost renderer ack and resyncs with bounded credit and no stale acknowledgments", () => {
  vi.useFakeTimers();
  try {
    const sent: Array<{ id: number; data: Uint8Array }> = [], credits: number[] = [], stalled: boolean[] = [];
    const d = new TerminalDelivery(c => sent.push(c), n => credits.push(n), () => {}, s => stalled.push(s));
    d.setReady(true); d.push(new Uint8Array(300000));
    vi.advanceTimersByTime(5000);
    expect(d.stalled).toBe(true); expect(stalled).toEqual([true]);
    expect(credits).toEqual([]); // Keep backpressure until an explicit recovery.
    d.reset();
    expect(credits.every(n => n > 0 && n <= 65536)).toBe(true);
    expect(credits.reduce((a, b) => a + b, 0)).toBe(300000);
    expect(stalled).toEqual([true, false]);
    d.push(new Uint8Array([42]));
    d.acknowledge(sent[0]!.id);
    expect(credits.reduce((a, b) => a + b, 0)).toBe(300000);
    d.acknowledge(sent[1]!.id);
    vi.advanceTimersByTime(10000);
    expect(d.stalled).toBe(false);
    expect(credits.reduce((a, b) => a + b, 0)).toBe(300001);
  } finally { vi.useRealTimers(); }
});
it("sends one chunk at a time and returns credit only for its matching ack", () => {
  const sent: Array<{ id: number; data: Uint8Array }> = [], credits: number[] = [];
  const delivery = new TerminalDelivery(c => sent.push(c), n => credits.push(n));
  delivery.push(new Uint8Array(130000));
  expect(sent).toHaveLength(0);
  delivery.setReady(true);
  expect(sent).toHaveLength(1);
  expect(sent[0]!.data.length).toBe(65536);
  delivery.acknowledge(99);
  expect(credits).toEqual([]);
  delivery.acknowledge(sent[0]!.id);
  expect(sent).toHaveLength(2);
  expect(credits).toEqual([65536]);
  delivery.acknowledge(sent[0]!.id);
  expect(credits).toEqual([65536]);
  delivery.acknowledge(sent[1]!.id);
  expect(credits.reduce((a,b)=>a+b,0)).toBe(130000);
});
it("replays an unacknowledged chunk after renderer reload and ignores stale ack", () => {
  const sent: Array<{ id: number; data: Uint8Array }> = [], credits: number[] = [];
  const d = new TerminalDelivery(c => sent.push(c), n => credits.push(n));
  d.setReady(true); d.push(new Uint8Array([1,2,3]));
  d.setReady(false); d.setReady(true);
  expect(sent[1]!.data).toEqual(sent[0]!.data);
  d.acknowledge(sent[0]!.id);
  expect(credits).toEqual([]);
  d.acknowledge(sent[1]!.id);
  expect(credits).toEqual([3]);
});
