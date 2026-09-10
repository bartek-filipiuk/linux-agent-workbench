import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { PodmanRuntime } from "@law/agentd";

/** Container tests must never mount the user's browser, coding-agent or SSH profiles. */
export function isolatedRuntime() {
  const prefix = `law-test-${randomBytes(8).toString("hex")}`;
  const volumes = new Set<string>();
  const command = (args: string[]) => new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile("podman", args, { maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`podman ${args[0]}: ${stderr.trim() || error.message}`));
      else resolve({ stdout, stderr });
    });
  });
  const runtime = new PodmanRuntime(args => command(args.map((arg, i) => {
    if (args[0] !== "run" || args[i - 1] !== "--volume") return arg;
    const match = /^(law-auth-claude|law-auth-codex|law-ssh|law-browser-profile-default)(:.*)$/.exec(arg);
    if (!match) return arg;
    const name = `${prefix}-${match[1]}`;
    volumes.add(name);
    return name + match[2];
  })));
  return { runtime, async cleanup() {
    const present = new Set((await command(["volume", "ls", "--format", "{{.Name}}"])).stdout.split(/\s+/));
    for (const volume of volumes) if (present.has(volume)) await command(["volume", "rm", volume]);
  } };
}
