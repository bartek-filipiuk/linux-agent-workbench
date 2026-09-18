# Research and publication kit

Evidence collected on September 17–18, 2026; consolidated on September 18. This documentation pass did not rerun paid benchmarks or change the application. The application source is on `experiment/jev-auto`, based on the existing Linux Agent Workbench repository. The research snapshot is included here so readers do not need adjacent local worktrees to inspect the evidence.

## Start here

| Material | Purpose |
| --- | --- |
| [All results, English archive](ALL-RESULTS.md) | Every retained runner attempt, stage-by-stage interpretation, failures, timing breakdowns and original provenance |
| [Test catalog and methodology](TEST-CATALOG.md) | Exact tasks, success criteria, conditions, limits and what was not tested |
| [Cost ledger](COSTS.md) | Disjoint costs, unknowns and each canonical source |
| [Inventory](inventory.json) / [CSV](trials.csv) | Source hashes and 692 rows: 606 runner records, 78 routing cases, 8 driver cases; desktop checks are separate |
| [Final Auto report](../jev-auto-results.md) | Full 119-trial comparison, routing diagnostics and validation |
| [Chart PNG](../benchmarks/jev-auto/comparison.png) / [SVG](../benchmarks/jev-auto/comparison.svg) | Medians, min–max and sample sizes; suitable for an article or video |
| [Application and routing](../APPLICATION.md) | What actually ships, how methods are selected, data flow, security and setup |
| [Release readiness](../RELEASE-READINESS.md) | What remains before one public source release |

## Latest matched comparison

Successful task-time medians in seconds. Each local cell has 3 attempts; Flights has 5. All 119 attempts in this selected comparison passed independent final verification. An em dash means unmeasured in this series.

| Task | Jev Auto | Jev First | Browser Use | Jev Ultrafast |
| --- | ---: | ---: | ---: | ---: |
| Search | 4.64 | 5.23 | 6.68 | — |
| Filters | 4.98 | 3.84 | 6.07 | — |
| Autocomplete | 8.72 | 4.61 | 9.43 | — |
| Six-stage form | 13.35 | 30.08 | 24.28 | — |
| Ten-stage form | 26.14 | 74.49 | 40.21 | — |
| Compare hotel offers | 4.71 | 12.26 | 8.99 | — |
| Read and compare three hosting offers | 13.72 | 18.97 | 29.03 | — |
| New tab | 5.99 | 5.15 | 7.05 | — |
| Four-stage form, changed data | 10.29 | 14.77 | 15.01 | — |
| Hotel comparison, changed data | 3.99 | 8.27 | 12.93 | — |
| Autocomplete, changed data | 4.76 | 4.91 | 12.84 | — |
| Google Flights | 21.79 | 36.82 | 35.45 | 13.32 |

Auto's median ten-stage form took 64.9% less time than First; Flights took 40.8% less. These are ratios of medians in this comparison, not universal speedups. Auto lost to First on several simple interactions. Its Flights range was 17.83–64.02 seconds, and Ultrafast remained faster there. Each engine used Gemini `google/gemini-3.8-flash / low`, pinned to `google-ai-studio` through OpenRouter; Jev was `jev-1.13.0`. Model identifiers describe the recorded experiment, not a current availability promise.

## What the complete history supports

The first optional Hybrid barely improved the total elapsed time and did not use Jev in 28/40 attempts. First made delegation explicit. A faster main planner reduced latency. Native Ultrafast then demonstrated a much faster mechanical loop on Flights, but failed six reasoning tasks and did not independently finish three new-tab tasks in the earlier PoC. Browser Use batched long forms effectively. Auto combines short Jev subgoals with planner-led reading and guarded batches inside the existing app.

This supports keeping one application and improving its execution loop. It does not establish an optimal universal router, prove that lowering confidence is sufficient, or justify replacing the entire app with Browser Use. Gemini is the main planner in the measured configuration; Jev is not the top-level router. Browser Use and Ultrafast remain benchmark references outside the shipped runtime.

The external “7 seconds” result belongs to the author's **Jev Ultrafast** setup using Mercury and a different clock. Our earlier matched Gemini PoC produced 11.42 s median over 10 Flights attempts. The later frozen comparison produced 13.32 s over 5 attempts. Neither should be presented as reproducing the author's exact conditions or pooled with the other series. Pinned original references and the author's timing breakdown are retained in [the historical archive](ALL-RESULTS.md#referencja).

## Publication rules

- Always show the task, engine, model/provider, sample size, completion rate and clock boundaries with a timing claim. Include failures and slow attempts.
- The 606 runner records include pilots, diagnostic failures and intentional Stop tests. They are not 606 independent successful benchmark tasks. The 383 earlier final comparisons and 119 latest selected attempts are different series, not one ranking.
- Routing classification, direct-driver success, UI Stop latency and final-task completion have different meanings. Do not combine them into one success percentage.
- The held-out tasks change values in known fixtures. They are not unseen websites. Most tasks are local synthetic pages; Flights is the live-site exception.
- We did not test Browser Use's own hosted models/cloud. The recorded Browser Use results concern the pinned open-source agent with Gemini.
- Production output is checked by the planner against fresh evidence. The benchmark adds a separate deterministic verifier. The application does not have a universal deterministic verifier for arbitrary tasks.
- Known retained cost is about **$11.05**, with explicit omissions in [the ledger](COSTS.md). Do not call this the full development bill.

A useful article/video sequence is: define the 7-second clock; show the initial weak Hybrid result; show the native fast loop and its reasoning failures; explain batching; demonstrate Auto's task-dependent improvements; show its slow Flights attempt; conclude with the actual routing and permission boundaries.

## Rebuild this evidence package

From the repository root, using Python 3:

```bash
python3 scripts/research-catalog.py
python3 scripts/research-report.py
python3 experiments/browser-auto/summarize.py --input docs/benchmarks/jev-auto --output /tmp/auto-tables.md
# Requires Matplotlib:
python3 experiments/browser-auto/plot.py --input docs/benchmarks/jev-auto --output /tmp/auto-charts
```

These commands use local evidence and spend no API credits. The inventory script asserts record counts and reconciles known costs. CSV source row numbers are 1-based; named members of `diagnostics.json.gz` identify the original diagnostic documents. It does not count trace copies or summaries again.

The [consolidation audit](consolidation-audit.json) records source/import hash checks, local links and anchors, CSV counts, a scoped credential-pattern scan including reachable history and compressed archives, and confirmation that application runtime code did not change. All 48 cells in the latest comparison table were also checked against freshly aggregated JSON; repeating the export produced identical files. These are documentation/data checks, not new end-to-end application tests.

Earlier app evidence lives in `docs/benchmarks/`; Auto evidence in `docs/benchmarks/jev-auto/`; the imported PoC snapshot in `docs/benchmarks/browser-poc/`. [Import provenance](import-manifest.json) records the original PoC commit and hashes. Its Python/Node files are archived research source, not a second application dependency or portable installer. Historical paths, fixture ports, dates and account placeholders in raw evidence are provenance, not setup instructions. The app does not import this snapshot.

New live comparisons use the [portable benchmark guide](../BENCHMARKS.md), including a pinned baseline/native bootstrap and an explicit future flight date. Historical Flights measurements retain September 20, 2026. New dates, models or code revisions start a new series; never rewrite historical results to match a new task.
