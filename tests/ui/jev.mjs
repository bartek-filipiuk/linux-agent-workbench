import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../services/browser-worker/node_modules/playwright/index.mjs";
const root = fileURLToPath(new URL("../../apps/desktop/out/renderer/", import.meta.url));
const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "law-jev-ui-"));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"); const file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
  try { res.end(fs.readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = []; page.on("pageerror", error => errors.push(error.message));
await page.addInitScript(() => {
  const listeners = {}; const emit = (name, value) => (listeners[name] ?? []).forEach(fn => fn(value));
  const calls = []; window.fixture = { calls, emit };
  const api = {
    getStatus: async () => ({ type: "agentd.ready", model: "Codex subscription", schemaVersion: 5 }),
    getSession: async () => ({ state: "ready", workspacePath: "/workspace/demo", networkMode: "open" }),
    getNetwork: async () => "open", getPolicy: async () => ({ nestedAutonomy: true, domainMode: "open" }),
    getLease: async () => ({ terminal: { owner: "human" }, browser: { owner: "human" } }),
    getBrowser: async () => ({ state: "ready", manual: false }),
    getRun: async () => ({ run: { activityVersion: 0, turns: 0, toolCalls: 0, costUsd: null, snapshot: false, log: [], approvals: [] }, sequence: 0 }),
    getHistory: async () => [], getConversation: async () => null, getTerminalStalled: async () => false,
    checkSetup: async () => ({ provider: "codex", account: { state: "ready" }, podman: true, image: true, providerReady: true, workspace: "/workspace/demo" }),
    getModels: async () => ({ provider: "codex", configuredModel: "codex-default", models: [], jevAvailable: !location.search.includes("missing") }),
    getDiagnostics: async () => ({ running: false, step: "" }),
    startRun: async (goal, options) => { calls.push({ goal, options }); emit("onRun", { type: "run.state", runId: "test", state: "running", goal, browserEngine: options.browserEngine, turns: 5, toolCalls: 7, costUsd: null, snapshot: false, jev: { decisions: 3, elapsedMs: 620, costUsd: 0.00014, fallbacks: 0 } }); },
  };
  window.workbench = new Proxy(api, { get: (o, key) => key in o ? o[key] : String(key).startsWith("on") ? fn => { (listeners[key] ??= []).push(fn); return () => { listeners[key] = listeners[key].filter(f => f !== fn); }; } : () => Promise.resolve() });
});
try {
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url); await page.getByLabel("Browser engine", { exact: true }).selectOption("jev-first");
  await page.getByLabel("What should the agent do?", { exact: true }).fill("Find a notebook and compare its options.");
  await page.getByRole("button", { name: "Expand editor" }).click();
  for (const [width, height, name] of [[1400, 900, "desktop"], [1024, 768, "compact"]]) {
    await page.setViewportSize({ width, height });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Page overflows horizontally");
    await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
  }
  await page.getByRole("button", { name: "Start task", exact: true }).click();
  await page.getByText(/Jev: 3 decisions/).waitFor();
  const calls = await page.evaluate(() => window.fixture.calls);
  if (calls.length !== 1 || calls[0].options.browserEngine !== "jev-first") throw new Error("Engine was not sent exactly once");
  await page.goto(`${url}/?missing`);
  await page.getByText(/Jev is not configured/).waitFor();
  if (await page.getByRole("button", { name: "Start task", exact: true }).isEnabled()) throw new Error("Missing key allowed start");
  await page.getByLabel("Browser engine", { exact: true }).selectOption("classic");
  await page.getByRole("button", { name: "Start task", exact: true }).click();
  if ((await page.evaluate(() => window.fixture.calls))[0]?.options.browserEngine !== "classic") throw new Error("Classic fallback unavailable");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ passed: true, artifacts }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
