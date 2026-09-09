// Strips anything that looks like a credential before text leaves the machine in a diagnostics file.
const PATTERNS: RegExp[] = [
  /("[a-z_]*(?:token|secret|password|api[_-]?key|authorization)[a-z_]*"\s*:\s*")(?:\\.|[^"\\])*/gi,
  /([?&](?:access_token|refresh_token|id_token|token|code|state|api_key|password|secret)=)[^&\s"'<>]*/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /sk-[A-Za-z0-9_-]{8,}/g, // OpenAI-style keys
  /(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi,
  /((?:api[_-]?key|token|secret|password|authorization)\s*[=:]\s*)["']?(?!Bearer\b|\[redacted\])[^\s"',;[]{6,}/gi,
  /(openaiKeyEncrypted"?\s*:\s*")[^"]+/g,
];

export function redact(text: string): string {
  let out = text;
  for (const re of PATTERNS) out = out.replace(re, (m, prefix?: string) => (typeof prefix === "string" && m.startsWith(prefix) ? `${prefix}[redacted]` : "[redacted]"));
  return out;
}

/** Fixed-size log tail kept in memory for the diagnostics file. */
export class RingBuffer {
  private readonly lines: string[] = [];
  constructor(private readonly capacity = 500) {}
  push(chunk: string): void {
    for (const line of chunk.split(/\r?\n/)) {
      if (!line) continue;
      this.lines.push(line);
      if (this.lines.length > this.capacity) this.lines.shift();
    }
  }
  text(): string {
    return this.lines.join("\n");
  }
}
