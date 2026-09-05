import { app, BrowserWindow, dialog, ipcMain, MessageChannelMain, safeStorage, utilityProcess, type MessagePortMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentdToMain, MainToAgentd, SessionStatus } from "@law/agentd";
import { parseEnvFile } from "./env-file";
import { execFileSync } from "node:child_process";
import { resolveApiKey, stripEnvKey, type KeyStore } from "./key-store";
import { RingBuffer, redact } from "./redact";
import { DEFAULT_SETTINGS, readSettings, writeSettings, type Settings } from "./settings";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number; keyStore: KeyStore; keyBackend: string }
  | { type: "agentd.error"; message: string };

let status: AgentdStatus = { type: "agentd.starting" };
let session: SessionStatus = { state: "idle" };
let win: BrowserWindow | null = null;
let port: MessagePortMain | null = null;
let settings: Settings = { ...DEFAULT_SETTINGS };
type LeaseState = { surface: "terminal" | "browser"; owner: "agent" | "human"; reason?: string };
let leases: Record<"terminal" | "browser", LeaseState> = { terminal: { surface: "terminal", owner: "human" }, browser: { surface: "browser", owner: "human" } };
let browser: { state: string; url?: string; title?: string; message?: string } = { state: "idle" };
let keyInfo: { keyStore: KeyStore; keyBackend: string } = { keyStore: "none", keyBackend: "unknown" };
const agentdLog = new RingBuffer(500);

function sh(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 10_000 }).trim();
  } catch (e) {
    return `(${cmd} failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)})`;
  }
}

/** Versions, images, containers, settings without the key and the agentd log tail; every line redacted. */
function writeDiagnostics(): string {
  const dir = path.join(path.dirname(dbPath()), "diagnostics");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `law-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
  const { openaiKeyEncrypted: _k, ...settingsNoKey } = settings;
  const sections: [string, string][] = [
    ["versions", `app ${app.getVersion()}\nelectron ${process.versions.electron}\nnode ${process.versions.node}\n${sh("podman", ["--version"])}\n${sh("uname", ["-sr"])}`],
    ["images", `terminal ${readImageId("terminal") ?? "missing"}\nbrowser ${readImageId("browser") ?? "missing"}`],
    ["containers", sh("podman", ["ps", "-a", "--filter", "label=law.app=1", "--format", "{{.Names}} {{.Status}} {{.Image}}"])],
    ["settings", JSON.stringify(settingsNoKey, null, 2)],
    ["key", `store ${keyInfo.keyStore}, backend ${keyInfo.keyBackend}`],
    ["state", `${dbPath()} ${fs.existsSync(dbPath()) ? `${fs.statSync(dbPath()).size} bytes` : "missing"}; agentd ${status.type}${status.type === "agentd.ready" ? ` schema ${status.schemaVersion}` : ""}`],
    ["session", JSON.stringify({ ...session, browser: browser.state, leases: { terminal: leases.terminal.owner, browser: leases.browser.owner } })],
    ["agentd log (last 500 lines)", agentdLog.text()],
  ];
  const text = sections.map(([title, body]) => `== ${title} ==\n${body}\n`).join("\n");
  fs.writeFileSync(file, redact(text), { mode: 0o600 });
  return file;
}

const repoRoot = () => path.resolve(__dirname, "..", "..", "..", "..");
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function loadEnv(): { env: Record<string, string>; file?: string } {
  for (const p of [path.join(app.getPath("userData"), ".env"), path.join(repoRoot(), ".env")]) {
    if (fs.existsSync(p)) return { env: parseEnvFile(fs.readFileSync(p, "utf8")), file: p };
  }
  return { env: {} };
}

/** The key from the OS keyring when it truly encrypts, else from .env; a .env key is moved into the keyring once. */
function loadApiKey(env: Record<string, string>, envFile: string | undefined): string {
  const available = safeStorage.isEncryptionAvailable();
  const backend = process.platform === "linux" && available ? safeStorage.getSelectedStorageBackend() : available ? process.platform : "unknown";
  const r = resolveApiKey({
    encryptedKey: settings.openaiKeyEncrypted,
    envKey: env.OPENAI_API_KEY,
    keys: { backend, available, encrypt: (p) => safeStorage.encryptString(p), decrypt: (b) => safeStorage.decryptString(b) },
  });
  keyInfo = { keyStore: r.keyStore, keyBackend: r.backend };
  if (r.keyStore === "keyring" && !r.encryptedKey) console.error(`[main] OPENAI_API_KEY loaded from the OS keyring (${backend})`);
  if (r.keyStore === "env") console.error(`[main] OPENAI_API_KEY stays in ${envFile ?? ".env"}: safeStorage backend is ${backend}`);
  if (r.encryptedKey && envFile) {
    settings = { ...settings, openaiKeyEncrypted: r.encryptedKey };
    writeSettings(settingsFile(), settings);
    fs.writeFileSync(envFile, stripEnvKey(fs.readFileSync(envFile, "utf8"), new Date().toISOString().slice(0, 10)), { mode: 0o600 });
    console.error(`[main] OPENAI_API_KEY moved from ${envFile} to the OS keyring (${backend})`);
  }
  return r.apiKey;
}

function xdg(name: "XDG_DATA_HOME" | "XDG_RUNTIME_DIR", fallback: string): string {
  return process.env[name] || fallback;
}
const dbPath = () => path.join(xdg("XDG_DATA_HOME", path.join(os.homedir(), ".local", "share")), "linux-agent-workbench", "state.sqlite");
const runtimeRoot = () => path.join(xdg("XDG_RUNTIME_DIR", path.join(os.tmpdir(), `law-${os.userInfo().uid}`)), "linux-agent-workbench");

function readImageId(name: "terminal" | "browser" = "terminal"): string | undefined {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(repoRoot(), "images", name, "image.json"), "utf8")) as { id?: string };
    return j.id;
  } catch {
    return undefined;
  }
}

const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);
const toAgentd = (msg: MainToAgentd) => port?.postMessage(msg);

// PTY output arrives as many small chunks (a TUI spinner alone is dozens per second); one IPC message
// per chunk starves the renderer. Coalesce per frame, and if the renderer falls far behind, drop the
// backlog and ask tmux to repaint instead of replaying minutes of spinner frames.
const TERMINAL_FLUSH_MS = 16;
const TERMINAL_BACKLOG_CAP = 2 * 1024 * 1024;
let terminalChunks: Uint8Array[] = [];
let terminalBacklog = 0;
let terminalFlushTimer: NodeJS.Timeout | undefined;
function queueTerminalData(data: Uint8Array): void {
  terminalChunks.push(data);
  terminalBacklog += data.byteLength;
  if (terminalBacklog > TERMINAL_BACKLOG_CAP) {
    terminalChunks = [];
    terminalBacklog = 0;
    toAgentd({ type: "terminal.refresh" });
    return;
  }
  terminalFlushTimer ??= setTimeout(() => {
    terminalFlushTimer = undefined;
    if (terminalChunks.length === 0) return;
    const out = new Uint8Array(terminalBacklog);
    let off = 0;
    for (const c of terminalChunks) { out.set(c, off); off += c.byteLength; }
    terminalChunks = [];
    terminalBacklog = 0;
    send("terminal:data", out);
  }, TERMINAL_FLUSH_MS);
}

function onAgentd(msg: AgentdToMain) {
  switch (msg.type) {
    case "agentd.ready":
    case "agentd.error":
      status = msg.type === "agentd.ready" ? { ...msg, ...keyInfo } : msg;
      send("agentd:event", status);
      if (msg.type === "agentd.ready") {
        toAgentd({ type: "policy.set", nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode });
        if (settings.lastWorkspace) toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
      }
      return;
    case "session.state": {
      const { type: _t, ...rest } = msg;
      session = rest;
      send("session:state", session);
      return;
    }
    case "terminal.data":
      queueTerminalData(msg.data);
      return;
    case "run.state":
    case "run.commentary":
    case "run.tool":
    case "run.handoff":
    case "approval.request":
    case "approval.resolved":
    case "gate.event":
    case "run.restored":
      send("run:event", msg);
      return;
    case "lease.state": {
      const l: LeaseState = { surface: msg.surface, owner: msg.owner, ...(msg.reason ? { reason: msg.reason } : {}) };
      leases = { ...leases, [msg.surface]: l };
      send("lease:state", l);
      return;
    }
    case "browser.state": {
      const { type: _t, ...rest } = msg;
      browser = rest;
      send("browser:state", browser);
      return;
    }
    case "browser.frame":
      send("browser:frame", { width: msg.width, height: msg.height, data: msg.data });
      return;
  }
}

function startAgentd() {
  const { env, file: envFile } = loadEnv();
  const apiKey = loadApiKey(env, envFile);
  const model = env.OPENAI_MODEL ?? "gpt-5.6-sol";
  const imageId = readImageId();
  if (!apiKey) return onAgentd({ type: "agentd.error", message: "OPENAI_API_KEY missing: put it in .env once; it is moved to the OS keyring on the next start" });
  if (!imageId) return onAgentd({ type: "agentd.error", message: "images/terminal/image.json missing; run pnpm images:build" });
  const entry = path.join(repoRoot(), "services", "agentd", "dist", "main.js");
  const child = utilityProcess.fork(entry, [], { serviceName: "agentd", stdio: "pipe" });
  // Mirror agentd's output to ours and keep a tail for the diagnostics file.
  child.stdout?.on("data", (d: Buffer) => { process.stdout.write(d); agentdLog.push(d.toString()); });
  child.stderr?.on("data", (d: Buffer) => { process.stderr.write(d); agentdLog.push(d.toString()); });
  const { port1, port2 } = new MessageChannelMain();
  child.postMessage({ type: "port" }, [port1]);
  port = port2;
  port2.on("message", (e) => onAgentd(e.data as AgentdToMain));
  port2.start();
  fs.mkdirSync(runtimeRoot(), { recursive: true, mode: 0o700 });
  const pin = Number(env.OPENAI_PRICE_INPUT_PER_MTOK);
  const pout = Number(env.OPENAI_PRICE_OUTPUT_PER_MTOK);
  const prices = env.OPENAI_PRICE_INPUT_PER_MTOK && Number.isFinite(pin) && Number.isFinite(pout) ? { inputUsdPerMTok: pin, outputUsdPerMTok: pout } : undefined;
  const browserImageId = readImageId("browser");
  // ntfy topics for approvals/handoffs on the phone; the topic names are the secret, so keep them random.
  const notify = env.LAW_NTFY_URL
    ? { url: env.LAW_NTFY_URL, ...(env.LAW_NTFY_REPLY_URL ? { replyUrl: env.LAW_NTFY_REPLY_URL } : {}), ...(env.LAW_NTFY_TOKEN ? { token: env.LAW_NTFY_TOKEN } : {}) }
    : undefined;
  toAgentd({ type: "config.init", apiKey, model, dbPath: dbPath(), imageId, runtimeRoot: runtimeRoot(), ...(prices ? { prices } : {}), ...(browserImageId ? { browserImageId } : {}), ...(notify ? { notify } : {}) });
  child.on("exit", (code) => onAgentd({ type: "agentd.error", message: `agentd exited with code ${code}` }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0b0d10",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // A covered or background window must keep drawing the terminal; otherwise IPC piles up and the UI looks hung.
      backgroundThrottling: false,
    },
  });
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

ipcMain.handle("agentd:status", () => status);
ipcMain.handle("session:get", () => session);
ipcMain.handle("workspace:select", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Choose workspace" });
  const dir = r.filePaths[0];
  if (r.canceled || !dir) return;
  settings = { ...settings, lastWorkspace: dir };
  writeSettings(settingsFile(), settings);
  toAgentd({ type: "session.start", workspacePath: dir, networkMode: settings.networkMode });
});
ipcMain.handle("workspace:reopen", () => {
  if (settings.lastWorkspace) toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
});
ipcMain.handle("network:set", (_e, mode: unknown) => {
  settings = { ...settings, networkMode: mode === "none" ? "none" : "open" };
  writeSettings(settingsFile(), settings);
  return settings.networkMode;
});
ipcMain.handle("network:get", () => settings.networkMode);
ipcMain.handle("policy:get", () => ({ nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode }));
ipcMain.handle("policy:set", (_e, patch: unknown) => {
  const p = (patch ?? {}) as { nestedAutonomy?: unknown; domainMode?: unknown };
  if (typeof p.nestedAutonomy === "boolean") settings = { ...settings, nestedAutonomy: p.nestedAutonomy };
  if (p.domainMode === "open" || p.domainMode === "ask") settings = { ...settings, domainMode: p.domainMode };
  writeSettings(settingsFile(), settings);
  toAgentd({ type: "policy.set", nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode });
  return { nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode };
});
ipcMain.handle("sandbox:destroy", () => toAgentd({ type: "session.stop", destroy: true }));
ipcMain.handle("lease:get", () => leases);
ipcMain.handle("run:start", (_e, goal: unknown) => {
  if (typeof goal === "string" && goal.trim()) toAgentd({ type: "run.start", goal: goal.trim().slice(0, 4000) });
});
ipcMain.handle("run:stop", () => toAgentd({ type: "run.stop" }));
ipcMain.handle("run:resume", () => toAgentd({ type: "run.resume" }));
ipcMain.handle("lease:take", (_e, owner: unknown, surface: unknown) =>
  toAgentd({ type: "lease.take", owner: owner === "agent" ? "agent" : "human", ...(surface === "terminal" || surface === "browser" ? { surface } : {}) }),
);
ipcMain.handle("approval:decide", (_e, id: unknown, decision: unknown) => {
  if (typeof id === "string" && (decision === "once" || decision === "session" || decision === "deny")) toAgentd({ type: "approval.decide", id, decision });
});
ipcMain.handle("browser:get", () => browser);
ipcMain.handle("browser:start", () => toAgentd({ type: "browser.start" }));
ipcMain.handle("browser:stop", () => toAgentd({ type: "browser.stop" }));
ipcMain.handle("browser:navigate", (_e, url: unknown) => {
  if (typeof url === "string" && url.trim()) toAgentd({ type: "browser.navigate", url: url.trim().slice(0, 4096) });
});
ipcMain.on("browser:input", (_e, event: unknown) => {
  if (event && typeof event === "object") toAgentd({ type: "browser.input", event: event as never });
});
ipcMain.handle("diagnostics:write", () => writeDiagnostics());
ipcMain.handle("run:restore", (_e, runId: unknown) => {
  if (typeof runId === "string" && runId) toAgentd({ type: "run.restore", runId });
});
ipcMain.on("terminal:write", (_e, data: unknown) => {
  if (typeof data === "string" && data.length <= 65_536) toAgentd({ type: "terminal.write", data: new TextEncoder().encode(data) });
});
ipcMain.on("terminal:refresh", () => toAgentd({ type: "terminal.refresh" }));
ipcMain.on("terminal:resize", (_e, cols: unknown, rows: unknown) => {
  if (Number.isInteger(cols) && Number.isInteger(rows)) toAgentd({ type: "terminal.resize", cols: cols as number, rows: rows as number });
});

app.whenReady().then(() => {
  settings = readSettings(settingsFile());
  createWindow();
  startAgentd();
});

app.on("window-all-closed", () => app.quit());
