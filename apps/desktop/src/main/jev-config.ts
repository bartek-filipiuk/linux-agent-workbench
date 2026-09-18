/** Host configuration only. Never return the key from renderer-facing IPC. */
export function jevConfig(env: Record<string, string>, apiKey: string) {
  if (!apiKey) return undefined;
  const model = env.TYPESAFE_MODEL || "jev-1.13.0";
  if (!/^jev-[a-zA-Z0-9.-]+$/.test(model)) throw new Error("TYPESAFE_MODEL must be a Jev model ID");
  const price = Number(env.TYPESAFE_PRICE_INPUT_PER_MTOK ?? "0.042");
  if (!Number.isFinite(price) || price < 0) throw new Error("TYPESAFE_PRICE_INPUT_PER_MTOK must be nonnegative");
  return { apiKey, model, timeoutMs: 5000, maxRetries: 1, minConfidence: 0.55, inputUsdPerMTok: price };
}
