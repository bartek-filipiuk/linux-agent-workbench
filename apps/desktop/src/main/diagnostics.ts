import fs from "node:fs/promises";
import path from "node:path";
import { command } from "./commands";
import { redact } from "./redact";

export type DiagnosticsState = { running: boolean; step: string; file?: string; cancelled?: boolean; error?: string };
export async function collectDiagnostics(dir: string, initial: Array<[string, string]>, signal: AbortSignal, progress: (state: DiagnosticsState) => void): Promise<string> {
  const sections = [...initial];
  const jobs: Array<[string, string, string[]]> = [
    ["Podman version", "podman", ["--version"]],
    ["Kernel", "uname", ["-sr"]],
    ["Containers", "podman", ["ps", "-a", "--filter", "label=law.app=1", "--format", "{{.Names}} {{.Status}} {{.Image}}"]],
  ];
  for (const [title, file, args] of jobs) {
    if (signal.aborted) break;
    progress({ running: true, step: title });
    const result = await command(file, args, { signal });
    sections.push([title, result.output]);
  }
  if (signal.aborted) sections.push(["Cancelled", "Partial results collected before cancellation."]);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `law-diagnostics-${Date.now()}.txt`);
  await fs.writeFile(file, redact(sections.map(([title, body]) => `== ${title} ==\n${body}\n`).join("\n")), { mode: 0o600 });
  progress({ running: false, step: signal.aborted ? "Cancelled — partial report saved" : "Report saved", file, cancelled: signal.aborted });
  return file;
}
