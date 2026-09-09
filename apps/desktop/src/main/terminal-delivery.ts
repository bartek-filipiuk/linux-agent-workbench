/** At most one chunk is in Electron IPC. Credit returns only after xterm parses it. */
export class TerminalDelivery {
  private queue: Uint8Array[] = [];
  private pending: { id: number; data: Uint8Array } | undefined;
  private sequence = 0;
  private ready = false;
  private bytes = 0;
  private failed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private _stalled = false;
  get stalled(): boolean { return this._stalled; }
  constructor(private send: (chunk: { id: number; data: Uint8Array }) => void, private consumed: (bytes: number) => void, private overflow: () => void = () => {}, private onStall: (stalled: boolean) => void = () => {}) {}
  private clearStall(): void {
    clearTimeout(this.timer); this.timer = undefined;
    if (this._stalled) { this._stalled = false; this.onStall(false); }
  }
  /** Explicit display resync: discard the old display stream, return its credit, then request a tmux repaint. */
  reset(): void {
    const bytes = this.bytes;
    this.queue = []; this.pending = undefined; this.bytes = 0; this.failed = false;
    this.clearStall();
    for (let left = bytes; left > 0; left -= 65536) this.consumed(Math.min(left, 65536));
  }
  push(data: Uint8Array): void {
    if (this.failed) return;
    if (this.bytes + data.length > 4 * 1024 * 1024) {
      this.failed = true;
      this.clearStall();
      this.queue = []; this.pending = undefined; this.bytes = 0;
      this.overflow();
      return;
    }
    this.bytes += data.length;
    for (let i = 0; i < data.length; i += 65536) this.queue.push(data.slice(i, i + 65536));
    this.flush();
  }
  setReady(ready: boolean): void {
    this.ready = ready;
    if (!ready) this.clearStall();
    if (!ready) this.failed = false;
    if (!ready && this.pending) { this.queue.unshift(this.pending.data); this.pending = undefined; }
    this.flush();
  }
  acknowledge(id: number): void {
    if (this.pending?.id !== id) return;
    this.clearStall();
    this.bytes -= this.pending.data.length;
    this.consumed(this.pending.data.length);
    this.pending = undefined;
    this.flush();
  }
  private flush(): void {
    if (!this.ready || this.pending || !this.queue.length) return;
    const chunks = [this.queue.shift()!];
    let size = chunks[0]!.length;
    while (this.queue.length && size + this.queue[0]!.length <= 65536) { const next = this.queue.shift()!; chunks.push(next); size += next.length; }
    let data = chunks[0]!;
    if (chunks.length > 1) { data = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; } }
    this.pending = { id: ++this.sequence, data };
    this.timer = setTimeout(() => { this._stalled = true; this.onStall(true); }, 5000);
    this.timer.unref?.();
    this.send(this.pending);
  }
}
