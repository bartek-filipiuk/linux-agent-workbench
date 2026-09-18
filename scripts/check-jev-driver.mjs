#!/usr/bin/env node
// Opt-in live TypeSafe test: scripted planner dispatch, real driver/policy/browser, no planner fallback.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readJevKey } from "./jev-key.mjs";
import { checkFixtures } from "./check-jev-fixtures.mjs";
import { startFixtures, scenarios } from "./jev-fixtures.mjs";
import { BrowserSession } from "../services/browser-worker/dist/browser-session.js";
import { Store, RunController, FakeModelAdapter, BrowserActionPolicy, browserExecutor } from "../services/agentd/dist/index.js";
import { JevClient, JevConfig } from "../services/agentd/dist/provider/jev.js";

const configFile = path.join(os.homedir(), ".config/linux-agent-workbench-jev/.env");
const env = Object.fromEntries((fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => l.split(/=(.*)/s).slice(0, 2)));
const config = JevConfig.parse({ apiKey: await readJevKey(configFile, env), model: env.TYPESAFE_MODEL ?? "jev-1.13.0" });
const site = await startFixtures();
const results = [];
const output = process.argv[2] ?? path.join(os.tmpdir(), `jev-driver-${Date.now()}.json`);
const values = { search: [{ name: "search query", text: "blue notebook" }], autocomplete: [{ name: "destination", text: "Paris" }], form: [{ name: "contact name", text: "Ada" }] };
try {
  await checkFixtures(site.url);
  for (const task of scenarios) {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "law-jev-driver-"));
    const browser = new BrowserSession({ profileDir, viewport: { width: 1000, height: 700 } });
    const store = new Store(":memory:");
    let rc, timer, observation;
    const record = { scenario: task.id, success: false };
    try {
      await browser.start();
      await browser.context.route("**/*", route => new URL(route.request().url()).origin === site.url ? route.continue() : route.abort("blockedbyclient"));
      await browser.navigate(`${site.url}/${task.id}`);
      const target = { status: { state: "ready" }, observe: async input => observation = await browser.observe(input), act: action => browser.act(action), read: input => browser.read(input), wait: input => browser.wait(input) };
      const adapter = new FakeModelAdapter([{ toolCalls: [{ name: "browser_task", args: { goal: task.goal, values: values[task.id] ?? [] } }] }, { text: "Driver returned; independent verification follows." }]);
      rc = new RunController({ store, adapter, worker: { cancel() {} }, tools: browserExecutor(target),
        policy: new BrowserActionPolicy({ lastObservation: () => observation, allowPrivate: true, approvals: { isSessionAllowed: () => false, request: async () => "deny" } }),
        budgets: { maxTurns: 30, maxToolCalls: 70, maxDurationMs: 45_000, maxCostUsd: 0.02 },
        hybrid: { evaluator: new JevClient(config), observation: () => observation, minConfidence: config.minConfidence },
      }, { workspaceId: store.createWorkspace(profileDir), goal: task.goal, networkMode: "open" });
      rc.on("state", state => { if (state === "budget_paused" || state === "handoff") rc.stop("test_limit"); });
      timer = setTimeout(() => rc.stop("test_timeout"), 50_000);
      await rc.start();
      const content = await browser.read({ scope: "page" });
      record.success = content.content.includes(task.expected) && rc.stats.jev.decisions > 0;
      record.jev = rc.stats.jev;
      record.decisions = store.listEvents(rc.runId).filter(e => e.type === "jev.decision").map(e => e.payload);
      record.result = store.listEvents(rc.runId).filter(e => e.type === "browser.task").map(e => e.payload);
      record.tools = store.listToolCalls(rc.runId).map(t => ({ name: t.name, status: t.status, input: JSON.parse(t.input_json), output: t.output_json }));
    } catch (error) { record.error = String(error.message).replace(/apikey_[A-Za-z0-9_-]+/g, "[redacted]"); }
    finally { clearTimeout(timer); rc?.stop(); await browser.close().catch(() => {}); store.close(); fs.rmSync(profileDir, { recursive: true, force: true }); }
    results.push(record);
    console.log(`${task.id}: ${record.success ? "PASS" : "INCOMPLETE"}; Jev decisions=${record.jev?.decisions ?? 0}; ${record.result?.[0]?.reason ?? record.error ?? ""}`);
  }
} finally { await site.close(); fs.writeFileSync(output, JSON.stringify({ mode: "Real Jev driver, scripted dispatch, no primary-model fallback; one attempt per scenario", results }, null, 2), { mode: 0o600 }); }
console.log(`Report: ${output}`);
if (results.some(r => !r.success)) process.exitCode = 1;
