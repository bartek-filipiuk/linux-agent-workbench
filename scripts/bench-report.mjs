#!/usr/bin/env node
// Prints timing and token figures for the last N runs so two models can be compared on one goal.
// model time = wall time - time spent inside tool calls (terminal, browser, nested agents, approvals).
// Usage: node scripts/bench-report.mjs [count] [--prices IN_USD_PER_MTOK,OUT_USD_PER_MTOK] [--db path/to/state.sqlite]
// Cached input tokens are billed at a tenth of the input price (OpenAI); cost is recomputed from --prices when given.
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const count = Number(argv.find((a) => /^\d+$/.test(a)) ?? 2);
const prices = flag("--prices")?.split(",").map(Number);
const file = flag("--db") ?? path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"), "linux-agent-workbench", "state.sqlite");
const db = new DatabaseSync(file, { readOnly: true });
const CACHED_INPUT_FACTOR = 0.1;

const runs = db.prepare(`SELECT id, model, goal, state, started_at, ended_at, turns, tool_calls, cost_usd FROM runs ORDER BY started_at DESC LIMIT ?`).all(count);
const sec = (ms) => `${(ms / 1000).toFixed(1)}s`;

for (const r of runs.reverse()) {
  const calls = db.prepare(`SELECT name, started_at, ended_at, status FROM tool_calls WHERE run_id = ? ORDER BY started_at`).all(r.id);
  const usage = db.prepare(`SELECT COALESCE(SUM(input_tokens),0) AS i, COALESCE(SUM(output_tokens),0) AS o, COALESCE(SUM(cached_tokens),0) AS c, COUNT(*) AS n FROM provider_usage WHERE run_id = ?`).get(r.id);
  const wall = (r.ended_at ?? Date.now()) - r.started_at;
  const toolMs = calls.reduce((s, c) => s + Math.max(0, (c.ended_at ?? r.ended_at ?? Date.now()) - c.started_at), 0);
  const byTool = {};
  for (const c of calls) byTool[c.name] = (byTool[c.name] ?? 0) + Math.max(0, (c.ended_at ?? r.ended_at ?? Date.now()) - c.started_at);
  // Time the human took (approval cards, handoffs) is neither the model's nor the tools'.
  const events = db.prepare(`SELECT ts, type, payload_json FROM run_events WHERE run_id = ? ORDER BY seq`).all(r.id);
  let humanMs = 0;
  const openApprovals = new Map();
  let handoffStart;
  for (const e of events) {
    const p = JSON.parse(e.payload_json);
    if (e.type === "approval.requested") openApprovals.set(p.id, e.ts);
    if (e.type === "approval.decided" && openApprovals.has(p.id)) { humanMs += e.ts - openApprovals.get(p.id); openApprovals.delete(p.id); }
    if (e.type === "handoff.start") handoffStart = e.ts;
    if (e.type === "handoff.end" && handoffStart !== undefined) { humanMs += e.ts - handoffStart; handoffStart = undefined; }
  }
  if (handoffStart !== undefined) humanMs += (r.ended_at ?? Date.now()) - handoffStart;
  for (const ts of openApprovals.values()) humanMs += (r.ended_at ?? Date.now()) - ts;
  const modelMs = Math.max(0, wall - toolMs - humanMs);
  console.log(`\n== ${r.model} · ${r.state} · ${new Date(r.started_at).toISOString()} · run ${r.id.slice(0, 8)}`);
  console.log(`goal: ${r.goal.slice(0, 100)}${r.goal.length > 100 ? "…" : ""}`);
  console.log(`wall ${sec(wall)} = model ${sec(modelMs)} + tools ${sec(toolMs)} + human ${sec(humanMs)}`);
  console.log(`turns ${r.turns} (${usage.n} responses) · tool calls ${calls.length} · per turn: model ${sec(modelMs / Math.max(1, r.turns))}`);
  const cachedPct = usage.i ? Math.round((100 * usage.c) / usage.i) : 0;
  const billable = usage.i - usage.c + usage.c * CACHED_INPUT_FACTOR;
  const cost = prices ? (billable * prices[0] + usage.o * prices[1]) / 1_000_000 : r.cost_usd || undefined;
  console.log(`tokens in ${usage.i} (cached ${usage.c}, ${cachedPct}%) · billable-equivalent in ${Math.round(billable)} · out ${usage.o} · cost ${cost !== undefined ? `$${cost.toFixed(4)}` : "n/a (pass --prices)"}`);
  console.log(`tools: ${Object.entries(byTool).map(([k, v]) => `${k} ${sec(v)}`).join(", ") || "none"}`);
  const failed = calls.filter((c) => c.status !== "done").map((c) => `${c.name}:${c.status}`);
  if (failed.length) console.log(`non-done calls: ${failed.join(", ")}`);
}
