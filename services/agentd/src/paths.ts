import os from "node:os";
import path from "node:path";

export function instanceName(): string {
  const name = process.env.LAW_INSTANCE ?? "";
  if (name && !/^[a-z][a-z0-9-]{0,23}$/.test(name)) throw new Error("LAW_INSTANCE must be a short lowercase name");
  return name;
}
export function appDirectoryName(): string { const name = instanceName(); return `linux-agent-workbench${name ? `-${name}` : ""}`; }
export function containerLabel(): string { return `law.app=${instanceName() || "1"}`; }
export function profileVolume(): string { return `law-browser-profile-${instanceName() || "default"}`; }

export function dataDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, appDirectoryName());
}

export function dbPath(): string {
  return path.join(dataDir(), "state.sqlite");
}

export function runtimeDir(): string {
  const base = process.env.XDG_RUNTIME_DIR || path.join(os.tmpdir(), `law-${os.userInfo().uid}`);
  return path.join(base, appDirectoryName());
}
