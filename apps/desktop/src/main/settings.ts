import fs from "node:fs";

export type Settings = { lastWorkspace?: string; networkMode: "open" | "none" };

export function readSettings(file: string): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const networkMode = raw.networkMode === "none" ? "none" : "open";
    const lastWorkspace = typeof raw.lastWorkspace === "string" && raw.lastWorkspace ? raw.lastWorkspace : undefined;
    return { networkMode, ...(lastWorkspace ? { lastWorkspace } : {}) };
  } catch {
    return { networkMode: "open" };
  }
}

export function writeSettings(file: string, s: Settings): void {
  fs.writeFileSync(file, JSON.stringify(s, null, 2));
}
