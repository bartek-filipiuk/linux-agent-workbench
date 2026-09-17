#!/usr/bin/env node
import fs from "node:fs";
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/bench-jev-report.mjs report.json");
const report = JSON.parse(fs.readFileSync(file, "utf8"));
const median = values => { const a = [...values].sort((x, y) => x - y); return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : null; };
const secs = n => n === null ? "—" : (n / 1000).toFixed(2);
console.log(`Primary: ${report.model} (${report.effort}); Jev: ${report.jevModel}. Commit: ${report.commit}${report.dirty ? " + recorded working changes" : ""}.`);
console.log("Times include final independent verification. Success is checked outside the agent. Setup is measured separately. Subscription usage is not priced as API usage.\n");
console.log("| Scenario | Classic success | Hybrid success | Classic median, s | Hybrid median, s | Speed ratio | Hybrid fallbacks |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const scenario of [...new Set(report.results.map(r => r.scenario))]) {
  const rows = report.results.filter(r => r.scenario === scenario);
  const a = rows.filter(r => r.engine === "classic"), b = rows.filter(r => r.engine === "jev-hybrid");
  const goodA = a.filter(r => r.success), goodB = b.filter(r => r.success);
  const paired = goodA.flatMap(x => { const y = goodB.find(y => y.repeat === x.repeat); return y ? [x.taskMs / y.taskMs] : []; });
  console.log(`| ${scenario} | ${goodA.length}/${a.length} | ${goodB.length}/${b.length} | ${secs(median(goodA.map(r => r.taskMs)))} | ${secs(median(goodB.map(r => r.taskMs)))} | ${paired.length ? median(paired).toFixed(2) + "×" : "—"} | ${b.reduce((n, r) => n + (r.fallbacks?.length ?? 0), 0)} |`);
}
const errors = report.results.filter(r => !r.success);
console.log(`\nAll attempts: ${report.results.length}; failed: ${errors.length}. Time medians above use successful attempts; ratios use pairs where both succeeded. Failures are retained, not converted into fast completions.`);
console.log(`Estimated Jev cost: $${report.results.reduce((n, r) => n + (r.jevCostUsd ?? 0), 0).toFixed(6)}. Failed provider requests may also be billed.`);
const hybrid = report.results.filter(r => r.engine === "jev-hybrid");
console.log(`Hybrid attempts with zero Jev decisions: ${hybrid.filter(r => !r.jevCalls).length}/${hybrid.length}. These remain in the comparison.`);
for (const engine of ["classic", "jev-hybrid"]) {
  const rows = report.results.filter(r => r.engine === engine);
  console.log(`${engine}: ${rows.reduce((n, r) => n + (r.primaryCalls ?? 0), 0)} primary calls, ${rows.reduce((n, r) => n + (r.jevCalls ?? 0), 0)} Jev decisions, ${rows.reduce((n, r) => n + (r.approvals ?? 0), 0)} denied approval requests.`);
}
for (const r of errors) console.log(`Failure: ${r.scenario} #${r.repeat} ${r.engine}: ${r.error ?? r.verificationError ?? r.endReason ?? "independent check failed"}`);
