import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function tmpDir(prefix = "law-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function tmpSocketPath(): string {
  // Unix socket paths are limited to ~108 bytes; keep them short.
  return path.join(tmpDir("law-s-"), "w.sock");
}
