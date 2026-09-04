// Where the OpenAI key lives: the OS keyring through Electron's safeStorage when the backend really
// encrypts, otherwise the plain .env file the user wrote. Pure logic; Electron is injected.
export type KeyStore = "keyring" | "env" | "none";

export type KeyBackend = {
  /** safeStorage.getSelectedStorageBackend() on Linux; "unknown" elsewhere or when unavailable. */
  backend: string;
  available: boolean;
  encrypt: (plain: string) => Buffer;
  decrypt: (blob: Buffer) => string;
};

export type KeyResolution = {
  apiKey: string;
  keyStore: KeyStore;
  backend: string;
  /** Set when the key was just moved into the keyring: persist it and rewrite .env. */
  encryptedKey?: string;
};

const PLAIN_BACKENDS = new Set(["basic_text", "unknown", ""]);

export function resolveApiKey(input: { encryptedKey?: string | undefined; envKey?: string | undefined; keys: KeyBackend }): KeyResolution {
  const { keys } = input;
  const strong = keys.available && !PLAIN_BACKENDS.has(keys.backend);
  if (input.encryptedKey && keys.available) {
    try {
      const apiKey = keys.decrypt(Buffer.from(input.encryptedKey, "base64"));
      if (apiKey) return { apiKey, keyStore: "keyring", backend: keys.backend };
    } catch {
      /* fall through to .env; a changed keyring makes the blob unreadable */
    }
  }
  if (!input.envKey) return { apiKey: "", keyStore: "none", backend: keys.backend };
  // Fail closed: never write the key where the OS would keep it as plain text.
  if (!strong) return { apiKey: input.envKey, keyStore: "env", backend: keys.backend };
  return { apiKey: input.envKey, keyStore: "keyring", backend: keys.backend, encryptedKey: keys.encrypt(input.envKey).toString("base64") };
}

/** Replaces the OPENAI_API_KEY line of a .env file with a note; every other line is kept verbatim. */
export function stripEnvKey(text: string, date: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (/^\s*(export\s+)?OPENAI_API_KEY\s*=/.test(line) ? `# OPENAI_API_KEY moved to the OS keyring on ${date}` : line))
    .join("\n");
}
