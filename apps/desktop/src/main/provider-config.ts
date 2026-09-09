/** Codex is the default. API billing requires an explicit provider selection. */
export function providerConfig(env: Record<string, string>) {
  const provider = env.LAW_PROVIDER ?? "codex";
  if (provider !== "codex" && provider !== "openai") throw new Error("LAW_PROVIDER must be codex or openai");
  return {
    provider: provider as "codex" | "openai",
    model: provider === "codex" ? env.LAW_CODEX_MODEL || "codex-default" : env.OPENAI_MODEL || "gpt-5.6-sol",
    ...(provider === "codex" ? { codex: {
      ...(env.LAW_CODEX_BIN ? { binary: env.LAW_CODEX_BIN } : {}),
      ...(env.LAW_CODEX_HOME ? { home: env.LAW_CODEX_HOME } : {}),
    } } : {}),
  };
}
