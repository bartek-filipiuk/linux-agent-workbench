import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProtocolError, type NetworkMode } from "@law/protocol";

export type Exec = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

export const defaultExec: Exec = (args) =>
  new Promise((resolve, reject) => {
    execFile("podman", args, { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`podman ${args[0]} failed: ${stderr.trim() || err.message}`));
      else resolve({ stdout, stderr });
    });
  });

const SESSION_ID = /^[a-f0-9]{16}$/;

export function sessionIdFor(workspacePath: string): string {
  return createHash("sha256").update(workspacePath).digest("hex").slice(0, 16);
}

export function validateWorkspacePath(p: string): string {
  if (!path.isAbsolute(p)) throw new ProtocolError("INVALID_INPUT", "workspace path must be absolute");
  let real: string;
  try {
    real = fs.realpathSync(p);
  } catch {
    throw new ProtocolError("INVALID_INPUT", `workspace does not exist: ${p}`);
  }
  if (!fs.statSync(real).isDirectory()) throw new ProtocolError("INVALID_INPUT", "workspace must be a directory");
  if (real === "/" || real === fs.realpathSync(os.homedir())) {
    throw new ProtocolError("INVALID_INPUT", "workspace cannot be / or the home directory");
  }
  return real;
}

export type RunSpec = {
  sessionId: string;
  workspacePath: string;
  runtimeDir: string;
  imageId: string;
  networkMode: NetworkMode;
  /** Host ~/.gitconfig to expose read-only so commits inside the sandbox carry the user's identity. */
  gitconfigPath?: string;
};

export function containerName(sessionId: string): string {
  if (!SESSION_ID.test(sessionId)) throw new ProtocolError("INVALID_INPUT", "invalid session id");
  return `law-terminal-${sessionId}`;
}

export function browserContainerName(sessionId: string): string {
  if (!SESSION_ID.test(sessionId)) throw new ProtocolError("INVALID_INPUT", "invalid session id");
  return `law-browser-${sessionId}`;
}

export type BrowserRunSpec = {
  sessionId: string;
  runtimeDir: string;
  downloadsDir: string;
  imageId: string;
  networkMode: NetworkMode;
};

// The browser container sees no workspace and no keys: only its profile volume, a downloads dir and the socket dir.
export function buildBrowserRunArgs(spec: BrowserRunSpec): string[] {
  const name = browserContainerName(spec.sessionId);
  if (!path.isAbsolute(spec.runtimeDir) || !path.isAbsolute(spec.downloadsDir)) {
    throw new ProtocolError("INVALID_INPUT", "runtime and downloads dirs must be absolute");
  }
  return [
    "run", "-d", "--rm",
    "--name", name,
    "--label", "law.app=1",
    "--label", `law.session=${spec.sessionId}`,
    "--userns=keep-id",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--read-only",
    "--pids-limit=512",
    "--memory=2g",
    "--shm-size=1g",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=1g",
    "--tmpfs", "/run:rw,nosuid,nodev,size=64m",
    "--tmpfs", "/home/agent:rw,nosuid,nodev,size=256m",
    "--volume", "law-browser-profile-default:/profile",
    "--volume", `${spec.downloadsDir}:/downloads:rw`,
    "--volume", `${spec.runtimeDir}:/run/law:rw`,
    "--network", spec.networkMode === "none" ? "none" : "slirp4netns",
    "--env", "HOME=/home/agent",
    spec.imageId,
  ];
}

export function buildRunArgs(spec: RunSpec): string[] {
  const name = containerName(spec.sessionId);
  if (!path.isAbsolute(spec.workspacePath) || !path.isAbsolute(spec.runtimeDir)) {
    throw new ProtocolError("INVALID_INPUT", "workspace and runtime dir must be absolute");
  }
  if (spec.gitconfigPath !== undefined && (!path.isAbsolute(spec.gitconfigPath) || spec.gitconfigPath.includes(":"))) {
    throw new ProtocolError("INVALID_INPUT", "gitconfig path must be absolute");
  }
  return [
    "run", "-d", "--rm",
    "--name", name,
    "--label", "law.app=1",
    "--label", `law.session=${spec.sessionId}`,
    "--userns=keep-id",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--read-only",
    "--pids-limit=512",
    "--memory=4g",
    // ponytail: no --cpus. Rootless cgroup v2 here delegates only memory+pids; a cpu quota needs a
    // systemd user@.service drop-in with Delegate=cpu cpuset io memory pids (hardening milestone).
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=1g",
    "--tmpfs", "/run:rw,nosuid,nodev,size=64m",
    "--tmpfs", "/home/agent:rw,nosuid,nodev,size=512m",
    "--volume", "law-auth-claude:/home/agent/.claude",
    "--volume", "law-auth-codex:/home/agent/.codex",
    // Dedicated SSH material only: deploy keys and known_hosts the user puts here, never the host ~/.ssh.
    "--volume", "law-ssh:/home/agent/.ssh",
    ...(spec.gitconfigPath ? ["--volume", `${spec.gitconfigPath}:/home/agent/.gitconfig:ro`] : []),
    "--volume", `${spec.workspacePath}:/workspace:rw`,
    "--volume", `${spec.runtimeDir}:/run/law:rw`,
    "--network", spec.networkMode === "none" ? "none" : "slirp4netns",
    "--env", "TERM=xterm-256color",
    "--env", "HOME=/home/agent",
    // Claude Code keeps its account/onboarding state in ~/.claude.json, outside ~/.claude; point it at the volume.
    "--env", "CLAUDE_CONFIG_DIR=/home/agent/.claude",
    "--env", "CODEX_HOME=/home/agent/.codex",
    "--workdir", "/workspace",
    spec.imageId,
  ];
}

export class PodmanRuntime {
  constructor(private readonly exec: Exec = defaultExec) {}

  containerName(sessionId: string): string {
    return containerName(sessionId);
  }

  async state(sessionId: string): Promise<"running" | "stopped" | "missing"> {
    try {
      const { stdout } = await this.exec(["inspect", "--type", "container", "--format", "{{.State.Status}}", containerName(sessionId)]);
      return stdout.trim() === "running" ? "running" : "stopped";
    } catch {
      return "missing";
    }
  }

  async ensureRunning(spec: RunSpec): Promise<"reused" | "started" | "outdated"> {
    return this.ensureRunningWith(containerName(spec.sessionId), buildRunArgs(spec), { imageId: spec.imageId });
  }

  async stateOf(name: string): Promise<"running" | "stopped" | "missing"> {
    try {
      const { stdout } = await this.exec(["inspect", "--type", "container", "--format", "{{.State.Status}}", name]);
      return stdout.trim() === "running" ? "running" : "stopped";
    } catch {
      return "missing";
    }
  }

  /** Image id (sha256:…) the container was created from, or undefined when it does not exist. */
  async imageOf(name: string): Promise<string | undefined> {
    try {
      const { stdout } = await this.exec(["inspect", "--type", "container", "--format", "{{.Image}}", name]);
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Start the container unless one with that name is already running. With `imageId`, a running container
   * built from another image is recreated when `recreateOnImageMismatch` is set, otherwise reported as "outdated".
   */
  async ensureRunningWith(name: string, args: string[], opts: { imageId?: string; recreateOnImageMismatch?: boolean } = {}): Promise<"reused" | "started" | "outdated"> {
    const state = await this.stateOf(name);
    if (state === "running") {
      if (!opts.imageId) return "reused";
      const current = await this.imageOf(name);
      const same = current !== undefined && (current === opts.imageId || current.replace(/^sha256:/, "") === opts.imageId.replace(/^sha256:/, ""));
      if (same) return "reused";
      if (!opts.recreateOnImageMismatch) return "outdated";
      await this.exec(["rm", "-f", "--ignore", name]);
    } else if (state === "stopped") {
      await this.exec(["rm", "-f", "--ignore", name]);
    }
    await this.exec(args);
    return "started";
  }

  async destroy(sessionId: string): Promise<void> {
    await this.destroyByName(containerName(sessionId));
  }

  async destroyByName(name: string): Promise<void> {
    await this.exec(["rm", "-f", "--ignore", name]);
  }

  async execIn(name: string, args: string[]): Promise<void> {
    await this.exec(["exec", name, ...args]);
  }

  async logsOf(name: string, tail = 50): Promise<string> {
    try {
      const { stdout, stderr } = await this.exec(["logs", "--tail", String(tail), name]);
      return (stdout + stderr).trim();
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  async logs(sessionId: string, tail = 50): Promise<string> {
    try {
      const { stdout, stderr } = await this.exec(["logs", "--tail", String(tail), containerName(sessionId)]);
      return (stdout + stderr).trim();
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  async imageExists(imageId: string): Promise<boolean> {
    try {
      await this.exec(["image", "exists", imageId]);
      return true;
    } catch {
      return false;
    }
  }
}
