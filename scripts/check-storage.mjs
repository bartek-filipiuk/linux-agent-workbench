import { execFileSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const GB = 1_000_000_000;
export function checkStorage(phase, { run = execFileSync, statfs = statfsSync, cwd = process.cwd() } = {}) {
  if (!['before-build', 'after-build'].includes(phase)) throw new Error('Expected before-build or after-build');
  const graph = run('podman', ['info', '--format', '{{.Store.GraphRoot}}'], { encoding: 'utf8', timeout: 30000 }).trim();
  if (!path.isAbsolute(graph) || graph === '/') throw new Error('Podman returned an invalid local storage directory');
  for (const dir of new Set([cwd, graph])) {
    const stats = statfs(dir, { bigint: true });
    const free = stats.bavail * stats.bsize;
    if (free < BigInt(5 * GB)) throw new Error(`Storage check failed: ${(Number(free) / GB).toFixed(2)} GB available at ${dir}; need 5 GB`);
  }
  if (phase === 'before-build') return 'Free-space check passed for the workspace and Podman storage filesystems';
  // Count allocated blocks once, excluding mounted container root filesystems. Virtual image sizes double-count shared layers.
  const output = run('podman', ['unshare', 'du', '-sx', '--block-size=1', '--', graph], { encoding: 'utf8', timeout: 120000 }).trim();
  const match = /^(\d+)\s/.exec(output);
  if (!match) throw new Error('Could not measure allocated Podman storage');
  const bytes = BigInt(match[1]);
  if (bytes > BigInt(14 * GB)) throw new Error(`Allocated Podman storage is ${(Number(bytes) / GB).toFixed(2)} GB (limit 14 GB); inspect unused images and orphaned storage before rebuilding`);
  return `Allocated Podman storage: ${(Number(bytes) / GB).toFixed(2)} GB (limit 14 GB)`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(checkStorage(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 3; }
}
