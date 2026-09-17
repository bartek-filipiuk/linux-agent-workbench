import { expect, it } from "vitest";
import { jevConfig } from "../src/main/jev-config.js";
import { redact } from "../src/main/redact.js";
import { readTaskPreferences } from "../src/renderer/task-settings.js";

it("does not enable Jev without a key and validates private configuration", () => {
  expect(jevConfig({}, "")).toBeUndefined();
  expect(jevConfig({}, "private")).toMatchObject({ model: "jev-1.13.0", timeoutMs: 5000 });
  expect(() => jevConfig({ TYPESAFE_MODEL: "https://evil.test" }, "private")).toThrow();
  expect(() => jevConfig({ TYPESAFE_PRICE_INPUT_PER_MTOK: "NaN" }, "private")).toThrow();
});
it("redacts TypeSafe keys and encrypted blobs from diagnostics", () => {
  const result = redact('apikey_abcdefghijklmnopqrstuvwxyz_0123456789 {"jevKeyEncrypted":"opaque-private-value"}');
  expect(result).not.toContain("abcdefghijklmnopqrstuvwxyz"); expect(result).not.toContain("opaque-private-value");
});
it("preserves engine preference and defaults legacy/invalid preferences to Classic", () => {
  const legacy = { profile: "quick", stepMode: "unlimited", steps: "100", timeMode: "30", minutes: "30" };
  expect(readTaskPreferences(JSON.stringify(legacy)).browserEngine).toBe("classic");
  expect(readTaskPreferences(JSON.stringify({ ...legacy, browserEngine: "jev-hybrid" })).browserEngine).toBe("jev-hybrid");
  expect(readTaskPreferences(JSON.stringify({ ...legacy, browserEngine: "jev-first" })).browserEngine).toBe("jev-first");
  expect(readTaskPreferences(JSON.stringify({ ...legacy, browserEngine: "unexpected" })).browserEngine).toBe("classic");
});
