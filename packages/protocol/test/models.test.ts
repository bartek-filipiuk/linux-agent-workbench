import { expect, it } from "vitest";
import { ModelSelection, validateModelSelection, type CodexModel } from "../src/models.js";

const models: CodexModel[] = [{ model: "gpt-6-astra", displayName: "GPT-6 Astra", defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "medium", description: "Balanced" }] }];
it("rejects unknown models, unsupported efforts and effort without a model", () => {
  expect(() => validateModelSelection({}, models)).not.toThrow();
  expect(() => validateModelSelection({ model: "gpt-6-astra", effort: "medium" }, models)).not.toThrow();
  expect(() => validateModelSelection({ model: "removed" }, models)).toThrow("unavailable");
  expect(() => validateModelSelection({ model: "gpt-6-astra", effort: "low" }, models)).toThrow("does not support");
  expect(ModelSelection.safeParse({ effort: "medium" }).success).toBe(false);
});
