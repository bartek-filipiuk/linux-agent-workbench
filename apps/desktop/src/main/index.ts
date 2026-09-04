import { app, BrowserWindow, dialog, ipcMain, MessageChannelMain, utilityProcess, type MessagePortMain } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentdToMain, MainToAgentd, SessionStatus } from "@law/agentd";
import { parseEnvFile } from "./env-file";
import { readSettings, writeSettings, type Settings } from "./settings";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };

let status: AgentdStatus = { type: "agentd.starting" };
let session: SessionStatus = { state: "idle" };
let win: BrowserWindow | null = null;
let port: MessagePortMain | null = null;
let settings: Settings = { networkMode: "open" };
type LeaseState = { surface: "terminal" | "browser"; owner: "agent" | "human"; reason?: string };
let leases: Record<"terminal" | "browser", LeaseState> = { terminal: { surface: "terminal", owner: "human" }, browser: { surface: "browser", owner: "human" } };
let browser: { state: string; url?: string; title?: string; message?: string } = { state: "idle" };

const repoRoot = () => path.resolve(__dirname, "..", "..", "..", "..");
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function loadEnv(): Record<string, string> {
  for (const p of [path.join(app.getPath("userData"), ".env"), path.join(repoRoot(), ".env")]) {
    if (fs.existsSync(p)) return parseEnvFile(fs.readFileSync(p, "utf8"));
  }
  return {};
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

function onAgentd(msg: AgentdToMain) {
  switch (msg.type) {
    case "agentd.ready":
    case "agentd.error":
      status = msg;
      send("agentd:event", status);
      if (msg.type === "agentd.ready" && settings.lastWorkspace) {
        toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
      }
      return;
    case "session.state": {
      const { type: _t, ...rest } = msg;
      session = rest;
      send("session:state", session);
      return;
    }
    case "terminal.data":
      send("terminal:data", msg.data);
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
  const env = loadEnv();
  const apiKey = env.OPENAI_API_KEY ?? "";
  const model = env.OPENAI_MODEL ?? "gpt-5.6-sol";
  const imageId = readImageId();
  if (!apiKey) return onAgentd({ type: "agentd.error", message: "OPENAI_API_KEY missing in .env" });
  if (!imageId) return onAgentd({ type: "agentd.error", message: "images/terminal/image.json missing; run pnpm images:build" });
  const entry = path.join(repoRoot(), "services", "agentd", "dist", "main.js");
  const child = utilityProcess.fork(entry, [], { serviceName: "agentd", stdio: "inherit" });
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
  const browserDomainMode = env.LAW_BROWSER_DOMAIN_MODE === "ask" ? "ask" : "open";
  toAgentd({ type: "config.init", apiKey, model, dbPath: dbPath(), imageId, runtimeRoot: runtimeRoot(), browserDomainMode, ...(prices ? { prices } : {}), ...(browserImageId ? { browserImageId } : {}) });
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
ipcMain.handle("run:restore", (_e, runId: unknown) => {
  if (typeof runId === "string" && runId) toAgentd({ type: "run.restore", runId });
});
ipcMain.on("terminal:write", (_e, data: unknown) => {
  if (typeof data === "string" && data.length <= 65_536) toAgentd({ type: "terminal.write", data: new TextEncoder().encode(data) });
});
ipcMain.on("terminal:resize", (_e, cols: unknown, rows: unknown) => {
  if (Number.isInteger(cols) && Number.isInteger(rows)) toAgentd({ type: "terminal.resize", cols: cols as number, rows: rows as number });
});

app.whenReady().then(() => {
  settings = readSettings(settingsFile());
  createWindow();
  startAgentd();
});

app.on("window-all-closed", () => app.quit());
