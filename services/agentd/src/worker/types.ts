import type { TerminalInput, TerminalInputResult, TerminalObservation, TerminalObserveInput, TerminalResize, TerminalWaitInput, TerminalWaitResult, WorkerHealth } from "@law/protocol";

export interface TerminalWorker {
  setOutputPaused?(paused: boolean): void;
  observe(input: TerminalObserveInput, signal?: AbortSignal): Promise<TerminalObservation>;
  input(input: TerminalInput, signal?: AbortSignal): Promise<TerminalInputResult>;
  wait(input: TerminalWaitInput, signal?: AbortSignal): Promise<TerminalWaitResult>;
  interrupt(signal?: AbortSignal): Promise<void>;
  resize(size: TerminalResize): Promise<void>;
  /** Have tmux repaint the screen (after a reconnect or when the UI panel comes back). */
  refresh(): Promise<void>;
  health(): Promise<WorkerHealth>;
  cancel(): void;
  writeRaw(bytes: Uint8Array): void;
  onPtyData(cb: (bytes: Uint8Array) => void): () => void;
  onClose(cb: () => void): () => void;
  onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void;
  close(): void;
}
