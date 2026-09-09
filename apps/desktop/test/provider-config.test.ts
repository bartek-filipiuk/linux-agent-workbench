import { describe, expect, it } from "vitest";
import { providerConfig } from "../src/main/provider-config.js";

describe("provider selection", () => {
  it("defaults to subscription and does not use API model overrides", () => {
    expect(providerConfig({ OPENAI_API_KEY: "sk-existing", OPENAI_MODEL: "api-only" })).toEqual({ provider: "codex", model: "codex-default", codex: {} });
  });
  it("keeps Codex options separate from API options", () => {
    expect(providerConfig({ LAW_CODEX_MODEL: "chosen", LAW_CODEX_BIN: "/bin/codex", LAW_CODEX_HOME: "/private/codex" })).toEqual({ provider: "codex", model: "chosen", codex: { binary: "/bin/codex", home: "/private/codex" } });
  });
  it("uses paid API only when explicitly selected", () => {
    expect(providerConfig({ LAW_PROVIDER: "openai", OPENAI_MODEL: "chosen" })).toEqual({ provider: "openai", model: "chosen" });
    expect(() => providerConfig({ LAW_PROVIDER: "typo" })).toThrow("LAW_PROVIDER");
  });
});
