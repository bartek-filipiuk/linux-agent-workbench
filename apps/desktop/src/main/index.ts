import { app, BrowserWindow, ipcMain, MessageChannelMain, utilityProcess } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseEnvFile } from "./env-file";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number }
  | { type: "agentd.error"; message: string };

let status: AgentdStatus = { type: "agentd.starting" };
let win: BrowserWindow | null = null;

function repoRoot(): string {
  // out/main/index.js -> out/main -> out -> apps/desktop -> apps -> repo root
  return path.resolve(__dirname, "..", "..", "..", "..");
}

function loadEnv(): Record<string, string> {
  const candidates = [path.join(app.getPath("userData"), ".env"), path.join(repoRoot(), ".env")];
  for (const p of candidates) {
    if (fs.existsSync(p)) return parseEnvFile(fs.readFileSync(p, "utf8"));
  }
  return {};
}

function dbPath(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, "linux-agent-workbench", "state.sqlite");
}

function publish(next: AgentdStatus) {
  status = next;
  win?.webContents.send("agentd:event", status);
}

function startAgentd() {
  const entry = path.join(repoRoot(), "services", "agentd", "dist", "main.js");
  const env = loadEnv();
  const apiKey = env.OPENAI_API_KEY ?? "";
  const model = env.OPENAI_MODEL ?? "gpt-5.6-sol";
  if (!apiKey) {
    publish({ type: "agentd.error", message: "OPENAI_API_KEY missing in .env" });
    return;
  }
  const child = utilityProcess.fork(entry, [], { serviceName: "agentd", stdio: "inherit" });
  const { port1, port2 } = new MessageChannelMain();
  child.postMessage({ type: "port" }, [port1]);
  port2.on("message", (e) => publish(e.data as AgentdStatus));
  port2.start();
  port2.postMessage({ type: "config.init", apiKey, model, dbPath: dbPath() });
  child.on("exit", (code) => publish({ type: "agentd.error", message: `agentd exited with code ${code}` }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0b0d10",
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

app.whenReady().then(() => {
  createWindow();
  startAgentd();
});

app.on("window-all-closed", () => app.quit());
