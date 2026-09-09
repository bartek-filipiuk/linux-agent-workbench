import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

describe("image maintenance ownership", () => {
  it("only removes unused LAW-tagged images, retaining other projects, shared tags and unknown cache", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-prune-test-"));
    const calls = path.join(dir, "removed");
    fs.writeFileSync(path.join(dir, "podman"), `#!/bin/bash
case "$1" in
  images) printf '%s\\n' '111111111111 localhost/law-terminal' '222222222222 example/important' '333333333333 <none>' '444444444444 localhost/law-browser' '444444444444 example/shared' ;;
  image) exit 1 ;;
  rmi) printf '%s\\n' "$2" >> "$LAW_TEST_REMOVED" ;;
  system) printf 'TYPE SIZE\\nImages 1GB\\n' ;;
  *) exit 1 ;;
esac
`, { mode: 0o700 });
    try {
      execFileSync("bash", ["scripts/prune-images.sh"], { cwd: process.cwd(), env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, LAW_TEST_REMOVED: calls } });
      expect(fs.readFileSync(calls, "utf8").trim()).toBe("111111111111");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
