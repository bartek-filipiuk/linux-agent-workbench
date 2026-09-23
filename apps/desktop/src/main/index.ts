import { app, BrowserWindow, dialog, shell, ipcMain, Menu, MessageChannelMain, safeStorage, utilityProcess, type MessagePortMain } from "electron";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { isRendererUrl, isTrustedRenderer } from "./renderer-security";
import os from "node:os";
import path from "node:path";
import { RunLimits, BudgetAction, ModelSelection, validateModelSelection, type ModelCatalog, type BrowserControl, type BrowserInfo } from "@law/protocol";
import { appDirectoryName, instanceName, PLAYBOOK_SLUG } from "@law/agentd";
import { jevConfig } from "./jev-config";
import type { AgentdToMain, MainToAgentd, SessionStatus } from "@law/agentd";
import { TerminalDelivery } from "./terminal-delivery";
import { CodexAccount, type AccountState } from "./codex-account";
import { command } from "./commands";
import { emptyRun, reduceRun, type RunEvent } from "../renderer/run-view";
import { parseEnvFile } from "./env-file";
import { providerConfig } from "./provider-config";
import { collectDiagnostics, type DiagnosticsState } from "./diagnostics";
import { resolveApiKey, stripEnvKey, type KeyStore } from "./key-store";
import { RingBuffer, redact } from "./redact";
import { DEFAULT_SETTINGS, readSettings, writeSettings, type Settings } from "./settings";

type AgentdStatus =
  | { type: "agentd.starting" }
  | { type: "agentd.ready"; schemaVersion: number; dbPath: string; model: string; interruptedRuns: number; keyStore: KeyStore; keyBackend: string }
  | { type: "agentd.error"; message: string };

if (instanceName()) app.setPath("userData", path.join(app.getPath("appData"), appDirectoryName()));

let status: AgentdStatus = { type: "agentd.starting" };
let session: SessionStatus = { state: "idle" };
let win: BrowserWindow | null = null;
let rendererEntryUrl = "";
function handleTrusted(channel: string, listener: Parameters<typeof ipcMain.handle>[1]) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedRenderer(event, win?.webContents, rendererEntryUrl)) throw new Error("Untrusted IPC sender");
    return listener(event, ...args);
  });
}
function onTrusted(channel: string, listener: Parameters<typeof ipcMain.on>[1]) {
  ipcMain.on(channel, (event, ...args) => {
    if (isTrustedRenderer(event, win?.webContents, rendererEntryUrl)) listener(event, ...args);
  });
}

let port: MessagePortMain | null = null;
let settings: Settings = { ...DEFAULT_SETTINGS };
type LeaseState = { surface: "terminal" | "browser"; owner: "agent" | "human"; reason?: string };
let leases: Record<"terminal" | "browser", LeaseState> = { terminal: { surface: "terminal", owner: "human" }, browser: { surface: "browser", owner: "human" } };
let browser: { state: string; message?: string } & Partial<BrowserInfo> = { state: "idle" };
let keyInfo: { keyStore: KeyStore; keyBackend: string } = { keyStore: "none", keyBackend: "unknown" };
let currentRun = emptyRun;
let currentGoal = "";
let handoffReason: string | null = null;
let runSequence = 0;
let querySequence = 0;
const queries = new Map<string, { resolve: (value: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
function queryDaemon(kind: "history" | "detail" | "browser" | "browser_restart" | "conversation" | "followup" | "pause" | "playbooks" | "playbook_accept" | "playbook_discard", runId?: string, command?: BrowserControl, message?: string, slug?: string): Promise<unknown> {
  if (!port) return Promise.reject(new Error("Agent service is unavailable. Recheck setup first."));
  const requestId = String(++querySequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { queries.delete(requestId); reject(new Error(`${kind.replaceAll("_", " ")} request timed out. Check the current state before retrying.`)); }, ["browser", "browser_restart", "followup", "pause"].includes(kind) ? 90000 : 10000);
    queries.set(requestId, { resolve, reject, timer });
    toAgentd({ type: "ui.query", requestId, kind, ...(runId ? { runId } : {}), ...(command ? { command } : {}), ...(message ? { message } : {}), ...(slug ? { slug } : {}) });
  });
}
function publishRun(event: RunEvent) {
  if (event.type === "run.state" && event.goal !== undefined) currentGoal = event.goal;
  currentRun = reduceRun(currentRun, event);
  if (event.type === "run.handoff") handoffReason = event.reason;
  if (event.type === "run.state" && event.state !== "handoff") handoffReason = null;
  send("run:event", { ...event, ...(event.type === "run.state" ? { goal: currentGoal } : {}), sequence: ++runSequence });
}
const agentdLog = new RingBuffer(500);

/** Versions, images, containers, settings without the key and the agentd log tail; every line redacted. */
let diagnosticsAbort: AbortController | undefined;
let diagnosticsState: DiagnosticsState = { running: false, step: "" };
async function writeDiagnostics(): Promise<string> {
  if (diagnosticsAbort) throw new Error("Diagnostics are already running");
  diagnosticsAbort = new AbortController();
  const dir = path.join(path.dirname(dbPath()), "diagnostics");

  const { openaiKeyEncrypted: _k, jevKeyEncrypted: _j, openrouterKeyEncrypted: _o, ...settingsNoKey } = settings;
  const sections: [string, string][] = [
    ["versions", `app ${app.getVersion()}\nelectron ${process.versions.electron}\nnode ${process.versions.node}`],
    ["images", `terminal ${readImageId("terminal") ?? "missing"}\nbrowser ${readImageId("browser") ?? "missing"}`],
    ["settings", JSON.stringify(settingsNoKey, null, 2)],
    ["key", `store ${keyInfo.keyStore}, backend ${keyInfo.keyBackend}`],
    ["state", `${dbPath()} ${fs.existsSync(dbPath()) ? `${fs.statSync(dbPath()).size} bytes` : "missing"}; agentd ${status.type}${status.type === "agentd.ready" ? ` schema ${status.schemaVersion}` : ""}`],
    ["session", JSON.stringify({ ...session, browser: browser.state, leases: { terminal: leases.terminal.owner, browser: leases.browser.owner } })],
    ["agentd log (last 500 lines)", agentdLog.text()],
  ];
  try {
    return await collectDiagnostics(dir, sections, diagnosticsAbort.signal, (state) => { diagnosticsState = state; send("diagnostics:state", state); });
  } catch (e) { diagnosticsState = { running: false, step: "Failed to save report", error: String(e) }; send("diagnostics:state", diagnosticsState); throw e; }
  finally { diagnosticsAbort = undefined; }

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

function loadOpenRouterKey(env: Record<string, string>, envFile: string | undefined): string {
  const available = safeStorage.isEncryptionAvailable();
  const backend = process.platform === "linux" && available ? safeStorage.getSelectedStorageBackend() : available ? process.platform : "unknown";
  const result = resolveApiKey({ encryptedKey: settings.openrouterKeyEncrypted, envKey: env.OPENROUTER_API_KEY,
    keys: { backend, available, encrypt: p => safeStorage.encryptString(p), decrypt: b => safeStorage.decryptString(b) } });
  keyInfo = { keyStore: result.keyStore, keyBackend: result.backend };
  if (result.encryptedKey && envFile) {
    settings = { ...settings, openrouterKeyEncrypted: result.encryptedKey };
    writeSettings(settingsFile(), settings);
    fs.writeFileSync(envFile, fs.readFileSync(envFile, "utf8").split(/\r?\n/).map(line => /^\s*(export\s+)?OPENROUTER_API_KEY\s*=/.test(line) ? "# OPENROUTER_API_KEY moved to the OS keyring" : line).join("\n"), { mode: 0o600 });
  }
  return result.apiKey;
}

function loadJevKey(env: Record<string, string>, envFile: string | undefined): string {
  const available = safeStorage.isEncryptionAvailable();
  const backend = process.platform === "linux" && available ? safeStorage.getSelectedStorageBackend() : available ? process.platform : "unknown";
  const result = resolveApiKey({ encryptedKey: settings.jevKeyEncrypted, envKey: env.TYPESAFE_API_KEY,
    keys: { backend, available, encrypt: p => safeStorage.encryptString(p), decrypt: b => safeStorage.decryptString(b) } });
  if (result.encryptedKey && envFile) {
    settings = { ...settings, jevKeyEncrypted: result.encryptedKey };
    writeSettings(settingsFile(), settings);
    fs.writeFileSync(envFile, fs.readFileSync(envFile, "utf8").split(/\r?\n/).map(line => /^\s*(export\s+)?TYPESAFE_API_KEY\s*=/.test(line) ? "# TYPESAFE_API_KEY moved to the OS keyring" : line).join("\n"), { mode: 0o600 });
  }
  return result.apiKey;
}

function xdg(name: "XDG_DATA_HOME" | "XDG_RUNTIME_DIR", fallback: string): string {
  return process.env[name] || fallback;
}
const dbPath = () => path.join(xdg("XDG_DATA_HOME", path.join(os.homedir(), ".local", "share")), appDirectoryName(), "state.sqlite");
const runtimeRoot = () => path.join(xdg("XDG_RUNTIME_DIR", path.join(os.tmpdir(), `law-${os.userInfo().uid}`)), appDirectoryName());
const playbooksDir = () => path.join(path.dirname(dbPath()), "playbooks");

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

const terminalDelivery = new TerminalDelivery(
  (chunk) => send("terminal:data", chunk),
  (bytes) => toAgentd({ type: "terminal.ack", bytes }),
  () => {
    toAgentd({ type: "session.stop", destroy: false });
    onAgentd({ type: "agentd.error", message: "Terminal output exceeded its buffer. Reconnect to repaint the terminal; rebuild worker images if this repeats." });
  },
  (stalled) => send("terminal:stalled", stalled),
);

function onAgentd(msg: AgentdToMain) {
  switch (msg.type) {
    case "ui.reply": {
      const q = queries.get(msg.requestId);
      if (q) { clearTimeout(q.timer); queries.delete(msg.requestId); if (msg.error) q.reject(new Error(msg.error)); else q.resolve(msg.result); }
      return;
    }
    case "playbook.draft":
      send("playbooks:draft", { slug: msg.slug, name: msg.name });
      return;
    case "agentd.ready":
    case "agentd.error":
      status = msg.type === "agentd.ready" ? { ...msg, ...keyInfo } : msg;
      send("agentd:event", status);
      if (msg.type === "agentd.ready") {
        syncFrameVisibility();
        toAgentd({ type: "policy.set", nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode });
        if (settings.lastWorkspace) toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
      }
      return;
    case "session.state": {
      const { type: _t, ...rest } = msg;
      if (rest.workspacePath && session.workspacePath && rest.workspacePath !== session.workspacePath) { currentRun = emptyRun; currentGoal = ""; handoffReason = null; }
      session = rest;
      send("session:state", session);
      return;
    }
    case "terminal.data":
      terminalDelivery.push(msg.data);
      return;
    case "run.state":
      activeRun = ["completed", "stopped", "failed", "budget_exceeded", "interrupted"].includes(msg.state)
        ? null
        : { runId: msg.runId, turns: msg.turns, toolCalls: msg.toolCalls, costUsd: msg.costUsd, snapshot: msg.snapshot };
      publishRun(msg);
      return;
    case "run.commentary":
    case "run.tool":
    case "run.handoff":
    case "approval.request":
    case "approval.resolved":
    case "gate.event":
    case "run.restored":
      publishRun(msg);
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
      if (framesWanted) send("browser:frame", { id: msg.id, generation: msg.generation, width: msg.width, height: msg.height, data: msg.data });
      else toAgentd({ type: "browser.frameAck", id: msg.id }); // nobody is looking in terminal-only view
      return;
  }
}

let framesWanted = false;
function syncFrameVisibility() {
  toAgentd({ type: "browser.frames", enabled: framesWanted && !!win && win.isVisible() && !win.isMinimized() && win.isFocused() });
}
let activeRun: { runId: string; turns: number; toolCalls: number; costUsd: number | null; snapshot: boolean } | null = null;
let agentdCrashes: number[] = [];

/** agentd died under a run: tell the UI the truth (run interrupted, keyboard back to the human) and bring agentd back. */
function onAgentdExit(code: number | undefined): void {
  port = null;
  for (const q of queries.values()) { clearTimeout(q.timer); q.reject(new Error("Agent service restarted")); }
  queries.clear();
  const message = `agentd exited with code ${code ?? "?"}`;
  if (activeRun) {
    publishRun({ type: "run.state", ...activeRun, state: "interrupted", endReason: "agentd_exit" });
    activeRun = null;
  }
  for (const surface of ["terminal", "browser"] as const) {
    leases = { ...leases, [surface]: { surface, owner: "human", reason: "agentd exited" } };
    send("lease:state", leases[surface]);
  }
  session = { state: "error", message };
  send("session:state", session);
  onAgentd({ type: "agentd.error", message });
  const now = Date.now();
  agentdCrashes = agentdCrashes.filter((t) => now - t < 60_000).concat(now);
  if (agentdCrashes.length > 3) {
    onAgentd({ type: "agentd.error", message: `${message}; not restarting after ${agentdCrashes.length} crashes in a minute` });
    return;
  }
  setTimeout(() => { if (!port) startAgentd(); }, 1000);
}

let accountState: AccountState = { state: "signed_out" };
const account = new CodexAccount(() => { const config = providerConfig(loadEnv().env); return config.provider === "codex" ? config.codex ?? {} : {}; }, (state) => { accountState = state; send("setup:account", state); });
async function checkSetup() {
  const config = providerConfig(loadEnv().env);
  const podman = await command("podman", ["info", "--format", "{{.Host.Arch}}"], { timeout: 10000 });
  const imageId = readImageId();
  const image = imageId ? await command("podman", ["image", "exists", imageId]) : { ok: false };
  if (config.provider === "codex" && accountState.state !== "waiting") {
    try { accountState = await account.read(); }
    catch (e) { accountState = { state: "error", message: e instanceof Error ? e.message : String(e) }; }
  }
  const providerReady = config.provider === "codex" ? accountState.state === "ready" : !!(config.provider === "openrouter" ? loadOpenRouterKey(loadEnv().env, loadEnv().file) : loadApiKey(loadEnv().env, loadEnv().file));
  return { provider: config.provider, account: accountState, podman: podman.ok, image: image.ok, providerReady, workspace: session.workspacePath ?? settings.lastWorkspace ?? null };
}

function startAgentd() {
  const { env, file: envFile } = loadEnv();
  let provider: ReturnType<typeof providerConfig>;
  try { provider = providerConfig(env); }
  catch (e) { return onAgentd({ type: "agentd.error", message: e instanceof Error ? e.message : String(e) }); }
  let jev: ReturnType<typeof jevConfig>;
  try { jev = jevConfig(env, loadJevKey(env, envFile)); }
  catch (e) { return onAgentd({ type: "agentd.error", message: e instanceof Error ? e.message : "Invalid Jev configuration" }); }
  const apiKey = provider.provider === "openrouter" ? loadOpenRouterKey(env, envFile) : provider.provider === "openai" ? loadApiKey(env, envFile) : "";
  const imageId = readImageId();
  if (provider.provider !== "codex" && !apiKey) return onAgentd({ type: "agentd.error", message: `${provider.provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY"} missing: put it in the private .env once; it is moved to the OS keyring on the next start` });
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
  // A cheaper model for the research profile, if configured: LAW_RESEARCH_MODEL plus its prices.
  const rin = Number(env.LAW_RESEARCH_PRICE_INPUT_PER_MTOK);
  const rout = Number(env.LAW_RESEARCH_PRICE_OUTPUT_PER_MTOK);
  const profileModels = provider.provider === "openai" && env.LAW_RESEARCH_MODEL
    ? { research: { model: env.LAW_RESEARCH_MODEL, ...(Number.isFinite(rin) && Number.isFinite(rout) && env.LAW_RESEARCH_PRICE_INPUT_PER_MTOK ? { prices: { inputUsdPerMTok: rin, outputUsdPerMTok: rout } } : {}) } }
    : undefined;
  toAgentd({ type: "config.init", ...(jev ? { jev } : {}), apiKey, ...provider, dbPath: dbPath(), imageId, runtimeRoot: runtimeRoot(), ...(provider.provider === "openai" && prices ? { prices } : {}), ...(browserImageId ? { browserImageId } : {}), ...(notify ? { notify } : {}), ...(profileModels ? { profileModels } : {}), playbooksDir: playbooksDir(), playbooksSeed: path.join(repoRoot(), "playbooks") });
  child.on("exit", (code) => onAgentdExit(code));
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
  if (instanceName()) {
    win.setTitle(`Linux Agent Workbench · ${instanceName()}`);
    win.on("page-title-updated", event => event.preventDefault());
  }
  win.on("minimize", syncFrameVisibility);
  win.on("restore", syncFrameVisibility);
  win.on("hide", syncFrameVisibility);
  win.on("show", syncFrameVisibility);
  win.on("focus", syncFrameVisibility);
  win.on("blur", syncFrameVisibility);
  win.webContents.on("did-start-loading", () => { framesWanted = false; syncFrameVisibility(); terminalDelivery.setReady(false); });
  rendererEntryUrl = (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) || pathToFileURL(path.join(__dirname, "../renderer/index.html")).href;
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => { if (!isRendererUrl(url, rendererEntryUrl)) event.preventDefault(); });
  win.webContents.on("will-frame-navigate", event => { if (!event.isMainFrame || !isRendererUrl(event.url, rendererEntryUrl)) event.preventDefault(); });
  win.webContents.on("will-redirect", (event, url) => { if (!isRendererUrl(url, rendererEntryUrl)) event.preventDefault(); });
  win.webContents.on("will-attach-webview", event => event.preventDefault());
  void win.loadURL(rendererEntryUrl);
}

handleTrusted("setup:check", () => checkSetup());
handleTrusted("setup:login", async () => { const url = await account.login(); await shell.openExternal(url); return accountState; });
handleTrusted("setup:cancel", () => { account.cancel(); accountState = { state: "signed_out" }; send("setup:account", accountState); });
handleTrusted("setup:retry", () => { if (!port) startAgentd(); else if (settings.lastWorkspace && session.state !== "ready") toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode }); });
handleTrusted("agentd:status", () => status);
handleTrusted("session:get", () => session);
handleTrusted("workspace:select", async () => {
  if (activeRun) throw new Error("Finish or stop the current run before changing workspace");
  const r = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Choose workspace" });
  const dir = r.filePaths[0];
  if (r.canceled || !dir) return;
  settings = { ...settings, lastWorkspace: dir };
  writeSettings(settingsFile(), settings);
  toAgentd({ type: "session.start", workspacePath: dir, networkMode: settings.networkMode });
});
handleTrusted("workspace:reopen", () => {
  if (settings.lastWorkspace) toAgentd({ type: "session.start", workspacePath: settings.lastWorkspace, networkMode: settings.networkMode });
});
handleTrusted("network:set", (_e, mode: unknown) => {
  settings = { ...settings, networkMode: mode === "none" ? "none" : "open" };
  writeSettings(settingsFile(), settings);
  return settings.networkMode;
});
handleTrusted("network:get", () => settings.networkMode);
handleTrusted("network:apply", () => toAgentd({ type: "session.network", networkMode: settings.networkMode }));
handleTrusted("policy:get", () => ({ nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode }));
handleTrusted("policy:set", (_e, patch: unknown) => {
  const p = (patch ?? {}) as { nestedAutonomy?: unknown; domainMode?: unknown };
  if (typeof p.nestedAutonomy === "boolean") settings = { ...settings, nestedAutonomy: p.nestedAutonomy };
  if (p.domainMode === "open" || p.domainMode === "ask") settings = { ...settings, domainMode: p.domainMode };
  writeSettings(settingsFile(), settings);
  toAgentd({ type: "policy.set", nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode });
  return { nestedAutonomy: settings.nestedAutonomy, domainMode: settings.domainMode };
});
handleTrusted("sandbox:destroy", () => toAgentd({ type: "session.stop", destroy: true }));
handleTrusted("lease:get", () => leases);
let modelCatalog: Promise<ModelCatalog> | undefined;
let modelCatalogAt = 0;
function getModels(refresh = false): Promise<ModelCatalog> {
  if (!modelCatalog || refresh || Date.now() - modelCatalogAt > 60_000) {
    const config = providerConfig(loadEnv().env);
    modelCatalogAt = Date.now();
    const request = (async (): Promise<ModelCatalog> => ({ provider: config.provider, configuredModel: config.model, ...(config.provider === "openrouter" ? { configuredEffort: config.openrouter.effort } : {}), jevAvailable: !!loadJevKey(loadEnv().env, loadEnv().file), models: config.provider === "codex" ? await account.models() : [] }))();
    modelCatalog = request;
    void request.catch(() => { if (modelCatalog === request) modelCatalog = undefined; });
  }
  return modelCatalog;
}
handleTrusted("models:list", (_e, refresh: unknown) => getModels(refresh === true));
handleTrusted("run:start", async (_e, goal: unknown, opts: unknown) => {
  if (activeRun) throw new Error("A run is already active");
  if (typeof goal !== "string" || !goal.trim()) return;
  const o = (opts ?? {}) as { profile?: unknown; maxTurns?: unknown; modelSelection?: unknown; limits?: unknown; browserEngine?: unknown; playbook?: unknown };
  const playbook = typeof o.playbook === "string" && PLAYBOOK_SLUG.test(o.playbook) ? o.playbook : undefined;
  const browserEngine = o.browserEngine ?? "classic";
  if (browserEngine !== "classic" && browserEngine !== "jev-hybrid" && browserEngine !== "jev-first" && browserEngine !== "jev-auto") throw new Error("Choose Classic, Jev Hybrid, Jev First or Jev Auto");
  if (browserEngine !== "classic" && !loadJevKey(loadEnv().env, loadEnv().file)) throw new Error("Configure TYPESAFE_API_KEY on the host or choose Classic");
  const modelSelection = ModelSelection.parse(o.modelSelection ?? {});
  const limits = o.limits === undefined ? undefined : RunLimits.parse(o.limits);
  if (modelSelection.model) {
    const catalog = await getModels();
    if (catalog.provider !== "codex") throw new Error("Model selection is available for the Codex provider only");
    validateModelSelection(modelSelection, catalog.models);
  }
  if (activeRun) throw new Error("A run is already active");
  const profile = o.profile === "research" || o.profile === "project" || o.profile === "quick" ? o.profile : undefined;
  const maxTurns = Number.isInteger(o.maxTurns) && (o.maxTurns as number) >= 5 && (o.maxTurns as number) <= 400 ? (o.maxTurns as number) : undefined;
  currentGoal = goal.trim().slice(0, 4000);
  toAgentd({ type: "run.start", browserEngine, goal: goal.trim().slice(0, 4000), ...(profile ? { profile } : {}), ...(maxTurns ? { maxTurns } : {}), modelSelection, ...(limits ? { limits } : {}), ...(playbook ? { playbook } : {}) });
});
const playbookSlug = (slug: unknown): string => { if (typeof slug !== "string" || !PLAYBOOK_SLUG.test(slug)) throw new Error("Invalid playbook name"); return slug; };
handleTrusted("playbooks:list", () => queryDaemon("playbooks"));
handleTrusted("playbooks:accept", (_e, slug: unknown) => queryDaemon("playbook_accept", undefined, undefined, undefined, playbookSlug(slug)));
handleTrusted("playbooks:discard", (_e, slug: unknown) => queryDaemon("playbook_discard", undefined, undefined, undefined, playbookSlug(slug)));
// Editing stays in the user's own editor: the file is host data the sandbox never sees.
handleTrusted("playbooks:open", (_e, slug: unknown, draft: unknown) => shell.openPath(path.join(playbooksDir(), draft === true ? "drafts" : "", `${playbookSlug(slug)}.md`)));
handleTrusted("run:get", () => ({ run: currentRun, goal: currentGoal, handoff: handoffReason, sequence: runSequence }));
handleTrusted("run:history", () => queryDaemon("history"));
handleTrusted("conversation:get", () => queryDaemon("conversation"));
handleTrusted("conversation:send", (_e, runId: unknown, message: unknown) => {
  if (typeof runId !== "string" || typeof message !== "string" || !message.trim() || message.length > 4000) throw new Error("Write a message of 1–4,000 characters");
  return queryDaemon("followup", runId, undefined, message.trim());
});
handleTrusted("conversation:pause", (_e, runId: unknown) => {
  if (typeof runId !== "string") throw new Error("Invalid run id");
  return queryDaemon("pause", runId);
});
handleTrusted("browser:restart", () => queryDaemon("browser_restart"));
handleTrusted("run:detail", (_e, id: unknown) => { if (typeof id !== "string") throw new Error("Invalid run id"); return queryDaemon("detail", id); });
handleTrusted("workspace:changes", async () => {
  if (!session.workspacePath) throw new Error("Open a workspace first");
  const result = await command("git", ["status", "--short"], { cwd: session.workspacePath });
  const diff = await command("git", ["diff", "--stat"], { cwd: session.workspacePath });
  return `${result.output || "No working tree changes."}\n\n${diff.output}`;
});
handleTrusted("workspace:output", async (_e, relative: unknown) => {
  if (!session.workspacePath || typeof relative !== "string") throw new Error("Open a workspace first");
  const root = await fs.promises.realpath(session.workspacePath);
  const file = await fs.promises.realpath(path.resolve(root, relative));
  if (file !== root && !file.startsWith(root + path.sep)) throw new Error("Choose an output inside this workspace");
  shell.showItemInFolder(file);
});
handleTrusted("run:stop", () => toAgentd({ type: "run.stop" }));
handleTrusted("run:budget", (_e, runId: unknown, action: unknown) => {
  const parsed = BudgetAction.parse(action);
  if (typeof runId !== "string" || currentRun.runId !== runId || currentRun.state !== "budget_paused") throw new Error("This task is no longer paused at a limit");
  if (browser.manual || browser.transitioning) throw new Error("Finish manual login before resuming the task");
  toAgentd({ type: "run.budget", runId, action: parsed });
});
handleTrusted("run:resume", () => toAgentd({ type: "run.resume" }));
handleTrusted("lease:take", (_e, owner: unknown, surface: unknown) =>
  toAgentd({ type: "lease.take", owner: owner === "agent" ? "agent" : "human", ...(surface === "terminal" || surface === "browser" ? { surface } : {}) }),
);
handleTrusted("approval:decide", (_e, id: unknown, decision: unknown) => {
  if (typeof id === "string" && (decision === "once" || decision === "session" || decision === "deny")) toAgentd({ type: "approval.decide", id, decision });
});
handleTrusted("browser:control", (_e, command: BrowserControl) => queryDaemon("browser", undefined, command));
handleTrusted("browser:get", () => browser);
handleTrusted("browser:start", () => toAgentd({ type: "browser.start" }));
handleTrusted("browser:stop", () => toAgentd({ type: "browser.stop" }));
handleTrusted("browser:navigate", (_e, url: unknown) => {
  if (typeof url === "string" && url.trim()) toAgentd({ type: "browser.navigate", url: url.trim().slice(0, 4096) });
});
onTrusted("browser:input", (_e, event: unknown) => {
  if (event && typeof event === "object") toAgentd({ type: "browser.input", event: event as never });
});
handleTrusted("diagnostics:get", () => diagnosticsState);
handleTrusted("diagnostics:cancel", () => diagnosticsAbort?.abort());
handleTrusted("diagnostics:write", () => writeDiagnostics());
handleTrusted("run:restore", (_e, runId: unknown) => {
  if (typeof runId === "string" && runId) toAgentd({ type: "run.restore", runId });
});
onTrusted("terminal:write", (_e, data: unknown) => {
  if (typeof data === "string" && data.length <= 65_536) toAgentd({ type: "terminal.write", data: new TextEncoder().encode(data) });
});
onTrusted("terminal:ack", (_e, id: unknown) => { if (typeof id === "number") terminalDelivery.acknowledge(id); });
onTrusted("terminal:subscribe", (_e, on: unknown) => terminalDelivery.setReady(on === true));
onTrusted("terminal:refresh", () => toAgentd({ type: "terminal.refresh" }));
handleTrusted("terminal:stalled", () => terminalDelivery.stalled);
onTrusted("terminal:reconnect", () => {
  send("terminal:reset", null);
  terminalDelivery.reset();
  toAgentd({ type: "terminal.refresh" });
});
onTrusted("browser:frameAck", (_e, id: number) => { if (Number.isSafeInteger(id)) toAgentd({ type: "browser.frameAck", id }); });
onTrusted("browser:frames", (_e, on: unknown) => { framesWanted = on === true; syncFrameVisibility(); });
onTrusted("terminal:resize", (_e, cols: unknown, rows: unknown) => {
  if (Number.isInteger(cols) && Number.isInteger(rows)) toAgentd({ type: "terminal.resize", cols: cols as number, rows: rows as number });
});

app.whenReady().then(() => {
  // Without an Edit menu Chromium on Linux has no Ctrl+C/V/X/A accelerators at all: nothing pasted into the goal,
  // the URL bar, the terminal or the sandbox browser. The bar stays hidden (autoHideMenuBar); the roles still fire.
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "fileMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
  settings = readSettings(settingsFile());
  createWindow();
  startAgentd();
});

app.on("window-all-closed", () => { account.cancel(); diagnosticsAbort?.abort(); app.quit(); });
