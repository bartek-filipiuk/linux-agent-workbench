import { execFile } from "node:child_process";

export function command(file: string, args: string[], options: { cwd?: string; signal?: AbortSignal; timeout?: number } = {}): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { ...options, encoding: "utf8", timeout: options.timeout ?? 10_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, output: `${stdout}${stderr}${error ? `\n${error.message.split("\n")[0]}` : ""}`.trim() });
    });
  });
}
