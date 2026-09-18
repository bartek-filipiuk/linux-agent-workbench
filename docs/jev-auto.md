# Jev Auto

Jev Auto is an experimental execution mode inside Linux Agent Workbench. The primary planner chooses fast Jev subgoals, guarded batches or reading/reasoning per subtask, using the same UI, browser session, policy, history and Stop controls.

- [Current application, architecture and routing](APPLICATION.md)
- [Configure Gemini/OpenRouter and Jev](APPLICATION.md#configure-and-run-the-measured-setup)
- [Published comparison and every Auto attempt](jev-auto-results.md)
- [All research, costs and limitations](research/README.md)
- [Portable benchmark setup](BENCHMARKS.md)
- [Implementation history](jev-auto-plan.md)
- [Source-release status](RELEASE-READINESS.md)

## Run

Follow the source installation instructions and configure your private provider credentials. For an isolated profile of the same application:

```bash
LAW_INSTANCE=jev-auto pnpm images:build
pnpm images:build:auto
pnpm dev:auto
```

Select **Jev Auto · experimental** under Browser engine. A fresh installation defaults to Classic. The measured planner was Gemini `google/gemini-3.8-flash / low` through OpenRouter with `google-ai-studio`; there is no silent model or billing fallback. Provider availability may change.

## Execution boundaries

`browser_task` delegates a concrete mechanical outcome with known non-secret values. `browser_batch` groups at most eight actions from one current observation. Multi-action batches require stable node identities and confirmed field effects; transitions finish the batch. Each child action passes the existing policy, approval, budget and control checks. Analysis remains with the primary planner.

Jev does not route the entire task. Its completion is a candidate result requiring inspection of fresh evidence. Cycles, missing values, unsafe targets and uncertainty return control to the planner. Uncertain mutations are not blindly replayed. Browser Use and native Ultrafast remain external benchmark references.

See the application guide for exact confidence thresholds, supported batch actions, storage, provider data flow and security limitations. The independent deterministic verifiers in the benchmark are additional instrumentation, not a universal production guarantee.
