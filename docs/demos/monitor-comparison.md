# Compare three monitoring tools

**A multi-source decision task with a failed validator and an explicit correction.** The corrected artifacts pass the retained checks; the original attempt did not.

Recorded on September 18, 2026, using app source `293696d`. Gemini `google/gemini-3.8-flash` with low reasoning planned through OpenRouter / Google AI Studio; browser mode was Jev Auto (`jev-1.13.0`). The run used an isolated app profile and workspace. These are individual demonstrations, not matched speed benchmarks. No application runtime code was changed for the recording.

## Task and acceptance criteria

**Scenario:** a three-person team, 12 HTTP services, three TCP endpoints, one Linux Docker host, Slack alerts, a public status page, and a preference for configuration in Git. Compare Uptime Kuma, Gatus and Tianji using at least six official pages, including each product's latest release.

Deliverables: `candidates.csv` with an exact schema; a decision report under 650 words with sources, unknowns and a five-step proposed rollout; and a Python-generated `score-check.json` independently recomputing scores. Read the saved files before completing. Missing evidence must be `unknown`, not `no`.

| Criterion | Points if documented yes | Required for qualification |
| --- | ---: | --- |
| Docker | 20 | Yes |
| HTTP checks | 20 | Yes |
| TCP checks | 15 | Yes |
| Slack | 15 | Yes |
| Public status page | 10 | No |
| Configuration as code | 20 | No |

`no` and `unknown` earn zero points. Exact full instructions: [original task](../research/video-tests/03-monitor-comparison/evidence/task.txt); [corrective follow-up](../research/video-tests/03-monitor-comparison/evidence/recovery-task.txt).

## Exact original prompt

```text
Choose a self-hosted uptime monitor for a 3-person team: 12 HTTP services, 3 TCP endpoints, one Linux Docker host, Slack alerts and a public status page. The team prefers declarative monitor configuration in Git.
Compare Uptime Kuma (https://github.com/louislam/uptime-kuma), Gatus (https://github.com/TwiN/gatus) and Tianji (https://github.com/msgbyte/tianji).
Use the browser to research at least six distinct official pages, including official release information for all three. Follow official documentation links as needed. Verify Docker deployment, HTTP checks, TCP checks, Slack alerts, public status pages and officially documented declarative monitor configuration. Record the license and latest stable release version/date as observed today. Use yes/no/unknown; missing evidence means unknown, not no. Cite exact supporting URLs and distinguish documented facts from judgments.
Write /workspace/candidates.csv with exactly these columns: product,docker,http,tcp,slack,status_page,config_as_code,license,latest_release,release_date,score,source_urls. One row per product; source_urls separated by semicolons.
Score yes as Docker=20, HTTP=20, TCP=15, Slack=15, status_page=10, config_as_code=20; no or unknown earns 0. Docker, HTTP, TCP and Slack must all be yes to qualify. Recommend the highest-scoring qualifying product, explaining tradeoffs and unresolved checks. If none qualifies, say so.
Save /workspace/decision.md (under 650 words): recommendation, evidence-backed comparison, unknowns, score explanation, and a five-step proposed rollout checklist. Do not deploy anything.
Use the terminal to create the files, then run a Python CSV check that independently recomputes the scores, validates all three rows and determines eligibility. Save its output to /workspace/score-check.json and display the result. Read the saved files before finishing. Terminal is only for local file work and verification; website research must use the browser. Do not install packages or change external state.
```

## First attempt: failed acceptance

- The CSV/report gave Uptime Kuma 70 points; the stated weights yield 80.
- The generated validator detected that mismatch and wrote `validation_passed: false`. The agent read it and still completed with the incorrect result.
- Missing evidence for configuration as code was labeled `no` rather than `unknown`.
- Tianji was excluded because it lacked a native Slack provider. The user required Slack support, not a native provider; the documented Apprise route was relevant.
- Gatus's release date was May 20 without a timezone. Its official UTC publication timestamp is May 19 at 23:53. The follow-up normalized dates to UTC; the initial date was not proven wrong in every local timezone.

Original artifacts were preserved **before correction**: [CSV](../research/video-tests/03-monitor-comparison/evidence/original-output/candidates.csv), [decision](../research/video-tests/03-monitor-comparison/evidence/original-output/decision.md), [failed validator output](../research/video-tests/03-monitor-comparison/evidence/original-output/score-check.json), [validator source](../research/video-tests/03-monitor-comparison/evidence/original-output/validate_scores.py).

The generated validator printed failure JSON but exited normally. A generic terminal-tool `done` event meant the command completed, not that the artifact passed. The app does not enforce arbitrary task-specific JSON assertions as a completion gate.

## Exact corrective follow-up

```text
Review and correct the files from this task. Your score-check.json reports validation_passed=false: the CSV and decision.md disagree with the Python recomputation. Read that validator output first, fix the source data and all reports, then rerun the validator. Do not claim success while it fails.
Also correct evidence handling: missing official documentation must be unknown, not no. Slack alerts were required, not specifically a native Slack provider. Check Tianji's officially supported Apprise integration and any required extra service; do not reject a supported integration just because it is indirect. Where evidence is insufficient, say unknown. Review the config_as_code classifications the same way.
Normalize release dates to UTC using official publication timestamps (GitHub release API may be opened in the browser). Add exact supporting source links in decision.md and distinguish documented features, assumptions and unresolved checks. Retain the original scoring weights, eligibility rules, exact CSV columns, under-650-word decision and five-step proposed checklist.
Finally read all three saved artifacts, independently recompute the CSV scores again, confirm score-check.json is true and that decision.md agrees. Research via the browser only, terminal for local file work; do not deploy or install anything. Report any remaining uncertainty honestly.
```

## Prompted correction and verification

The supervising assistant explicitly requested correction. This was **external feedback**, not spontaneous self-recovery. Gemini corrected all saved reports, checked the integration evidence, normalized dates and reread the outputs.

| Product | Original score | Corrected score | Corrected qualification | Evidence caveat |
| --- | ---: | ---: | --- | --- |
| Gatus | 100 | 100 | Eligible; winner under these weights | YAML configuration documented |
| Uptime Kuma | 70 | 80 | Eligible | Configuration as code unknown in this review |
| Tianji | 65 | 80 | Eligible | Slack through Apprise; configuration as code unknown |

The corrected report has 644 whitespace-separated words. An independent verifier checks the CSV schema, three products, allowed values, weighted arithmetic, eligibility, latest release/version/date/license metadata, report length, source links and five checklist steps. All those checks pass. The supervising source review additionally checked the official product documentation, Tianji's HTTP/TCP implementation, its Apprise provider and Dockerfile, and upstream Apprise Slack documentation. Source snapshots are included.

What worked: substantive multi-source browsing, local artifact creation, an effective validator, and useful correction after feedback. What failed: enforcing that validator's result and interpreting evidence consistently. The original Gatus recommendation survived correction, but a correct winner does not make the flawed comparison acceptable.

**No deployment or actual Slack delivery was tested.** `unknown` does not establish that a feature or integration is absent. This was not a product security audit, licensing opinion or general reliability benchmark.

Evidence: [original run](../research/video-tests/03-monitor-comparison/evidence/run.json), [follow-up](../research/video-tests/03-monitor-comparison/evidence/recovery.json), [independent checks](../research/video-tests/03-monitor-comparison/evidence/independent-check.json), [timing and routing](../research/video-tests/03-monitor-comparison/evidence/phase-metrics.json), [corrected decision](../research/video-tests/03-monitor-comparison/deliverables/decision.md), [corrected CSV](../research/video-tests/03-monitor-comparison/deliverables/candidates.csv), [full production notes and primary-source links](../research/video-tests/03-monitor-comparison/PRODUCTION.md).

## Timing breakdown

| Recorded interval | Original | Correction | Total |
| --- | ---: | ---: | ---: |
| Task | 179.060 s | 93.196 s | 272.256 s |
| Primary model requests | 137.529 s | 68.491 s | 206.020 s |
| Remaining elapsed time | 41.531 s | 24.705 s | 66.236 s |

Model-request time includes provider waiting; the remainder contains browser/terminal operations and orchestration. It is not a CPU profile. Jev was never called in either phase.

## Costs and interpretation

| Phase | Primary turns | Tool calls | Incremental reported cost |
| --- | ---: | ---: | ---: |
| Original attempt | 42 | 110 | $0.654741675 |
| Prompted correction | 21 | 41 | $0.488558025 |
| Total | 63 | 151 | **$1.143299700** |

The continuation UI displays a cumulative cost; it must not be added to the original cost again. Task clocks exclude setup and the external review gap. Both complete task sections appear at labeled **2× speed**, with the actual elapsed-time clock visible. This is assisted recovery, not a first-pass autonomous success.

The correction changed task artifacts and instructions, not application code. Enforcing machine-checkable acceptance before completion remains [recommended engineering work](../research/VIDEO-TESTS.md#fix-status-and-next-engineering-work).

## Watch the film

[![Watch Compare three monitoring tools](images/monitor-comparison.png)](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-long-test.mp4)

[Watch / download MP4](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/linux-agent-long-test.mp4) · [English subtitles](https://github.com/bartek-filipiuk/linux-agent-workbench/releases/download/demo-videos-2026-09-18/monitor-comparison.srt)

Film length: **3:08**. Film duration is different from measured task time. Provider costs exclude setup, infrastructure, this supervising conversation and video production; they are recorded usage or explicitly labeled estimates, not invoices.

[All demonstrations](README.md) · [Full test ledger](../research/VIDEO-TESTS.md) · [Application README](../../README.md#watch-it-work)
