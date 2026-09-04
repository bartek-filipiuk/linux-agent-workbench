import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { restoreSnapshot, snapshotWorkspace } from "../src/session/snapshot.js";
import { tmpDir } from "./helpers/tmp.js";

const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-C", dir, ...args], { stdio: "pipe", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).toString();

describe("snapshot", () => {
  it("returns null outside git", async () => {
    expect(await snapshotWorkspace(tmpDir())).toBeNull();
  });

  it("captures HEAD and dirty changes, and restores them after damage", async () => {
    const dir = tmpDir("law-git-");
    git(dir, "init", "-q");
    fs.writeFileSync(path.join(dir, "a.txt"), "v1\n");
    git(dir, "add", ".");
    git(dir, "commit", "-qm", "init");
    fs.writeFileSync(path.join(dir, "a.txt"), "v2 uncommitted\n");
    const snap = await snapshotWorkspace(dir);
    expect(snap?.head).toMatch(/^[0-9a-f]{40}$/);
    expect(snap?.stash).toMatch(/^[0-9a-f]{40}$/);
    fs.writeFileSync(path.join(dir, "a.txt"), "DAMAGED\n");
    fs.unlinkSync(path.join(dir, "a.txt"));
    await restoreSnapshot(dir, snap!);
    expect(fs.readFileSync(path.join(dir, "a.txt"), "utf8")).toBe("v2 uncommitted\n");
  });

  it("handles a clean tree and an empty repo", async () => {
    const dir = tmpDir("law-git-");
    git(dir, "init", "-q");
    expect(await snapshotWorkspace(dir)).toEqual({ head: null, stash: null });
    fs.writeFileSync(path.join(dir, "a.txt"), "v1\n");
    git(dir, "add", ".");
    git(dir, "commit", "-qm", "init");
    expect(await snapshotWorkspace(dir)).toMatchObject({ stash: null });
  });
});
