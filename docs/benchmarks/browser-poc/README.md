# Gemini browser PoC

> Historical PoC snapshot from `c9ced3a`. Source and measurements are retained for provenance; local run commands are not portable installation instructions. See the [current application](../../APPLICATION.md), [research kit](../../research/README.md) and [release readiness](../../RELEASE-READINESS.md).

Independent experiment; existing application source remains untouched. [Plan](PLAN.md) · [Measured results and recommendation](RESULTS.md).

[All test results, including earlier app experiments, pilots and validation (Polish)](../../research/ALL-RESULTS.md).

Three engines: `app-first` (existing application), `ultrafast` (Jev Ultrafast with Gemini field helper), `browser-use` (Gemini drives the standard Browser Use agent). Gemini is `google/gemini-3.8-flash / low` through OpenRouter, pinned to `google-ai-studio`. No Mercury or stronger-model fallback.

## Run

The configured app worktree at `/home/bartek/linux-agent-jev` must be built. This runner reads its compiled modules and existing encrypted OS credentials; it does not copy keys to this repository. Python dependencies are isolated in `.venv`; `python3 bootstrap.py` restores the pinned upstream sources and lockfile.

```sh
./run.sh --tasks google-flights --runs 1 --output artifacts/my-flights.json
./run.sh --tasks wizard-6,compare-offers --runs 1 --output artifacts/my-comparison.json
./run.sh --engines ultrafast --tasks search --runs 1 --headed --output artifacts/visible.json
```

`--headed` opens the owned Chrome window. Ctrl+C stops the active task, closes its browser and saves completed measurements. Screenshots, logs and detailed traces are under the output's `*-traces/` directory. Output files cannot be overwritten. Use `POC_NODE_BIN` to override the Node 24 executable.

Final-series commands:

```sh
./run.sh --tasks google-flights --runs 10 --warm-after 5 --output artifacts/final-flights.json
./run.sh --tasks local --runs 3 --output artifacts/final-local.json
.venv/bin/python report.py artifacts/final-flights.json artifacts/final-local.json --output artifacts/summary.json
```

Warm repetitions reuse the profile from repetition 5, including cache and site preferences. Initial field values are recorded. Warm/fresh results must be separated; warm does not mean "cache only". Each attempt still starts a new browser process. All variants run sequentially with rotating order, same browser build and viewport.

## Intentional adapter differences

- Original upstream Jev decision, action and snapshot files are unmodified. A subclass attaches to the already prepared tab instead of creating/navigating a new one. Browser Harness uses an isolated home/runtime directory and explicit loopback CDP endpoint. The parent retains the tab for independent verification.
- A wrapper records model request timing and pins the Gemini provider. Jev confidence handling, stale-state guards, 60-action budget and provider retry behavior remain upstream defaults.
- Browser Use has up to five actions per step, vision on demand, `flash_mode` on mechanical tasks and regular planning on reasoning tasks. Its optional LLM judge is disabled in favor of the same external verifier used by all engines. Browser state preparation is setup; agent run and final verification are task time.
- Model-written JavaScript, shell/file actions, uploads and web-search shortcuts are excluded. Local browser traffic is fixture-origin only; Flights traffic is restricted to Google support domains and selecting/booking flights is blocked. This is a scoped evaluation environment, not a replacement for production security policy.
- Credentials arrive through private pipes. Browser subprocess environment excludes API keys/tokens/secrets. Raw provider errors are not logged. Usage costs include reported OpenRouter charges and estimated Jev input-token cost; interrupted requests may be billed without returning usage.

## Validate

```sh
/home/bartek/.nvm/versions/node/v24.20.0/bin/node --test verify.test.mjs
.venv/bin/python -m py_compile driver.py report.py bootstrap.py
./run.sh --engines ultrafast --tasks wizard-6 --runs 1 --stop-after 350 --output artifacts/stop-check.json
```

An interrupted benchmark intentionally exits nonzero. Read `browserStopMs` (browser closed) separately from `stopMs` (all runner cleanup). A failed run or agent `DONE` is never counted as a verified success without the independent task checks.

Nowszy eksperyment **Jev Auto** jest zaimplementowany w osobnej aplikacji; końcowe porównanie 119 prób, razem z historią błędów HTTP 402, opisano w [zbiorczym archiwum](../../research/ALL-RESULTS.md#auto). Wyniki tego PoC pozostają historycznym, osobnym pomiarem.
