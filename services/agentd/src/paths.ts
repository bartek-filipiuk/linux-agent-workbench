import os from "node:os";
import path from "node:path";

const APP = "linux-agent-workbench";

export function dataDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, APP);
}

export function dbPath(): string {
  return path.join(dataDir(), "state.sqlite");
}

export function runtimeDir(): string {
  const base = process.env.XDG_RUNTIME_DIR || path.join(os.tmpdir(), `law-${os.userInfo().uid}`);
  return path.join(base, APP);
}
