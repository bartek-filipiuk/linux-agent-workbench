// Opt-in live Electron → daemon → container smoke. Uses real model quota and the isolated Jev profile.
// Close the Jev app first; configure a workspace and both providers before running.
import { _electron } from "../../services/browser-worker/node_modules/playwright/index.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.LAW_INSTANCE !== "jev") throw new Error("Run with LAW_INSTANCE=jev to use the isolated experiment");
const root = fileURLToPath(new URL("../../", import.meta.url));
const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "law-jev-first-desktop-"));
const output = process.env.LAW_DESKTOP_TEST_OUTPUT ?? path.join(artifacts, "result.json");
const app = await _electron.launch({ executablePath: path.join(root, "apps/desktop/node_modules/electron/dist/electron"), args: [path.join(root, "apps/desktop")], env: { ...process.env, ELECTRON_RENDERER_URL: "" }, timeout: 30000 });
const report = { passed: false, artifacts, checks: [] };
const errors = [];
async function waitUntil(fn, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return; await new Promise(r => setTimeout(r, 150)); }
  throw new Error("State wait timed out");
}
try {
  const page = await app.firstWindow(); page.on("pageerror", e => errors.push(e.message));
  await page.waitForFunction(() => window.workbench !== undefined);
  await waitUntil(() => page.evaluate(async () => (await window.workbench.getStatus()).type === "agentd.ready"), 30000);
  await waitUntil(() => page.evaluate(async () => (await window.workbench.getSession()).state === "ready"));
  async function newTask(engine, goal, model) {
    const previousId = (await page.evaluate(() => window.workbench.getRun())).run.runId;
    if (await page.getByRole("button", { name: "New task", exact: true }).count()) await page.getByRole("button", { name: "New task", exact: true }).click();
    await page.getByLabel("Browser engine", { exact: true }).selectOption(engine);
    await page.getByLabel("What should the agent do?", { exact: true }).fill(goal);
    if (model) {
      const details = page.locator(".composer-model");
      if (!await details.evaluate(e => e.open)) await details.locator("summary").click();
      await page.locator("#run-model").selectOption(model);
      await page.locator("#run-effort").selectOption("low");
    }
    await page.getByRole("button", { name: "Start task", exact: true }).click();
    await waitUntil(() => page.evaluate(async id => { const r = (await window.workbench.getRun()).run; return !!r.runId && r.runId !== id; }, previousId), 30000);
  }
  const started = Date.now();
  await newTask("jev-first", "Open https://example.com, open its More information link, then report the resulting page title and URL. Use only the browser.", "gpt-5.6-luna");
  await waitUntil(() => page.evaluate(async () => ["completed", "failed", "stopped", "handoff"].includes((await window.workbench.getRun()).run.state)), 120000);
  const run = (await page.evaluate(() => window.workbench.getRun())).run;
  const browser = await page.evaluate(() => window.workbench.getBrowser());
  const passed = run.state === "completed" && run.browserEngine === "jev-first" && run.jev?.decisions > 0 && new URL(browser.url).hostname === "www.iana.org" && new URL(browser.url).pathname === "/help/example-domains" && browser.title === "Example Domains";
  report.checks.push({ check: "first_luna_navigation", passed, elapsedMs: Date.now() - started, state: run.state, engine: run.browserEngine, jev: run.jev, browser: { url: browser.url, title: browser.title }, final: run.finalText });
  if (!passed) throw new Error("Jev First live navigation failed independent URL check");
  for (const [width, height, name] of [[1400, 900, "desktop"], [1024, 768, "compact"]]) {
    await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(...size), [width, height]);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Horizontal overflow");
    await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
  }
  await newTask("jev-first", "Open https://example.com, then follow its More information link. Find five technical standards, visit each standard's page and report its title. Use only the browser.");
  await waitUntil(() => page.evaluate(async () => (await window.workbench.getRun()).run.state === "running"), 30000);
  const stoppedAt = Date.now();
  await page.getByRole("button", { name: "Stop task", exact: true }).click();
  await waitUntil(() => page.evaluate(async () => (await window.workbench.getRun()).run.state === "stopped"), 15000);
  report.checks.push({ check: "stop", passed: true, elapsedMs: Date.now() - stoppedAt });
  await newTask("classic", "Open https://example.com and report its page title. Use only the browser.");
  await waitUntil(() => page.evaluate(async () => ["completed", "failed", "stopped", "handoff"].includes((await window.workbench.getRun()).run.state)), 120000);
  const classic = (await page.evaluate(() => window.workbench.getRun())).run;
  const classicBrowser = await page.evaluate(() => window.workbench.getBrowser());
  const classicPassed = classic.state === "completed" && classic.browserEngine === "classic" && !classic.jev && new URL(classicBrowser.url).hostname === "example.com" && classicBrowser.title === "Example Domain";
  report.checks.push({ check: "classic_after_stop", passed: classicPassed, state: classic.state, browser: { url: classicBrowser.url, title: classicBrowser.title } });
  if (!classicPassed) throw new Error("Classic after Stop failed independent page check");
  if (errors.length) throw new Error(errors.join("\n"));
  // Leave the new task form ready with the measured candidate, without starting another run.
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Browser engine", { exact: true }).selectOption("jev-first");
  await page.getByLabel("Browser engine", { exact: true }).blur();
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.message : "Desktop smoke failed";
  process.exitCode = 1;
} finally {
  await app.close();
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...report, errors, output }));
}
