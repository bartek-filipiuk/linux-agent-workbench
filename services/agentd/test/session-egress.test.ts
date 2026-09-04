import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { SessionEgress, egressSocketPaths } from "../src/egress/session-egress.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "law-se-"));
let egress: SessionEgress | undefined;
afterEach(async () => {
  await egress?.close();
  fs.rmSync(root, { recursive: true, force: true });
});

const connects = (p: string) =>
  new Promise<boolean>((resolve) => {
    const c = net.connect(p, () => {
      c.destroy();
      resolve(true);
    });
    c.on("error", () => resolve(false));
  });

describe("SessionEgress", () => {
  it("serves both sockets in open mode and none in none mode", async () => {
    const log: string[] = [];
    egress = new SessionEgress({ runtimeRoot: root, log: (s, e) => log.push(`${s}:${e.host}`) });
    await egress.ensure("abc", "open");
    expect(egress.active).toBe(true);
    for (const p of egressSocketPaths(root, "abc")) expect(await connects(p)).toBe(true);
    await egress.ensure("abc", "open"); // idempotent
    expect(await connects(egressSocketPaths(root, "abc")[0]!)).toBe(true);
    await egress.ensure("def", "none");
    expect(egress.active).toBe(false);
    for (const p of [...egressSocketPaths(root, "abc"), ...egressSocketPaths(root, "def")]) expect(await connects(p)).toBe(false);
  });
});
