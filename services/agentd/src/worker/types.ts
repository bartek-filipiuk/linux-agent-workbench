import type { TerminalInput, TerminalInputResult, TerminalObservation, TerminalObserveInput, TerminalResize, TerminalWaitInput, TerminalWaitResult, WorkerHealth } from "@law/protocol";

export interface TerminalWorker {
  observe(input: TerminalObserveInput, signal?: AbortSignal): Promise<TerminalObservation>;
  input(input: TerminalInput, signal?: AbortSignal): Promise<TerminalInputResult>;
  wait(input: TerminalWaitInput, signal?: AbortSignal): Promise<TerminalWaitResult>;
  interrupt(signal?: AbortSignal): Promise<void>;
  resize(size: TerminalResize): Promise<void>;
  health(): Promise<WorkerHealth>;
  cancel(): void;
  writeRaw(bytes: Uint8Array): void;
  onPtyData(cb: (bytes: Uint8Array) => void): () => void;
  onClose(cb: () => void): () => void;
  onRequest(type: string, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>): () => void;
  close(): void;
}
