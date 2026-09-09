/** At most one chunk is in Electron IPC. Credit returns only after xterm parses it. */
export class TerminalDelivery {
  private queue: Uint8Array[] = [];
  private pending: { id: number; data: Uint8Array } | undefined;
  private sequence = 0;
  private ready = false;
  private bytes = 0;
  private failed = false;
  constructor(private send: (chunk: { id: number; data: Uint8Array }) => void, private consumed: (bytes: number) => void, private overflow: () => void = () => {}) {}
  push(data: Uint8Array): void {
    if (this.failed) return;
    if (this.bytes + data.length > 4 * 1024 * 1024) {
      this.failed = true;
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
    if (!ready) this.failed = false;
    if (!ready && this.pending) { this.queue.unshift(this.pending.data); this.pending = undefined; }
    this.flush();
  }
  acknowledge(id: number): void {
    if (this.pending?.id !== id) return;
    this.bytes -= this.pending.data.length;
    this.consumed(this.pending.data.length);
    this.pending = undefined;
    this.flush();
  }
  private flush(): void {
    if (!this.ready || this.pending || !this.queue.length) return;
    this.pending = { id: ++this.sequence, data: this.queue.shift()! };
    this.send(this.pending);
  }
}
