import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lastUsedAt, markSessionUsed, stopOrphans } from "../src/maintenance/orphans.js";
import { PodmanRuntime } from "../src/runtime/podman.js";

const DAY = 24 * 60 * 60 * 1000;

describe("orphan containers", () => {
  it("stops containers whose session was not used for a week or has no marker", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "law-orph-"));
    markSessionUsed(root, "fresh");
    markSessionUsed(root, "stale");
    const old = new Date(Date.now() - 8 * DAY);
    fs.utimesSync(path.join(root, "stale", "last-used"), old, old);
    expect(lastUsedAt(root, "fresh")).toBeGreaterThan(Date.now() - 5000);
    expect(lastUsedAt(root, "nomarker")).toBeUndefined();

    const stopped: string[] = [];
    const podman = {
      listApp: async () => [
        { name: "law-terminal-fresh", sessionId: "fresh" },
        { name: "law-browser-stale", sessionId: "stale" },
        { name: "law-terminal-nomarker", sessionId: "nomarker" },
      ],
      stop: async (name: string) => void stopped.push(name),
    };
    expect(await stopOrphans(podman, root)).toEqual(["law-browser-stale", "law-terminal-nomarker"]);
    expect(stopped).toEqual(["law-browser-stale", "law-terminal-nomarker"]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("PodmanRuntime lists app containers with their session label and stops by name", async () => {
    const calls: string[][] = [];
    const runtime = new PodmanRuntime(async (args) => {
      calls.push(args);
      if (args[0] === "ps") return { stdout: "law-terminal-aaa aaa\nlaw-browser-aaa aaa\n\n", stderr: "" };
      return { stdout: "", stderr: "" };
    });
    expect(await runtime.listApp()).toEqual([
      { name: "law-terminal-aaa", sessionId: "aaa" },
      { name: "law-browser-aaa", sessionId: "aaa" },
    ]);
    await runtime.stop("law-browser-aaa");
    expect(calls[0]).toEqual(["ps", "--filter", "label=law.app=1", "--format", '{{.Names}} {{index .Labels "law.session"}}']);
    expect(calls[1]).toEqual(["stop", "-t", "5", "law-browser-aaa"]);
  });
});
