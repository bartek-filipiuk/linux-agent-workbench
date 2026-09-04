import { z } from "zod";

export const ErrorCode = z.enum([
  "STALE_REVISION",
  "LEASE_DENIED",
  "POLICY_DENIED",
  "BUDGET_EXCEEDED",
  "WORKER_UNAVAILABLE",
  "INVALID_INPUT",
  "TIMEOUT",
  "CANCELLED",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ProtocolErrorShape = z.object({ code: ErrorCode, message: z.string() });
export type ProtocolErrorShape = z.infer<typeof ProtocolErrorShape>;

export class ProtocolError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProtocolError";
  }

  toJSON(): ProtocolErrorShape {
    return { code: this.code, message: this.message };
  }

  static is(e: unknown, code?: ErrorCode): e is ProtocolError {
    return e instanceof ProtocolError && (code === undefined || e.code === code);
  }
}
