import { describe, expect, it } from "vitest";
import { AgentdReady, handleConfigInit } from "../src/ipc.js";
import { Store } from "../src/storage/store.js";

describe("handleConfigInit", () => {
  it("opens the store, marks interrupted runs and never echoes the key", () => {
    const reply = handleConfigInit(
      { type: "config.init", apiKey: "sk-test-secret-value-1234567890", model: "gpt-5.6-sol", dbPath: ":memory:" },
      (p) => new Store(p),
    );
    const ready = AgentdReady.parse(reply);
    expect(ready).toMatchObject({ schemaVersion: 1, model: "gpt-5.6-sol", interruptedRuns: 0 });
    expect(JSON.stringify(reply)).not.toContain("sk-test");
  });

  it("returns agentd.error on invalid config", () => {
    expect(handleConfigInit({ type: "config.init" }, (p) => new Store(p))).toMatchObject({ type: "agentd.error" });
  });
});
