# Jev Auto implementation history

The September 18, 2026 implementation goal was completed: a hybrid in the existing application, validated in stages and measured against frozen references. The final comparison completed 119/119 attempts. This document records the implementation decisions and interruptions; current setup is in [APPLICATION.md](APPLICATION.md) and [BENCHMARKS.md](BENCHMARKS.md).

## Evidence behind the design

Native Ultrafast reduced main-model calls on Flights but failed six offer-analysis tasks and could not finish new-tab tasks independently. Browser Use benefited from grouping form actions. Lowering Jev's confidence threshold alone did not improve the Flights pilot. These results favored retaining the existing RunController and policy while choosing execution per subtask.

The design kept one conversation, one browser session, existing UX, individual action checks, human takeover and Stop. The primary model plans and reasons; Jev handles concrete mechanical subgoals; known form values can be executed in guarded batches. No Mercury helper or automatic stronger-model escalation was introduced.

## Staged implementation and validation

| Stage | Work and acceptance evidence |
| --- | --- |
| A: routing and contract | First-tool category tests, held-out categories, explicit planner instructions; no separate classifier API call |
| B: execution | Up to eight actions per batch; target identity/context checks; verify prior edits; semantic cycle detection; covered-target rejection; no blind mutation replay |
| C: frozen comparison | Shared Gemini/OpenRouter configuration, baseline First controller/tools/worker at `77846cb`, pinned native sources, rotating sequential order, independent verification |
| D: application validation | Typecheck/build, full suite, rebuilt container checks, actual desktop smoke, visible window, Stop, credential audits and retained reports |

Early routing category scores were 12/16, 15/16 and 16/16, followed by 6/6 held-out. Argument inspection later found JSON strings where object actions were required, despite correct category choices. The shared OpenRouter object `oneOf` schema fix was therefore applied before the application freeze `0ea227b`. Both app comparison variants use this corrected adapter; First retains its baseline controller/tools/worker.

Execution pilots covered context checks, confidence 0.35, occlusion, stale targets and pre-dispatch guards. Failures remain in the [full archive](research/ALL-RESULTS.md). A rejected action known not to have dispatched can get a fresh Jev decision at most twice consecutively; uncertainty after a mutation still requires inspection. Confidence is not proof of correctness.

## Freeze, interruption and resumption

The planned comparison was 8 local tasks × 3 engines × 3 repeats, 3 changed-data tasks × 3 engines × 3 repeats, and Flights × 4 engines × 5 repeats: 119 attempts. Native Ultrafast was retained on Flights; its analytical limitations had already been measured in the earlier PoC.

The first six local task groups completed 54/54. The original research/tabs block then produced four successes and 14 HTTP 402 credit failures. Runner fail-fast handling for 401/402 was added without modifying the frozen application logic. Repeated availability checks confirmed the credit blocker; exact private account totals were not exported.

After credits were added, the complete 18-record research/tabs block was restarted, followed by all 27 changed-data and 20 Flights attempts. The selected comparison includes the 54 original completed records plus these 65 resumed records. All 18 records from the interrupted block remain separate, including its four successes. No selective success-only retry was used.

Final routing checks retained one valid but unexpected planned route and two HTTP 429 failures. Only those unavailable cases were retried; both then passed. Actual execution retained one rejected/corrected wait-argument error. These issues and the slow Flights attempt are visible in the report.

## Completion evidence and limits

The frozen application passed 452 tests with 12 skipped, four container checks, and the final desktop smoke 4/4. Stop closed the benchmark browser in about 130 ms; UI Stop response was a separate 27 ms measurement. Earlier schema-related desktop failures and an unrelated timing-sensitive terminal failure remain documented. The worker image functioned, although the developer host exceeded the build script's global storage ceiling.

Task time includes retries, recovery and verification; setup and final screenshots/cleanup are separate. There is no isolated measurement of pure routing overhead: tool selection is part of ordinary planner inference. Three or five repeats do not establish general reliability; changed-data tasks remain variants of known fixtures.

The initial experiment allowed up to $15 of returned usage across new output files, $1 per attempt and 240 seconds per task. Known Auto-stage runner/routing plus desktop cost was $4.885782663; missing interrupted usage and infrastructure are excluded. Credentials remained host-side.

Auto substantially improved long forms and offer comparisons; First still won some simple interactions, and native Ultrafast remained fastest on Flights. The release keeps Classic as the default and Auto explicitly experimental. [Complete results](jev-auto-results.md) · [Cost ledger](research/COSTS.md) · [Current release checks](RELEASE-READINESS.md).
