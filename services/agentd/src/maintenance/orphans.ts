// Containers outlive the app on purpose (reopen = reconnect). Ones nobody has used for a week are
// stopped at startup; they run with --rm, so stopping removes them. Volumes are never touched.
import fs from "node:fs";
import path from "node:path";

export type ContainerLister = {
  listApp(): Promise<{ name: string; sessionId: string }[]>;
  stop(name: string): Promise<void>;
};

export const LAST_USED = "last-used";
export const ORPHAN_MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

/** Touch the session's marker; called at start, periodically while active, and at stop. */
export function markSessionUsed(runtimeRoot: string, sessionId: string): void {
  const dir = path.join(runtimeRoot, sessionId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, LAST_USED);
  const now = new Date();
  try {
    fs.utimesSync(file, now, now);
  } catch {
    fs.writeFileSync(file, "", { mode: 0o600 });
  }
}

export function lastUsedAt(runtimeRoot: string, sessionId: string): number | undefined {
  try {
    return fs.statSync(path.join(runtimeRoot, sessionId, LAST_USED)).mtimeMs;
  } catch {
    return undefined;
  }
}

/** Stops every app container whose session marker is missing or older than maxIdleMs; returns the names stopped. */
export async function stopOrphans(podman: ContainerLister, runtimeRoot: string, opts: { maxIdleMs?: number; now?: number } = {}): Promise<string[]> {
  const now = opts.now ?? Date.now();
  const maxIdle = opts.maxIdleMs ?? ORPHAN_MAX_IDLE_MS;
  const stopped: string[] = [];
  for (const c of await podman.listApp()) {
    const used = lastUsedAt(runtimeRoot, c.sessionId);
    if (used !== undefined && now - used < maxIdle) continue;
    await podman.stop(c.name);
    stopped.push(c.name);
  }
  return stopped;
}
