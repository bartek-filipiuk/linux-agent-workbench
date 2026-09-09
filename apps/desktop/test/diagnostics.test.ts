import { expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectDiagnostics } from "../src/main/diagnostics";
import { command } from "../src/main/commands";
it("cancels a subprocess without blocking the event loop", async () => {
  const abort = new AbortController();
  const result = command(process.execPath, ["-e", "setTimeout(()=>{}, 30000)"], { signal: abort.signal });
  await new Promise(r => setTimeout(r, 30));
  abort.abort();
  expect((await result).ok).toBe(false);
});
it("saves a redacted partial report when cancelled", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "law-diag-"));
  const abort = new AbortController(); abort.abort();
  const states: unknown[] = [];
  const file = await collectDiagnostics(dir, [["test", "OPENAI_API_KEY=sk-123456789012345678901234567890"]], abort.signal, s => states.push(s));
  const text = await fs.readFile(file, "utf8");
  expect(text).toContain("Partial results");
  expect(text).not.toContain("sk-123456");
  expect(states.at(-1)).toMatchObject({ running: false, cancelled: true, file });
  expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
  await fs.rm(dir, { recursive: true });
});
