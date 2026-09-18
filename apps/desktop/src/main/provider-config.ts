/** Codex is the default. API billing requires an explicit provider selection. */
export function providerConfig(env: Record<string, string>) {
  const provider = env.LAW_PROVIDER ?? "codex";
  if (provider !== "codex" && provider !== "openai" && provider !== "openrouter") throw new Error("LAW_PROVIDER must be codex, openai or openrouter");
  if (provider === "openrouter") {
    const effort = env.OPENROUTER_EFFORT || "low";
    if (!["low", "medium", "high"].includes(effort)) throw new Error("OPENROUTER_EFFORT must be low, medium or high");
    return { provider: "openrouter" as const, model: env.OPENROUTER_MODEL || "google/gemini-3.8-flash",
      openrouter: { effort: effort as "low" | "medium" | "high", ...(env.OPENROUTER_PROVIDER ? { provider: env.OPENROUTER_PROVIDER } : {}) } };
  }
  return {
    provider: provider as "codex" | "openai",
    model: provider === "codex" ? env.LAW_CODEX_MODEL || "codex-default" : env.OPENAI_MODEL || "gpt-5.6-sol",
    ...(provider === "codex" ? { codex: {
      ...(env.LAW_CODEX_BIN ? { binary: env.LAW_CODEX_BIN } : {}),
      ...(env.LAW_CODEX_HOME ? { home: env.LAW_CODEX_HOME } : {}),
    } } : {}),
  };
}
