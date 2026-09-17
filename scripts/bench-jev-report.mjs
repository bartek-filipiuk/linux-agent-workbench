#!/usr/bin/env node
import fs from "node:fs";
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/bench-jev-report.mjs report.json");
const report = JSON.parse(fs.readFileSync(file, "utf8"));
const median = values => { const a = [...values].sort((x, y) => x - y); return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : null; };
const secs = n => n === null ? "—" : (n / 1000).toFixed(2);
const key = r => `${r.engine}/${r.model ?? report.model}`;
const variants = [...new Set(report.results.map(key))];
const baseline = variants.find(v => v.startsWith("classic/")) ?? variants[0];
console.log(`Effort: ${report.effort}; Jev: ${report.jevModel}. Commit: ${report.commit}${report.dirty ? " + recorded working changes" : ""}.`);
console.log("Times include independent final verification; browser setup is separate. Success is checked outside the agent. Subscription usage is not priced as API usage.\n");
console.log("| Scenario | Engine / model | Success | Median, s | Paired speed vs baseline | Primary calls | Jev decisions | Fallbacks |");
console.log("|---|---|---:|---:|---:|---:|---:|---:|");
for (const scenario of [...new Set(report.results.map(r => r.scenario))]) for (const variant of variants) {
  const rows = report.results.filter(r => r.scenario === scenario && key(r) === variant);
  const good = rows.filter(r => r.success);
  const pairs = good.flatMap(r => { const b = report.results.find(b => b.scenario === scenario && key(b) === baseline && b.repeat === r.repeat && b.success); return b ? [b.taskMs / r.taskMs] : []; });
  console.log(`| ${scenario} | ${variant} | ${good.length}/${rows.length} | ${secs(median(good.map(r => r.taskMs)))} | ${pairs.length ? median(pairs).toFixed(2) + "×" : "—"} | ${rows.reduce((n, r) => n + (r.primaryCalls ?? 0), 0)} | ${rows.reduce((n, r) => n + (r.jevCalls ?? 0), 0)} | ${rows.reduce((n, r) => n + (r.fallbacks?.length ?? 0), 0)} |`);
}
console.log(`\nBaseline: ${baseline}. Medians use successful attempts; ratios require both paired attempts to succeed. All failures are retained.`);
for (const variant of variants) {
  const rows = report.results.filter(r => key(r) === variant);
  const errors = rows.flatMap(r => r.jevErrors ?? []).reduce((counts, e) => { const code = e.httpStatus ?? e.reason; counts[code] = (counts[code] ?? 0) + 1; return counts; }, {});
  console.log(`${variant}: ${rows.filter(r => r.success).length}/${rows.length} success; ${rows.filter(r => !r.jevCalls).length} with zero Jev decisions; primary ${secs(rows.reduce((n, r) => n + (r.primaryMs ?? 0), 0))}s; Jev ${secs(rows.reduce((n, r) => n + (r.jevMs ?? 0), 0))}s; Jev errors ${JSON.stringify(errors)}.`);
}
console.log(`Estimated Jev cost: $${report.results.reduce((n, r) => n + (r.jevCostUsd ?? 0), 0).toFixed(6)}. Failed provider requests may also be billed.`);
for (const r of report.results.filter(r => !r.success)) console.log(`Failure: ${r.scenario} #${r.repeat} ${key(r)}: ${r.error ?? r.verificationError ?? r.endReason ?? "independent check failed"}`);
