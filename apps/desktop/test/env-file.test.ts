import { describe, expect, it } from "vitest";
import { parseEnvFile } from "../src/main/env-file";

describe("parseEnvFile", () => {
  it("parses KEY=value lines, ignores comments/blank lines, strips quotes", () => {
    const text = `# comment\nOPENAI_API_KEY=sk-abc\n\nOPENAI_MODEL="gpt-5.6-sol"\nX='y z'\nexport Z=1\n`;
    expect(parseEnvFile(text)).toEqual({ OPENAI_API_KEY: "sk-abc", OPENAI_MODEL: "gpt-5.6-sol", X: "y z", Z: "1" });
  });
  it("keeps = inside values", () => {
    expect(parseEnvFile("A=b=c")).toEqual({ A: "b=c" });
  });
});
