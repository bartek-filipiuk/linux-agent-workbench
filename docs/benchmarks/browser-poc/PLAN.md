# Gemini browser PoC — 2026-09-17

> Historical PoC snapshot from `c9ced3a`. Source and measurements are retained for provenance; local run commands are not portable installation instructions. See the [current application](../../APPLICATION.md), [research kit](../../research/README.md) and [release readiness](../../RELEASE-READINESS.md).

Goal: measure whether changing the execution loop improves correct completion of browser tasks, including longer tasks. Gemini is the only generative model; Mercury is excluded.

Completed: 102 final comparison attempts, separate retained pilots, independent outcome checks, upstream contracts, Stop and visible-browser smoke. [Results and integration recommendation](RESULTS.md). No application migration was performed; the next integration step is a recommendation supported by this PoC.

This is an independent repository at `/home/bartek/linux-agent-browser-poc`, branch `experiment/browser-poc`. The existing application and Jev worktree remain unchanged. Reuse the current app's compiled runtime, credential reader and browser fixtures through explicit read-only imports.

## Variants

1. `app-first`: existing RunController + Jev First + Gemini, unchanged confidence threshold and policies.
2. `ultrafast`: pinned upstream Jev Ultrafast decision/snapshot/action loop, Gemini generating field values on demand. This is NOT Gemini planning every step. Its inability to synthesize arbitrary research is a capability limitation to measure.
3. `browser-use`: pinned Browser Use + Gemini. Multiple actions per response, vision on demand, fast agent output for mechanical tasks; planning retained for reasoning tasks. No stronger model or provider fallback.

Gemini: `google/gemini-3.8-flash`, reasoning `low`, OpenRouter upstream `google-ai-studio`. Jev: `jev-1.13.0`. Record actual returned model/provider and all API usage. Do not silently substitute models.

Upstream pins: Jev Ultrafast `452c1ad2dd628008f1d5608f28158d76e49e6cc0`; Browser Use `d8110c5ff87ccba887aaa726cdb780f2f84bef8d`. Keep upstream untouched, document any adapter/transport changes.

## Execution

1. Build one runner with common browser preparation, independent verification, results and traces. Dedicated Chrome profiles and loopback CDP only. Stop/SIGINT cancels active run, closes its owned browser and preserves completed records.
2. Offline validation: negative verifier cases, model response/error accounting, timeout/Stop and isolation checks. Pilot one task per variant; preserve failed pilots separately.
3. Freeze implementation and task definitions before the final comparison. Flights: ten repetitions per variant, five fresh profiles and five repeated-use profiles. Rotate variant order. Use the published Zurich–London goal; initial consent is setup, never a benchmark action.
4. Generalization suite: short UI tasks, multi-page/wizard tasks with more actions, and comparison/reasoning tasks with independently verifiable outcomes. Include unseen cities/values and unsupported UI (e.g. new tab) as explicit capability tests. At least three repetitions per variant/task. Keep failed/unsupported attempts in denominators. Synthetic tasks measure controlled behavior, not general web reliability.
5. Report success counts, successful-task median, slow tail (descriptive only for small samples), all-attempt elapsed time, model/JeV/browser breakdown, model-call counts, observed costs, fallbacks and errors. Compare matched task/repetition pairs and disclose fresh/warm differences. Keep historical measurements separate.

## Clocks and constraints

- Setup includes browser/driver initialization, initial navigation, consent and first observation. Main task ends after agent termination AND independent verification. Also report full setup+task elapsed time.
- Retries, stale decisions, recovery and model calls stay on the task clock. Screenshots saved after verification are outside it. DONE alone is never success.
- Same browser build, viewport 1120×780, locale en-US, timezone Europe/Zurich, machine and provider across variants.
- Local fixtures allow only fixture-origin browser traffic. Public tasks stay within task domains. No purchases, messages, real account changes, personal browser cookies or uploads. The benchmark does not claim full parity with production security policies.
- Keys are read from the existing OS credential store into host memory, passed only through private process pipes, never browser environment, source, traces or command arguments. Redact provider errors. No model-generated shell execution.
- Initial experiment spend ceiling: $15 reported API usage across retained attempts, with a per-attempt ceiling and finite wall-clock timeout. Interrupted/unreported usage may still be billed; report this limitation. This is an implementation ceiling, not a user-requested goal token budget.

## Decision

Recommend integration only if a meaningful advantage survives tasks outside Flights (working criterion: ~30% lower task median without observed loss of correctness or a worse slow tail). Small samples cannot establish equal reliability. If raw Ultrafast fails reasoning tasks, distinguish missing planner/memory from Gemini intelligence; propose a supervisor only with evidence. Preserve current application UX; a new frontend is not part of this PoC.
