import { execFile } from "node:child_process";

export type Snapshot = { head: string | null; stash: string | null };

function git(cwd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) =>
    execFile("git", ["-C", cwd, ...args], { maxBuffer: 1024 * 1024 }, (err, stdout) => resolve({ ok: !err, out: stdout.trim() })),
  );
}

export async function snapshotWorkspace(path: string): Promise<Snapshot | null> {
  const inside = await git(path, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.out !== "true") return null;
  const head = await git(path, ["rev-parse", "--verify", "HEAD"]);
  const stash = head.ok ? await git(path, ["stash", "create"]) : { ok: false, out: "" };
  return { head: head.ok ? head.out : null, stash: stash.ok && stash.out ? stash.out : null };
}

// ponytail: tracked files only; untracked files created or deleted during the run are not restored.
export async function restoreSnapshot(path: string, snap: Snapshot): Promise<void> {
  if (snap.head) {
    const r = await git(path, ["checkout", snap.head, "--", "."]);
    if (!r.ok) throw new Error("git checkout failed");
  }
  if (snap.stash) {
    const r = await git(path, ["stash", "apply", snap.stash]);
    if (!r.ok) throw new Error("git stash apply failed");
  }
}
