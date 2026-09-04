import { describe, expect, it } from "vitest";
import { RingBuffer, redact } from "../src/main/redact";

describe("redact", () => {
  it("hides keys, bearer tokens, assignments and the encrypted blob, keeps the rest", () => {
    const input = [
      "OPENAI_API_KEY=sk-proj-abcdefghijklmnop",
      "authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def",
      'password: "hunter2hunter2"',
      '"openaiKeyEncrypted": "djEwZmFrZWJsb2I="',
      "model gpt-5.6-sol ready on 127.0.0.1",
    ].join("\n");
    const out = redact(input);
    expect(out).not.toMatch(/sk-proj|eyJhbGci|hunter2|djEwZmFr/);
    expect(out).toContain("OPENAI_API_KEY=[redacted]");
    expect(out).toContain("Bearer [redacted]");
    expect(out).toContain("model gpt-5.6-sol ready on 127.0.0.1");
  });
});

describe("RingBuffer", () => {
  it("keeps only the last lines", () => {
    const rb = new RingBuffer(3);
    rb.push("a\nb\n");
    rb.push("c\nd");
    expect(rb.text()).toBe("b\nc\nd");
  });
});
