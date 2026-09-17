import fs from "node:fs";

export type Settings = {
  lastWorkspace?: string;
  networkMode: "open" | "none";
  /** Nested agents (claude, codex) start with their permission prompts skipped; the sandbox is the boundary. */
  nestedAutonomy: boolean;
  /** "ask" = a card before the sandbox or the browser first talks to a new host. */
  domainMode: "open" | "ask";
  openaiKeyEncrypted?: string;
  jevKeyEncrypted?: string;
  openrouterKeyEncrypted?: string;
};

export const DEFAULT_SETTINGS: Settings = { networkMode: "open", nestedAutonomy: true, domainMode: "open" };

export function readSettings(file: string): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const networkMode = raw.networkMode === "none" ? "none" : "open";
    const nestedAutonomy = raw.nestedAutonomy !== false;
    const domainMode = raw.domainMode === "ask" ? "ask" : "open";
    const lastWorkspace = typeof raw.lastWorkspace === "string" && raw.lastWorkspace ? raw.lastWorkspace : undefined;
    const openaiKeyEncrypted = typeof raw.openaiKeyEncrypted === "string" && raw.openaiKeyEncrypted ? raw.openaiKeyEncrypted : undefined;
    const jevKeyEncrypted = typeof raw.jevKeyEncrypted === "string" && raw.jevKeyEncrypted ? raw.jevKeyEncrypted : undefined;
    const openrouterKeyEncrypted = typeof raw.openrouterKeyEncrypted === "string" && raw.openrouterKeyEncrypted ? raw.openrouterKeyEncrypted : undefined;
    return { ...(openrouterKeyEncrypted ? { openrouterKeyEncrypted } : {}), networkMode, nestedAutonomy, domainMode, ...(jevKeyEncrypted ? { jevKeyEncrypted } : {}), ...(lastWorkspace ? { lastWorkspace } : {}), ...(openaiKeyEncrypted ? { openaiKeyEncrypted } : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(file: string, s: Settings): void {
  fs.writeFileSync(file, JSON.stringify(s, null, 2), { mode: 0o600 });
}
