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
  it("switches the same session open → none → open and closes existing clients", async () => {
    egress = new SessionEgress({ runtimeRoot: root, log: () => {} });
    await egress.ensure("same", "open");
    const socket = net.connect(egressSocketPaths(root, "same")[0]!);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
    await egress.ensure("same", "none");
    await closed;
    expect(egress.active).toBe(false);
    for (const p of egressSocketPaths(root, "same")) expect(await connects(p)).toBe(false);
    await egress.ensure("same", "open");
    for (const p of egressSocketPaths(root, "same")) expect(await connects(p)).toBe(true);
  });

  it("serializes a mode change with an in-flight proxy startup", async () => {
    egress = new SessionEgress({ runtimeRoot: root, log: () => {} });
    await Promise.all([egress.ensure("same", "open"), egress.ensure("same", "none")]);
    expect(egress.active).toBe(false);
    for (const p of egressSocketPaths(root, "same")) expect(await connects(p)).toBe(false);
  });

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
