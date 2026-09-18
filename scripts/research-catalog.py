#!/usr/bin/env python3
"""Rebuild the publication inventory from retained evidence, without model calls."""
import csv
import gzip
import hashlib
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BENCH = ROOT / "docs/benchmarks"
OUT = ROOT / "docs/research"


def read(path):
    return json.loads(path.read_text())


series = []
trials = []


def add(path, data, stage, kind, member=None):
    rows = data["results"]
    source = str(path.relative_to(ROOT)) + (f"#{member}" if member else "")
    cost = Decimal(0)
    unknown = 0
    for i, row in enumerate(rows, 1):
        if "costUsd" in row:
            value = row["costUsd"]
            known = Decimal(str(value or 0))
            unknown += value is None
        elif kind == "driver":
            known = Decimal(str(row["jev"].get("costUsd", 0)))
        else:
            known = Decimal(str(row.get("jevCostUsd", 0)))
            primary = row.get("primaryCostUsd")
            unknown += primary is None
            known += Decimal(str(primary or 0))
        cost += known
        success = row.get("success", row.get("passed"))
        selected_auto = (stage == "auto" and kind == "final-file" and
                         (path.name != "final-local.json" or row.get("task") not in ("research-offers", "tabs")))
        cohort = "auto-selected" if selected_auto else "auto-interrupted-block" if stage == "auto" and kind == "final-file" else stage + "/" + kind
        trials.append({
            "source": source, "row": i, "stage": stage, "kind": kind, "cohort": cohort,
            "task": row.get("task", row.get("scenario", row.get("id", ""))),
            "engine": row.get("engine", row.get("mode", "")),
            "model": row.get("model", data.get("model", "")),
            "repeat": row.get("repeat", ""), "success": success,
            "task_ms": row.get("taskMs", ""), "setup_ms": row.get("setupMs", ""),
            "routing_ms": row.get("elapsedMs", "") if kind == "routing" else "",
            "driver_ms": row.get("result", [{}])[0].get("elapsedMs", "") if kind == "driver" else "",
            "primary_ms": row.get("primaryMs", ""), "jev_ms": row.get("jevMs", ""),
            "primary_calls": row.get("primaryCalls", ""), "jev_calls": row.get("jevCalls", ""),
            "known_usd": str(known),
            "primary_cost_unknown": (row.get("primaryCostUsd") is None if stage == "historical" and kind != "driver" else ""),
            "state": row.get("state", ""), "end_reason": row.get("endReason", ""),
            "error": row.get("error", ""),
        })
    series.append({"source": source, "stage": stage, "kind": kind, "records": len(rows),
                   "successes": sum(r.get("success", r.get("passed")) is True for r in rows),
                   "knownUsd": str(cost), "unknownPrimaryCostRecords": unknown,
                   "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})


HISTORY_FINAL = {
    "jev-2026-09-17.json", "jev-first-comparison-2026-09-17.json",
    "jev-first-luna-final-2026-09-17.json", "jev-openrouter-local-2026-09-17.json",
    "jev-openrouter-flights-2026-09-17.json",
}
for path in sorted(BENCH.glob("*.json")):
    data = read(path)
    if "results" not in data or "desktop" in path.name:
        continue
    kind = "driver" if "driver" in path.name else "final" if path.name in HISTORY_FINAL else "diagnostic"
    add(path, data, "historical", kind)

POC = BENCH / "browser-poc/results"
for name in ("final-flights.json", "final-local.json"):
    add(POC / name, read(POC / name), "poc", "final")
diagnostics = POC / "diagnostics.json.gz"
for name, data in sorted(json.loads(gzip.decompress(diagnostics.read_bytes())).items()):
    add(diagnostics, data, "poc", "stop" if name.startswith("stop") else "headful" if name.startswith("headed") else "pilot", name)

AUTO = BENCH / "jev-auto"
for path in sorted(AUTO.glob("*.json")):
    data = read(path)
    if "results" not in data:
        continue
    kind = ("routing" if path.name.startswith("decisions") else "final-file" if path.name.startswith("final")
            else "stop" if path.name.startswith("stop") else "headful" if path.name.startswith("headful")
            else "credit-check" if path.name.startswith("credit") else "pilot")
    add(path, data, "auto", kind)

counts = Counter()
totals = Counter()
for entry in series:
    counts[entry["stage"] + "/" + entry["kind"]] += entry["records"]
    totals[entry["stage"]] += Decimal(entry["knownUsd"])
runner = [r for r in trials if r["kind"] not in ("routing", "driver")]
assert len(runner) == 606, len(runner)
assert sum(r["kind"] == "routing" for r in trials) == 78
assert sum(r["kind"] == "driver" for r in trials) == 8
assert sum(r["stage"] == "poc" for r in runner) == 126
selected = [r for r in runner if r["cohort"] == "auto-selected"]
assert len(selected) == 119 and all(r["success"] for r in selected)
assert abs(totals["poc"] - Decimal("4.295353056")) < Decimal("0.000000001"), totals["poc"]
assert abs(totals["auto"] - Decimal("4.783456077")) < Decimal("0.000000001"), totals["auto"]
desktop = read(AUTO / "validation/desktop-usage.json")
desktop_cost = sum((Decimal(str(r["cost_usd"])) for r in desktop["runs"]), Decimal(0))
assert abs(desktop_cost - Decimal(str(desktop["costUsd"]))) < Decimal("0.000000001")
known_total = sum(totals.values(), Decimal(0)) + desktop_cost
desktop_sources = []
for path in sorted(BENCH.glob("*desktop*.json")) + sorted(AUTO.glob("desktop-*.json")):
    data = read(path)
    checks = data if isinstance(data, list) else data["checks"]
    desktop_sources.append({"source": str(path.relative_to(ROOT)), "checks": len(checks),
                            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
desktop_checks = sum(s["checks"] for s in desktop_sources)
assert desktop_checks == 24

summary = {"scope": "Retained historical evidence through 2026-09-18; no new live tests. Missing usage and subscription costs are unknown, not zero.",
           "runnerRecords": len(runner), "routingCases": 78, "directDriverCases": 8,
           "desktopChecks": desktop_checks, "desktopSources": desktop_sources, "counts": dict(sorted(counts.items())),
           "knownCostByStageUsd": {k: f"{v:.9f}" for k,v in totals.items()},
           "autoDesktopReportedUsd": f"{desktop_cost:.9f}", "knownTotalUsd": f"{known_total:.9f}", "series": series}
OUT.mkdir(exist_ok=True)
(OUT / "inventory.json").write_text(json.dumps(summary, indent=2) + "\n")
with (OUT / "trials.csv").open("w", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=list(trials[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(trials)

lines = ["# Cost ledger", "", "Generated by `python3 scripts/research-catalog.py` from retained evidence. Amounts are USD. This pass makes no paid API calls.", "",
         "| Scope (disjoint) | Known usage + Jev estimate, USD |", "| --- | ---: |",
         f"| Earlier app series, pilots and 8 direct-driver checks | {totals['historical']:.9f} |",
         f"| Entire earlier PoC, including pilots, Stop and headful | {totals['poc']:.9f} |",
         f"| Auto runners and routing checks | {totals['auto']:.9f} |",
         f"| Auto desktop usage, 10 recorded runs | {desktop_cost:.9f} |",
         f"| **Known retained total** | **{known_total:.9f}** |", "",
         "This is a partial accounting of the experiments, not the total project bill. Codex subscription calls have no allocated per-call dollar price. Earlier desktop checks have no retained usage ledger here. Failed/interrupted requests may be billed without returning usage. Infrastructure, subscriptions, taxes and the coding agent's own work are excluded. Never describe missing costs as free.", "",
         "OpenRouter costs come from returned `usage.cost`; Jev uses input tokens × the configured historical $0.042 per million tokens. This is a recorded benchmark assumption, not a claim about today's tariff. Combined `costUsd` already includes the runner's Jev estimate; do not add it again. A reported zero after a failure means no returned charge, not guaranteed zero billing.", "",
         "Subsets for reference: the earlier PoC's 102 final attempts cost $3.998840412; the Auto comparison's selected 119 attempts cost $3.717715692. These are already included above. Auto runners/routing plus desktop total $4.885782663. Historical subscription-provider results report only their known Jev portion.", "",
         "The source ledger below counts each canonical result record once. Compressed traces, summary files, validation copies and the Markdown/CSV exports are not additional paid runs. Auto final files include the interrupted 18-record block as well as the 119 selected comparison records; all their known charges remain included.", "",
         "| Source | Kind | Records | Known USD | Records with unknown primary cost |", "| --- | --- | ---: | ---: | ---: |"]
for s in series:
    path, _, member = s["source"].partition("#")
    target = "../../" + path
    label = Path(path).name + (":" + member if member else "")
    lines.append(f"| [{label}]({target}) | {s['stage']}/{s['kind']} | {s['records']} | {Decimal(s['knownUsd']):.9f} | {s['unknownPrimaryCostRecords']} |")
lines += ["", "Machine-readable sources: [inventory and hashes](inventory.json), [per-record CSV](trials.csv), [desktop usage](../benchmarks/jev-auto/validation/desktop-usage.json). CSV row numbers are 1-based offsets in each source `results` list; diagnostics members identify the named document inside the compressed archive. Routing success measures the test's expected category, not end-to-end completion. Direct-driver checks have a different clock. Do not merge these into one benchmark success rate.", ""]
(OUT / "COSTS.md").write_text("\n".join(lines))
print(json.dumps({k:v for k,v in summary.items() if k != "series"}, indent=2))
