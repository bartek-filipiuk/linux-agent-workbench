import { z } from "zod";
import { ProtocolErrorShape } from "./errors.js";

export const Payload = z.record(z.string(), z.unknown());
export type Payload = z.infer<typeof Payload>;

export const Envelope = z.object({
  v: z.literal(1),
  type: z.string().min(1),
  id: z.string().min(1).optional(),
  payload: Payload.default({}),
});
export type Envelope = z.infer<typeof Envelope>;

export const ResultMessage = z.object({
  v: z.literal(1),
  type: z.literal("result"),
  id: z.string().min(1),
  ok: z.boolean(),
  payload: Payload.optional(),
  error: ProtocolErrorShape.optional(),
});
export type ResultMessage = z.infer<typeof ResultMessage>;
