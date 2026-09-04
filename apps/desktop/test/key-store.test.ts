import { describe, expect, it } from "vitest";
import { resolveApiKey, stripEnvKey, type KeyBackend } from "../src/main/key-store";

const xor = (s: string) => Buffer.from(s).map((b) => b ^ 0x5a);
const strong: KeyBackend = { backend: "gnome_libsecret", available: true, encrypt: (p) => Buffer.from(xor(p)), decrypt: (b) => Buffer.from(xor(b.toString())).toString() };
const plain: KeyBackend = { ...strong, backend: "basic_text" };
const none: KeyBackend = { ...strong, available: false, backend: "unknown" };

describe("resolveApiKey", () => {
  it("moves a .env key into the keyring when the backend encrypts", () => {
    const r = resolveApiKey({ envKey: "sk-test-1", keys: strong });
    expect(r).toMatchObject({ apiKey: "sk-test-1", keyStore: "keyring", backend: "gnome_libsecret" });
    expect(r.encryptedKey).toBeDefined();
    expect(Buffer.from(r.encryptedKey!, "base64").toString()).not.toContain("sk-test");
    expect(resolveApiKey({ encryptedKey: r.encryptedKey, keys: strong })).toEqual({ apiKey: "sk-test-1", keyStore: "keyring", backend: "gnome_libsecret" });
  });

  it("keeps the key in .env and writes nothing when the backend is basic_text or unavailable", () => {
    expect(resolveApiKey({ envKey: "sk-test-2", keys: plain })).toEqual({ apiKey: "sk-test-2", keyStore: "env", backend: "basic_text" });
    expect(resolveApiKey({ envKey: "sk-test-2", keys: none })).toEqual({ apiKey: "sk-test-2", keyStore: "env", backend: "unknown" });
  });

  it("prefers the stored blob, falls back to .env when the blob is unreadable, and reports none", () => {
    const stored = resolveApiKey({ envKey: "sk-old", keys: strong }).encryptedKey;
    expect(resolveApiKey({ encryptedKey: stored, envKey: "sk-new", keys: strong }).apiKey).toBe("sk-old");
    const broken: KeyBackend = { ...strong, decrypt: () => { throw new Error("bad blob"); } };
    expect(resolveApiKey({ encryptedKey: stored, envKey: "sk-new", keys: broken }).apiKey).toBe("sk-new");
    expect(resolveApiKey({ keys: strong })).toEqual({ apiKey: "", keyStore: "none", backend: "gnome_libsecret" });
  });
});

describe("stripEnvKey", () => {
  it("replaces only the key line", () => {
    const out = stripEnvKey("OPENAI_MODEL=gpt-5.6-sol\nexport OPENAI_API_KEY=sk-x\n# note\n", "2026-09-04");
    expect(out).toBe("OPENAI_MODEL=gpt-5.6-sol\n# OPENAI_API_KEY moved to the OS keyring on 2026-09-04\n# note\n");
    expect(out).not.toContain("sk-x");
  });
});
