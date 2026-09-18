# Run the browser benchmarks

The [published measurements](research/README.md) remain frozen historical evidence. The commands below produce a new series using the checked-out candidate and pinned reference engines. They do not silently substitute the current app for the old First baseline.

## Prepare dependencies without API calls

Use Node 24, pnpm 10.24.0, Git, Python 3 and `uv`. Install the repository dependencies first:

```bash
pnpm install --frozen-lockfile
pnpm bench:setup
pnpm bench:setup --check
```

Setup creates an ignored `.cache/browser-bench/` directory. It clones this repository at First baseline `77846cb0d97af218dd8a2832dab9f488c703b210`, installs its lockfile and builds its compiled modules. It then builds the candidate, installs Playwright Chromium, downloads the two pinned native sources, verifies their recorded source hashes and creates the Python 3.12 environment using the retained lockfile. Upstream license files stay with their downloaded sources. Setup does not call models or read API keys.

`--app-only` skips the native Python engines. Existing modified or wrong-revision baseline checkouts are rejected; setup never resets your work. Each First run checks baseline HEAD, clean source status and hashes of the compiled build. Native runs check the recorded upstream source files and harness hashes before any paid calls.

A full Git clone is required: a shallow clone that omits the baseline commit must fetch its history first. On Linux, missing browser system libraries can be installed with `pnpm --filter @law/browser-worker exec playwright install --with-deps chromium` or your distribution packages. This benchmark preparation does not install or test the desktop's Podman environments.

## Configure private credentials

The default credential file is `~/.config/linux-agent-workbench-jev-auto/.env` (respecting `XDG_CONFIG_HOME`). Use [the application setup](APPLICATION.md#configure-and-run-the-measured-setup) or provide `OPENROUTER_API_KEY` and `TYPESAFE_API_KEY` through your private environment. A missing `.env` is permitted when keys are supplied another way. The helper can read encrypted keys from that profile's OS storage. Keep keys out of commands, reports and the selected workspace.

| Override | Purpose |
| --- | --- |
| `LAW_BENCH_CACHE` | Cache root; default `<repo>/.cache/browser-bench` |
| `LAW_BENCH_BASELINE` | Explicit pinned baseline checkout; default `<cache>/baseline` |
| `LAW_BENCH_NATIVE` | Native harness/environment; default `<cache>/native` |
| `LAW_BENCH_CONFIG` | Private app `.env`; runner also accepts `--config PATH` |

Paths may contain spaces. A custom cache outside the repository is useful when testing another checkout. Do not point setup at a checkout you are actively editing.

## Validate before spending credits

```bash
pnpm test:bench
node experiments/browser-auto/check-fixtures.mjs
pnpm bench:auto --check --engines app-auto,app-first --tasks local
pnpm bench:auto --check --tasks google-flights --flight-date 2026-10-20
```

`--check` validates selected engines, reference setup and task/date configuration without reading keys or calling a provider. Use a date in the future when you run this command; the example will eventually expire. Negative fixture tests and date/year checks are part of offline CI. Native contracts can be checked with `.cache/browser-bench/native/.venv/bin/python .cache/browser-bench/native/check_upstream.py` after full setup.

## Run a new paid series

```bash
pnpm bench:auto --engines app-auto,app-first,browser-use --tasks local --runs 3 --output experiments/browser-auto/artifacts/my-local.json
pnpm bench:auto --engines app-auto,app-first,browser-use --tasks holdout --runs 3 --output experiments/browser-auto/artifacts/my-holdout.json
pnpm bench:auto --engines app-auto,app-first,ultrafast,browser-use --tasks google-flights --flight-date 2026-10-20 --runs 5 --output experiments/browser-auto/artifacts/my-flights.json
```

Live Flights requires an explicit `--flight-date YYYY-MM-DD` later than the current UTC date. The prompt and independent verifier use the same value, including year and result-row date; it is recorded in the report. The task still stops at search results and blocks selecting/booking flights. Historical measurements retain September 20, 2026.

Default model/provider reproduce the old configuration: `google/gemini-3.8-flash / low`, `google-ai-studio`. Override `--model MODEL_ID` for a model available to your account; this is a new comparison configuration. `--provider` can change the app upstream, but pinned native drivers require `google-ai-studio` and reject a mismatched override. All engines in a matched run must use the same model/upstream. Jev remains pinned to `jev-1.13.0` in this harness.

`--headed` displays Chrome. `--stop-after MILLISECONDS` intentionally interrupts a task; Ctrl+C also stops it and retains completed records. Use a new output filename; existing reports are never overwritten. Trial order rotates and execution is sequential. A trial has a $1 reported-usage limit and 240-second default task budget (`--timeout SECONDS`). The default `--max-cost 15` includes previous result JSONs in the output directory. Missing usage after a failed/aborted call may still be billed; provider-side limits remain advisable. Authentication/credit failures stop the series.

Routing-only live checks do not execute proposed browser actions:

```bash
node experiments/browser-auto/decisions.mjs experiments/browser-auto/artifacts/my-routing.json
node experiments/browser-auto/decisions.mjs experiments/browser-auto/artifacts/my-routing-heldout.json --heldout
```

These checks spend API credits and preserve multilingual fixture prompts intentionally. Route-category accuracy is not full-task accuracy. Inspect argument schemas and end-to-end outcomes separately.

## Regenerate the published archive offline

```bash
python3 scripts/research-catalog.py
python3 scripts/research-report.py
python3 experiments/browser-auto/summarize.py --input docs/benchmarks/jev-auto --output /tmp/auto-tables.md
```

The catalog/report scripts intentionally assert the frozen archive's counts and costs. They are not an auto-importer for new results. The Auto summarizer implements the documented 119-record resumed-sample rule using the original filenames. Do not rename arbitrary new result files into those names or blend new measurements into the old ranking. Create a separate report with its own scope, verification rules and source revisions.

See [methodology](research/TEST-CATALOG.md), [cost accounting](research/COSTS.md) and [release checks](RELEASE-READINESS.md). Raw archived runner source under `docs/benchmarks/browser-poc` preserves the old experiment; use this guide and the active `experiments/browser-auto` runner for new work.
