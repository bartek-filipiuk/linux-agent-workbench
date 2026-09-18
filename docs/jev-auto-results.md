# Jev Auto: frozen comparison and validation

**119/119 selected attempts completed successfully**, using the existing application with shared UX, session, per-action policy and Stop. Auto is experimental; Classic remains the fresh-install default.

Auto reduced the ten-stage form median from First's 74.49 s to 26.14 s (64.9% less time); Browser Use took 40.21 s. Flights medians were Auto 21.79 s, First 36.82 s, Browser Use 35.45 s and native Ultrafast 13.32 s. Auto did not win every simple task and its Flights range was **17.83–64.02 s**. The worst attempt spent about 59.28 s in the planner across 26 model calls, after an uncertain Jev operation. It is retained, not discarded.

These are complete configured variants, not an ablation isolating batching, prompts, confidence thresholds or target guards. The results support keeping the application and selecting execution per subtask; they do not support a full migration to Browser Use or a universal speed claim.

## Method and provenance

Production logic was frozen at `0ea227b271dbc71b5dc7d503a4a4438e3141c361`. First uses baseline `77846cb0d97af218dd8a2832dab9f488c703b210`, with the same corrected OpenRouter object-schema adapter as Auto. Native sources are pinned in [sources.json](benchmarks/browser-poc/sources.json); [resumption provenance](benchmarks/jev-auto/validation/resume-provenance.json) checks source hashes.

All engines used Gemini `google/gemini-3.8-flash / low`, OpenRouter `google-ai-studio`, Jev `jev-1.13.0` where applicable, the same Chrome build/settings and fresh profiles. Trials were sequential with rotating order. Task time includes retries, recovery and independent verification; setup, final screenshots and cleanup are separate. Local cells have 3 attempts; Flights has 5. Most tasks are synthetic; changed-data fixtures are not unseen sites.

The 119-record sample contains the first six complete groups from `final-local.json` (54), the complete restarted research/tabs block (18), all changed-data records (27) and all Flights records (20). The original interrupted research/tabs block—4 successes and 14 credit failures—remains separately preserved in its entirety. Raw final files contain 137 records. The sample rule was declared before resumption.

[Full methodology and test definitions](research/TEST-CATALOG.md) · [All historical stages and attempts](research/ALL-RESULTS.md) · [Application behavior](APPLICATION.md) · [Current reproduction commands](BENCHMARKS.md).

## Validation, routing and costs

The original application validation passed 452 tests (12 skipped), typecheck/build, 4 container checks and final desktop 4/4. Visible-window search passed in 3.927 s. Intentional Stop closed the browser in 129.888 ms and finished cleanup in 139.134 ms; UI response was a distinct 27 ms measurement. The working container image exceeded the developer host's global storage ceiling at the build script's final check, so it is not a clean-install pass.

Post-schema routing scored 13/16: one valid but unexpected planned observation and two HTTP 429 responses with no model answer. Held-out scored 6/6; targeted retries of those two unavailable cases scored 2/2. All 20 returned calls had valid schemas. Actual comparison traces contained 193/194 valid task/batch calls; one malformed wait argument was rejected and corrected within the measured time. Early routing pilots had malformed object arguments despite category success; these are retained in raw data. No separately timed router request or universal production verifier exists.

All Auto records include 159 runner attempts, 78 routing cases and 10 desktop checks. Known runner/routing cost was $4.783456077 and desktop $0.102326586, totaling **$4.885782663**. The selected comparison cost $3.717715692 and is already included. Charges are returned OpenRouter usage plus estimated Jev input-token cost; interrupted usage can be missing. [Costs](research/COSTS.md).

[PNG chart](benchmarks/jev-auto/comparison.png) · [SVG chart](benchmarks/jev-auto/comparison.svg) · [Completion audit](benchmarks/jev-auto/validation/completion-audit.json) · [Export manifest](benchmarks/jev-auto/exports-manifest.json) · [Trace manifest](benchmarks/jev-auto/trace-manifest.json) · [Trace archive](benchmarks/jev-auto/traces.tar.gz).

## Complete tables

The following tables are generated from the unchanged exported JSON. Missing measurements are not zero; routing and desktop have distinct criteria. Desktop costs are recorded in the separate usage ledger, rather than in individual smoke reports.

| Task | Auto | First | Browser Use | Ultrafast | Auto vs First median change |
|---|---:|---:|---:|---:|---:|
| search | 4.64 s · 3/3 | 5.23 s · 3/3 | 6.68 s · 3/3 | — | -11.3% |
| filters | 4.98 s · 3/3 | 3.84 s · 3/3 | 6.07 s · 3/3 | — | +29.7% |
| autocomplete | 8.72 s · 3/3 | 4.61 s · 3/3 | 9.43 s · 3/3 | — | +89.1% |
| wizard-6 | 13.35 s · 3/3 | 30.08 s · 3/3 | 24.28 s · 3/3 | — | -55.6% |
| wizard-10 | 26.14 s · 3/3 | 74.49 s · 3/3 | 40.21 s · 3/3 | — | -64.9% |
| compare-offers | 4.71 s · 3/3 | 12.26 s · 3/3 | 8.99 s · 3/3 | — | -61.6% |
| research-offers | 13.72 s · 3/3 | 18.97 s · 3/3 | 29.03 s · 3/3 | — | -27.6% |
| tabs | 5.99 s · 3/3 | 5.15 s · 3/3 | 7.05 s · 3/3 | — | +16.3% |
| wizard-4-new | 10.29 s · 3/3 | 14.77 s · 3/3 | 15.01 s · 3/3 | — | -30.3% |
| compare-new | 3.99 s · 3/3 | 8.27 s · 3/3 | 12.93 s · 3/3 | — | -51.7% |
| autocomplete-new | 4.76 s · 3/3 | 4.91 s · 3/3 | 12.84 s · 3/3 | — | -3.1% |
| google-flights | 21.79 s · 5/5 | 36.82 s · 5/5 | 35.45 s · 5/5 | 13.32 s · 5/5 | -40.8% |

Mean components across every attempt in each group (not only successes):

| Task / engine | n | Setup s | Task s | Model s | Jev s | Other s | Model / Jev calls | Cost USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| search / app-auto | 3 | 0.42 | 4.51 | 2.39 | 1.77 | 0.34 | 2.0 / 3.0 | 0.011820 |
| search / app-first | 3 | 0.39 | 5.18 | 3.15 | 1.87 | 0.16 | 2.0 / 3.0 | 0.013154 |
| search / browser-use | 3 | 2.05 | 6.29 | 4.47 | 0.00 | 1.82 | 2.3 / 0.0 | 0.010120 |
| filters / app-auto | 3 | 0.40 | 5.10 | 2.95 | 1.80 | 0.35 | 2.0 / 4.0 | 0.012271 |
| filters / app-first | 3 | 0.40 | 4.16 | 2.58 | 1.38 | 0.20 | 2.0 / 4.0 | 0.012329 |
| filters / browser-use | 3 | 2.01 | 6.95 | 4.49 | 0.00 | 2.47 | 2.0 / 0.0 | 0.008157 |
| autocomplete / app-auto | 3 | 0.40 | 7.95 | 5.65 | 1.65 | 0.65 | 2.0 / 4.0 | 0.011854 |
| autocomplete / app-first | 3 | 0.40 | 4.95 | 3.11 | 1.47 | 0.37 | 2.3 / 3.3 | 0.014392 |
| autocomplete / browser-use | 3 | 2.05 | 9.02 | 7.26 | 0.00 | 1.76 | 4.0 / 0.0 | 0.014117 |
| wizard-6 / app-auto | 3 | 0.40 | 15.39 | 14.61 | 0.00 | 0.78 | 8.0 / 0.0 | 0.082901 |
| wizard-6 / app-first | 3 | 0.40 | 33.13 | 28.32 | 4.10 | 0.72 | 17.7 / 9.3 | 0.288738 |
| wizard-6 / browser-use | 3 | 2.08 | 24.10 | 15.17 | 0.00 | 8.93 | 7.0 / 0.0 | 0.034771 |
| wizard-10 / app-auto | 3 | 0.40 | 25.91 | 24.64 | 0.00 | 1.27 | 12.0 / 0.0 | 0.153008 |
| wizard-10 / app-first | 3 | 0.39 | 71.00 | 68.85 | 0.98 | 1.18 | 42.7 / 1.0 | 0.793285 |
| wizard-10 / browser-use | 3 | 2.12 | 41.47 | 26.89 | 0.00 | 14.58 | 11.0 / 0.0 | 0.063287 |
| compare-offers / app-auto | 3 | 0.40 | 5.13 | 4.97 | 0.00 | 0.16 | 3.0 / 0.0 | 0.022216 |
| compare-offers / app-first | 3 | 0.40 | 12.65 | 11.23 | 1.22 | 0.20 | 5.7 / 2.3 | 0.047695 |
| compare-offers / browser-use | 3 | 2.06 | 10.23 | 8.44 | 0.00 | 1.79 | 2.0 / 0.0 | 0.047077 |
| research-offers / app-auto | 3 | 0.41 | 13.71 | 12.99 | 0.00 | 0.73 | 8.3 / 0.0 | 0.086534 |
| research-offers / app-first | 3 | 0.41 | 18.44 | 14.75 | 3.00 | 0.69 | 9.0 / 2.0 | 0.100939 |
| research-offers / browser-use | 3 | 2.01 | 30.44 | 23.40 | 0.00 | 7.04 | 8.0 / 0.0 | 0.167667 |
| tabs / app-auto | 3 | 0.39 | 6.01 | 4.02 | 1.76 | 0.23 | 3.0 / 4.0 | 0.018245 |
| tabs / app-first | 3 | 0.38 | 5.91 | 4.35 | 1.30 | 0.25 | 3.0 / 2.7 | 0.018865 |
| tabs / browser-use | 3 | 2.00 | 7.05 | 5.15 | 0.00 | 1.90 | 3.0 / 0.0 | 0.008117 |
| wizard-4-new / app-auto | 3 | 0.41 | 10.89 | 10.33 | 0.00 | 0.56 | 6.0 / 0.0 | 0.053623 |
| wizard-4-new / app-first | 3 | 0.41 | 16.92 | 10.85 | 5.57 | 0.49 | 5.7 / 13.3 | 0.058475 |
| wizard-4-new / browser-use | 3 | 2.12 | 15.70 | 9.47 | 0.00 | 6.24 | 5.0 / 0.0 | 0.023171 |
| compare-new / app-auto | 3 | 0.41 | 4.70 | 4.53 | 0.00 | 0.17 | 3.3 / 0.0 | 0.024005 |
| compare-new / app-first | 3 | 0.40 | 9.21 | 7.88 | 1.15 | 0.19 | 4.7 / 1.3 | 0.040009 |
| compare-new / browser-use | 3 | 2.21 | 12.95 | 11.00 | 0.00 | 1.95 | 3.0 / 0.0 | 0.070527 |
| autocomplete-new / app-auto | 3 | 0.39 | 5.95 | 3.41 | 1.90 | 0.64 | 2.0 / 4.0 | 0.011867 |
| autocomplete-new / app-first | 3 | 0.39 | 4.86 | 2.94 | 1.56 | 0.36 | 2.3 / 3.3 | 0.014471 |
| autocomplete-new / browser-use | 3 | 2.03 | 13.75 | 11.33 | 0.00 | 2.42 | 4.0 / 0.0 | 0.015052 |
| google-flights / app-auto | 5 | 3.17 | 30.11 | 17.80 | 8.66 | 3.65 | 8.2 / 14.4 | 0.359967 |
| google-flights / app-first | 5 | 3.24 | 37.65 | 33.26 | 1.33 | 3.07 | 19.2 / 1.4 | 0.754658 |
| google-flights / browser-use | 5 | 4.82 | 36.53 | 19.09 | 0.00 | 17.44 | 11.4 / 0.0 | 0.226265 |
| google-flights / ultrafast | 5 | 3.85 | 13.25 | 2.48 | 8.64 | 2.14 | 2.0 / 18.0 | 0.024067 |

All series (routing and desktop use separate criteria):

| File | Kind | Result | Reported USD |
|---|---|---:|---:|
| credit-recheck-1.json | execution | 0/1 | 0.000000 |
| decisions-final-heldout.json | routing | 6/6 | 0.009403 |
| decisions-pilot-1.json | routing | 12/16 | 0.023632 |
| decisions-pilot-2.json | routing | 15/16 | 0.025827 |
| decisions-pilot-3.json | routing | 16/16 | 0.025509 |
| decisions-post-schema-heldout.json | routing | 6/6 | 0.009306 |
| decisions-post-schema-retry.json | routing | 2/2 | 0.003716 |
| decisions-post-schema.json | routing | 13/16 | 0.021797 |
| desktop-auto-recheck.json | desktop | 2/3 | not measured here |
| desktop-auto-schema.json | desktop | 4/4 | not measured here |
| desktop-auto.json | desktop | 2/3 | not measured here |
| final-flights.json | execution | 20/20 | 1.364958 |
| final-holdout.json | execution | 27/27 | 0.311200 |
| final-local.json | execution | 58/72 | 1.798193 |
| final-recovery.json | execution | 18/18 | 0.400367 |
| headful-auto.json | execution | 1/1 | 0.003941 |
| pilot-auto-1.json | execution | 5/5 | 0.281290 |
| pilot-confidence-035.json | execution | 1/1 | 0.233415 |
| pilot-context-v2.json | execution | 0/1 | 0.005164 |
| pilot-guard-v5.json | execution | 2/2 | 0.036548 |
| pilot-occlusion-v3.json | execution | 4/4 | 0.144828 |
| pilot-runner-validation.json | execution | 4/4 | 0.011144 |
| pilot-stale-v4.json | execution | 2/2 | 0.071233 |
| stop-auto.json | execution | 0/1 | 0.001987 |

Every execution attempt, including failures (task time in seconds):

| Series | Task | Engine | Repeat | Result | Time s | Model / Jev | USD |
|---|---|---|---:|---|---:|---:|---:|
| credit-recheck-1.json | search | app-auto | 1 | FAIL | 0.46 | 1 / 0 | 0.000000 |
| final-flights.json | google-flights | app-auto | 1 | PASS | 64.02 | 26 / 3 | 0.224888 |
| final-flights.json | google-flights | app-first | 1 | PASS | 27.20 | 15 / 3 | 0.117888 |
| final-flights.json | google-flights | ultrafast | 1 | PASS | 13.32 | 2 / 19 | 0.005259 |
| final-flights.json | google-flights | browser-use | 1 | PASS | 39.09 | 12 / 0 | 0.047603 |
| final-flights.json | google-flights | app-first | 2 | PASS | 45.18 | 20 / 1 | 0.155895 |
| final-flights.json | google-flights | ultrafast | 2 | PASS | 14.38 | 2 / 19 | 0.005139 |
| final-flights.json | google-flights | browser-use | 2 | PASS | 35.45 | 11 / 0 | 0.043342 |
| final-flights.json | google-flights | app-auto | 2 | PASS | 26.71 | 5 / 15 | 0.047684 |
| final-flights.json | google-flights | ultrafast | 3 | PASS | 13.65 | 2 / 16 | 0.004164 |
| final-flights.json | google-flights | browser-use | 3 | PASS | 35.14 | 11 / 0 | 0.045314 |
| final-flights.json | google-flights | app-auto | 3 | PASS | 20.18 | 2 / 19 | 0.017911 |
| final-flights.json | google-flights | app-first | 3 | PASS | 35.81 | 19 / 1 | 0.157691 |
| final-flights.json | google-flights | browser-use | 4 | PASS | 35.43 | 11 / 0 | 0.043614 |
| final-flights.json | google-flights | app-auto | 4 | PASS | 21.79 | 6 / 16 | 0.051692 |
| final-flights.json | google-flights | app-first | 4 | PASS | 36.82 | 18 / 1 | 0.139616 |
| final-flights.json | google-flights | ultrafast | 4 | PASS | 13.18 | 2 / 19 | 0.005028 |
| final-flights.json | google-flights | app-auto | 5 | PASS | 17.83 | 2 / 19 | 0.017793 |
| final-flights.json | google-flights | app-first | 5 | PASS | 43.25 | 24 / 1 | 0.183568 |
| final-flights.json | google-flights | ultrafast | 5 | PASS | 11.70 | 2 / 17 | 0.004477 |
| final-flights.json | google-flights | browser-use | 5 | PASS | 37.56 | 12 / 0 | 0.046391 |
| final-holdout.json | wizard-4-new | app-auto | 1 | PASS | 10.29 | 6 / 0 | 0.017770 |
| final-holdout.json | wizard-4-new | app-first | 1 | PASS | 14.16 | 2 / 17 | 0.006948 |
| final-holdout.json | wizard-4-new | browser-use | 1 | PASS | 15.01 | 5 / 0 | 0.007622 |
| final-holdout.json | wizard-4-new | app-first | 2 | PASS | 21.82 | 9 / 10 | 0.032373 |
| final-holdout.json | wizard-4-new | browser-use | 2 | PASS | 17.32 | 5 / 0 | 0.008051 |
| final-holdout.json | wizard-4-new | app-auto | 2 | PASS | 8.94 | 6 / 0 | 0.017926 |
| final-holdout.json | wizard-4-new | browser-use | 3 | PASS | 14.79 | 5 / 0 | 0.007498 |
| final-holdout.json | wizard-4-new | app-auto | 3 | PASS | 13.43 | 6 / 0 | 0.017927 |
| final-holdout.json | wizard-4-new | app-first | 3 | PASS | 14.77 | 6 / 13 | 0.019154 |
| final-holdout.json | compare-new | app-first | 1 | PASS | 8.27 | 5 / 1 | 0.014830 |
| final-holdout.json | compare-new | browser-use | 1 | PASS | 13.42 | 3 / 0 | 0.024883 |
| final-holdout.json | compare-new | app-auto | 1 | PASS | 6.22 | 4 / 0 | 0.009100 |
| final-holdout.json | compare-new | browser-use | 2 | PASS | 12.93 | 3 / 0 | 0.022957 |
| final-holdout.json | compare-new | app-auto | 2 | PASS | 3.99 | 3 / 0 | 0.007561 |
| final-holdout.json | compare-new | app-first | 2 | PASS | 11.41 | 4 / 3 | 0.010892 |
| final-holdout.json | compare-new | app-auto | 3 | PASS | 3.87 | 3 / 0 | 0.007345 |
| final-holdout.json | compare-new | app-first | 3 | PASS | 7.97 | 5 / 0 | 0.014287 |
| final-holdout.json | compare-new | browser-use | 3 | PASS | 12.50 | 3 / 0 | 0.022687 |
| final-holdout.json | autocomplete-new | browser-use | 1 | PASS | 20.15 | 4 / 0 | 0.004816 |
| final-holdout.json | autocomplete-new | app-auto | 1 | PASS | 4.76 | 2 / 4 | 0.003954 |
| final-holdout.json | autocomplete-new | app-first | 1 | PASS | 4.91 | 2 / 4 | 0.004055 |
| final-holdout.json | autocomplete-new | app-auto | 2 | PASS | 8.39 | 2 / 4 | 0.003962 |
| final-holdout.json | autocomplete-new | app-first | 2 | PASS | 5.06 | 2 / 4 | 0.004131 |
| final-holdout.json | autocomplete-new | browser-use | 2 | PASS | 8.26 | 4 / 0 | 0.005224 |
| final-holdout.json | autocomplete-new | app-first | 3 | PASS | 4.62 | 3 / 2 | 0.006285 |
| final-holdout.json | autocomplete-new | browser-use | 3 | PASS | 12.84 | 4 / 0 | 0.005012 |
| final-holdout.json | autocomplete-new | app-auto | 3 | PASS | 4.69 | 2 / 4 | 0.003951 |
| final-local.json | search | app-auto | 1 | PASS | 4.16 | 2 / 3 | 0.003938 |
| final-local.json | search | app-first | 1 | PASS | 5.94 | 2 / 3 | 0.003989 |
| final-local.json | search | browser-use | 1 | PASS | 4.85 | 2 / 0 | 0.002577 |
| final-local.json | search | app-first | 2 | PASS | 4.38 | 2 / 3 | 0.004267 |
| final-local.json | search | browser-use | 2 | PASS | 7.34 | 3 / 0 | 0.004485 |
| final-local.json | search | app-auto | 2 | PASS | 4.64 | 2 / 3 | 0.003938 |
| final-local.json | search | browser-use | 3 | PASS | 6.68 | 2 / 0 | 0.003058 |
| final-local.json | search | app-auto | 3 | PASS | 4.72 | 2 / 3 | 0.003944 |
| final-local.json | search | app-first | 3 | PASS | 5.23 | 2 / 3 | 0.004898 |
| final-local.json | filters | app-first | 1 | PASS | 3.69 | 2 / 4 | 0.004092 |
| final-local.json | filters | browser-use | 1 | PASS | 6.07 | 2 / 0 | 0.002983 |
| final-local.json | filters | app-auto | 1 | PASS | 5.51 | 2 / 4 | 0.004056 |
| final-local.json | filters | browser-use | 2 | PASS | 5.45 | 2 / 0 | 0.002469 |
| final-local.json | filters | app-auto | 2 | PASS | 4.80 | 2 / 4 | 0.004063 |
| final-local.json | filters | app-first | 2 | PASS | 4.97 | 2 / 4 | 0.004143 |
| final-local.json | filters | app-auto | 3 | PASS | 4.98 | 2 / 4 | 0.004152 |
| final-local.json | filters | app-first | 3 | PASS | 3.84 | 2 / 4 | 0.004094 |
| final-local.json | filters | browser-use | 3 | PASS | 9.35 | 2 / 0 | 0.002705 |
| final-local.json | autocomplete | browser-use | 1 | PASS | 9.52 | 4 / 0 | 0.004930 |
| final-local.json | autocomplete | app-auto | 1 | PASS | 10.61 | 2 / 4 | 0.003946 |
| final-local.json | autocomplete | app-first | 1 | PASS | 6.05 | 3 / 2 | 0.006303 |
| final-local.json | autocomplete | app-auto | 2 | PASS | 4.52 | 2 / 4 | 0.003943 |
| final-local.json | autocomplete | app-first | 2 | PASS | 4.20 | 2 / 4 | 0.004074 |
| final-local.json | autocomplete | browser-use | 2 | PASS | 8.09 | 4 / 0 | 0.004545 |
| final-local.json | autocomplete | app-first | 3 | PASS | 4.61 | 2 / 4 | 0.004015 |
| final-local.json | autocomplete | browser-use | 3 | PASS | 9.43 | 4 / 0 | 0.004641 |
| final-local.json | autocomplete | app-auto | 3 | PASS | 8.72 | 2 / 4 | 0.003964 |
| final-local.json | wizard-6 | app-auto | 1 | PASS | 13.35 | 8 / 0 | 0.027760 |
| final-local.json | wizard-6 | app-first | 1 | PASS | 24.51 | 13 / 14 | 0.054731 |
| final-local.json | wizard-6 | browser-use | 1 | PASS | 24.28 | 7 / 0 | 0.011786 |
| final-local.json | wizard-6 | app-first | 2 | PASS | 30.08 | 14 / 13 | 0.061246 |
| final-local.json | wizard-6 | browser-use | 2 | PASS | 26.62 | 7 / 0 | 0.011758 |
| final-local.json | wizard-6 | app-auto | 2 | PASS | 21.56 | 8 / 0 | 0.027564 |
| final-local.json | wizard-6 | browser-use | 3 | PASS | 21.41 | 7 / 0 | 0.011227 |
| final-local.json | wizard-6 | app-auto | 3 | PASS | 11.27 | 8 / 0 | 0.027577 |
| final-local.json | wizard-6 | app-first | 3 | PASS | 44.82 | 26 / 1 | 0.172761 |
| final-local.json | wizard-10 | app-first | 1 | PASS | 60.36 | 42 / 1 | 0.256966 |
| final-local.json | wizard-10 | browser-use | 1 | PASS | 40.21 | 11 / 0 | 0.020710 |
| final-local.json | wizard-10 | app-auto | 1 | PASS | 26.14 | 12 / 0 | 0.051791 |
| final-local.json | wizard-10 | browser-use | 2 | PASS | 47.80 | 11 / 0 | 0.020476 |
| final-local.json | wizard-10 | app-auto | 2 | PASS | 26.79 | 12 / 0 | 0.052034 |
| final-local.json | wizard-10 | app-first | 2 | PASS | 74.49 | 42 / 1 | 0.261911 |
| final-local.json | wizard-10 | app-auto | 3 | PASS | 24.80 | 12 / 0 | 0.049183 |
| final-local.json | wizard-10 | app-first | 3 | PASS | 78.16 | 44 / 1 | 0.274408 |
| final-local.json | wizard-10 | browser-use | 3 | PASS | 36.40 | 11 / 0 | 0.022101 |
| final-local.json | compare-offers | browser-use | 1 | PASS | 13.53 | 2 / 0 | 0.017121 |
| final-local.json | compare-offers | app-auto | 1 | PASS | 4.71 | 3 / 0 | 0.007447 |
| final-local.json | compare-offers | app-first | 1 | PASS | 14.18 | 5 / 4 | 0.014436 |
| final-local.json | compare-offers | app-auto | 2 | PASS | 4.59 | 3 / 0 | 0.007362 |
| final-local.json | compare-offers | app-first | 2 | PASS | 11.50 | 6 / 2 | 0.016200 |
| final-local.json | compare-offers | browser-use | 2 | PASS | 8.99 | 2 / 0 | 0.014877 |
| final-local.json | compare-offers | app-first | 3 | PASS | 12.26 | 6 / 1 | 0.017059 |
| final-local.json | compare-offers | browser-use | 3 | PASS | 8.17 | 2 / 0 | 0.015079 |
| final-local.json | compare-offers | app-auto | 3 | PASS | 6.09 | 3 / 0 | 0.007407 |
| final-local.json | research-offers | app-auto | 1 | PASS | 17.09 | 9 / 0 | 0.033310 |
| final-local.json | research-offers | app-first | 1 | PASS | 14.82 | 9 / 2 | 0.034103 |
| final-local.json | research-offers | browser-use | 1 | PASS | 31.16 | 8 / 0 | 0.050451 |
| final-local.json | research-offers | app-first | 2 | PASS | 15.81 | 10 / 2 | 0.039138 |
| final-local.json | research-offers | browser-use | 2 | FAIL | 1.50 | 4 / 0 | 0.000000 |
| final-local.json | research-offers | app-auto | 2 | FAIL | 0.20 | 1 / 0 | 0.000000 |
| final-local.json | research-offers | browser-use | 3 | FAIL | 1.58 | 4 / 0 | 0.000000 |
| final-local.json | research-offers | app-auto | 3 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | research-offers | app-first | 3 | FAIL | 0.14 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 1 | FAIL | 0.09 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 1 | FAIL | 1.42 | 4 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 1 | FAIL | 0.17 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 2 | FAIL | 1.22 | 4 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 2 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 2 | FAIL | 0.07 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 3 | FAIL | 0.19 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 3 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 3 | FAIL | 1.51 | 4 / 0 | 0.000000 |
| final-recovery.json | research-offers | app-auto | 1 | PASS | 13.72 | 7 / 0 | 0.022533 |
| final-recovery.json | research-offers | app-first | 1 | PASS | 21.49 | 10 / 2 | 0.039080 |
| final-recovery.json | research-offers | browser-use | 1 | PASS | 28.54 | 8 / 0 | 0.054545 |
| final-recovery.json | research-offers | app-first | 2 | PASS | 14.85 | 8 / 2 | 0.028531 |
| final-recovery.json | research-offers | browser-use | 2 | PASS | 33.75 | 8 / 0 | 0.056443 |
| final-recovery.json | research-offers | app-auto | 2 | PASS | 14.00 | 9 / 0 | 0.033011 |
| final-recovery.json | research-offers | browser-use | 3 | PASS | 29.03 | 8 / 0 | 0.056679 |
| final-recovery.json | research-offers | app-auto | 3 | PASS | 13.42 | 9 / 0 | 0.030990 |
| final-recovery.json | research-offers | app-first | 3 | PASS | 18.97 | 9 / 2 | 0.033328 |
| final-recovery.json | tabs | app-first | 1 | PASS | 4.99 | 3 / 2 | 0.006334 |
| final-recovery.json | tabs | browser-use | 1 | PASS | 9.16 | 5 / 0 | 0.002399 |
| final-recovery.json | tabs | app-auto | 1 | PASS | 5.99 | 3 / 4 | 0.006007 |
| final-recovery.json | tabs | browser-use | 2 | PASS | 4.95 | 2 / 0 | 0.002705 |
| final-recovery.json | tabs | app-auto | 2 | PASS | 6.61 | 3 / 4 | 0.006237 |
| final-recovery.json | tabs | app-first | 2 | PASS | 5.15 | 3 / 2 | 0.006142 |
| final-recovery.json | tabs | app-auto | 3 | PASS | 5.43 | 3 / 4 | 0.006001 |
| final-recovery.json | tabs | app-first | 3 | PASS | 7.58 | 3 / 4 | 0.006389 |
| final-recovery.json | tabs | browser-use | 3 | PASS | 7.05 | 2 / 0 | 0.003013 |
| headful-auto.json | search | app-auto | 1 | PASS | 3.93 | 2 / 3 | 0.003941 |
| pilot-auto-1.json | search | app-auto | 1 | PASS | 3.72 | 2 / 3 | 0.004716 |
| pilot-auto-1.json | wizard-6 | app-auto | 1 | PASS | 9.93 | 7 / 5 | 0.024082 |
| pilot-auto-1.json | compare-offers | app-auto | 1 | PASS | 7.51 | 4 / 0 | 0.009110 |
| pilot-auto-1.json | tabs | app-auto | 1 | PASS | 7.55 | 3 / 4 | 0.005870 |
| pilot-auto-1.json | google-flights | app-auto | 1 | PASS | 41.02 | 24 / 1 | 0.237512 |
| pilot-confidence-035.json | google-flights | app-auto | 1 | PASS | 50.94 | 25 / 9 | 0.233415 |
| pilot-context-v2.json | google-flights | app-auto | 1 | FAIL | 18.33 | 2 / 11 | 0.005164 |
| pilot-guard-v5.json | google-flights | app-auto | 1 | PASS | 18.65 | 2 / 19 | 0.018395 |
| pilot-guard-v5.json | google-flights | app-auto | 2 | PASS | 18.90 | 2 / 19 | 0.018153 |
| pilot-occlusion-v3.json | autocomplete | app-auto | 1 | PASS | 5.39 | 2 / 4 | 0.003967 |
| pilot-occlusion-v3.json | wizard-6 | app-auto | 1 | PASS | 10.54 | 8 / 0 | 0.027515 |
| pilot-occlusion-v3.json | research-offers | app-auto | 1 | PASS | 19.45 | 9 / 0 | 0.030766 |
| pilot-occlusion-v3.json | google-flights | app-auto | 1 | PASS | 22.85 | 9 / 11 | 0.082580 |
| pilot-runner-validation.json | search | app-auto | 1 | PASS | 4.01 | 2 / 3 | 0.003914 |
| pilot-runner-validation.json | search | app-first | 1 | PASS | 3.36 | 2 / 3 | 0.003997 |
| pilot-runner-validation.json | search | ultrafast | 1 | PASS | 2.86 | 1 / 3 | 0.000476 |
| pilot-runner-validation.json | search | browser-use | 1 | PASS | 5.03 | 2 / 0 | 0.002756 |
| pilot-stale-v4.json | google-flights | app-auto | 1 | PASS | 17.55 | 2 / 18 | 0.017521 |
| pilot-stale-v4.json | google-flights | app-auto | 2 | PASS | 37.97 | 6 / 14 | 0.053712 |
| stop-auto.json | google-flights | app-auto | 1 | STOP (intentional) | 2.50 | 1 / 0 | 0.001987 |

Every routing decision (tools are not executed):

| Series | Case | Expected | Selected | Result | Time s | USD |
|---|---|---|---|---|---:|---:|
| decisions-final-heldout.json | italian-city | fast | fast | PASS | 1.24 | 0.001599 |
| decisions-final-heldout.json | inventory | fast | fast | PASS | 1.46 | 0.001605 |
| decisions-final-heldout.json | lease-cost | planned | planned | PASS | 1.01 | 0.001539 |
| decisions-final-heldout.json | multi-page | planned | planned | PASS | 0.97 | 0.001470 |
| decisions-final-heldout.json | registration-wizard | planned | planned | PASS | 1.10 | 0.001540 |
| decisions-final-heldout.json | missing-card | planned | planned | PASS | 1.10 | 0.001650 |
| decisions-pilot-1.json | search | fast | fast | PASS | 1.46 | 0.001586 |
| decisions-pilot-1.json | filters | fast | planned | FAIL | 1.01 | 0.001371 |
| decisions-pilot-1.json | autocomplete | fast | planned | FAIL | 1.09 | 0.001346 |
| decisions-pilot-1.json | flights | fast | planned | FAIL | 2.34 | 0.001388 |
| decisions-pilot-1.json | polish-search | fast | fast | PASS | 1.22 | 0.001643 |
| decisions-pilot-1.json | new-tab | fast | planned | FAIL | 0.89 | 0.001369 |
| decisions-pilot-1.json | hotel | planned | planned | PASS | 0.79 | 0.001385 |
| decisions-pilot-1.json | research | planned | planned | PASS | 1.29 | 0.001384 |
| decisions-pilot-1.json | polish-analysis | planned | planned | PASS | 1.06 | 0.001385 |
| decisions-pilot-1.json | missing-values | planned | planned | PASS | 1.07 | 0.001732 |
| decisions-pilot-1.json | article | planned | planned | PASS | 2.50 | 0.001347 |
| decisions-pilot-1.json | mixed | planned | planned | PASS | 1.01 | 0.001377 |
| decisions-pilot-1.json | wizard | planned | planned | PASS | 0.81 | 0.001396 |
| decisions-pilot-1.json | form | planned | planned | PASS | 0.91 | 0.001672 |
| decisions-pilot-1.json | form-polish | planned | planned | PASS | 1.13 | 0.001870 |
| decisions-pilot-1.json | cycle-recovery | planned | planned | PASS | 0.79 | 0.001382 |
| decisions-pilot-2.json | search | fast | fast | PASS | 1.39 | 0.001636 |
| decisions-pilot-2.json | filters | fast | fast | PASS | 0.97 | 0.001489 |
| decisions-pilot-2.json | autocomplete | fast | fast | PASS | 1.02 | 0.001528 |
| decisions-pilot-2.json | flights | fast | fast | PASS | 1.31 | 0.001990 |
| decisions-pilot-2.json | polish-search | fast | fast | PASS | 0.94 | 0.001674 |
| decisions-pilot-2.json | new-tab | fast | fast | PASS | 1.47 | 0.001490 |
| decisions-pilot-2.json | hotel | planned | planned | PASS | 0.91 | 0.001427 |
| decisions-pilot-2.json | research | planned | planned | PASS | 2.41 | 0.001427 |
| decisions-pilot-2.json | polish-analysis | planned | planned | PASS | 1.05 | 0.001427 |
| decisions-pilot-2.json | missing-values | planned | planned | PASS | 1.08 | 0.001561 |
| decisions-pilot-2.json | article | planned | planned | PASS | 1.06 | 0.001412 |
| decisions-pilot-2.json | mixed | planned | planned | PASS | 1.02 | 0.001420 |
| decisions-pilot-2.json | wizard | planned | fast | FAIL | 1.62 | 0.002297 |
| decisions-pilot-2.json | form | planned | planned | PASS | 0.98 | 0.001718 |
| decisions-pilot-2.json | form-polish | planned | planned | PASS | 1.08 | 0.001906 |
| decisions-pilot-2.json | cycle-recovery | planned | planned | PASS | 0.95 | 0.001425 |
| decisions-pilot-3.json | search | fast | fast | PASS | 1.15 | 0.001618 |
| decisions-pilot-3.json | filters | fast | fast | PASS | 1.17 | 0.001572 |
| decisions-pilot-3.json | autocomplete | fast | fast | PASS | 1.15 | 0.001562 |
| decisions-pilot-3.json | flights | fast | fast | PASS | 2.42 | 0.002002 |
| decisions-pilot-3.json | polish-search | fast | fast | PASS | 1.15 | 0.001716 |
| decisions-pilot-3.json | new-tab | fast | fast | PASS | 7.58 | 0.001543 |
| decisions-pilot-3.json | hotel | planned | planned | PASS | 1.02 | 0.001462 |
| decisions-pilot-3.json | research | planned | planned | PASS | 1.03 | 0.001461 |
| decisions-pilot-3.json | polish-analysis | planned | planned | PASS | 1.08 | 0.001466 |
| decisions-pilot-3.json | missing-values | planned | planned | PASS | 1.16 | 0.001502 |
| decisions-pilot-3.json | article | planned | planned | PASS | 1.17 | 0.001447 |
| decisions-pilot-3.json | mixed | planned | planned | PASS | 1.01 | 0.001525 |
| decisions-pilot-3.json | wizard | planned | planned | PASS | 2.34 | 0.001533 |
| decisions-pilot-3.json | form | planned | planned | PASS | 2.36 | 0.001749 |
| decisions-pilot-3.json | form-polish | planned | planned | PASS | 1.14 | 0.001891 |
| decisions-pilot-3.json | cycle-recovery | planned | planned | PASS | 1.29 | 0.001460 |
| decisions-post-schema-heldout.json | italian-city | fast | fast | PASS | 3.00 | 0.001622 |
| decisions-post-schema-heldout.json | inventory | fast | fast | PASS | 2.05 | 0.001591 |
| decisions-post-schema-heldout.json | lease-cost | planned | planned | PASS | 4.08 | 0.001476 |
| decisions-post-schema-heldout.json | multi-page | planned | planned | PASS | 1.10 | 0.001467 |
| decisions-post-schema-heldout.json | registration-wizard | planned | planned | PASS | 0.88 | 0.001533 |
| decisions-post-schema-heldout.json | missing-card | planned | planned | PASS | 1.10 | 0.001617 |
| decisions-post-schema-retry.json | form | planned | planned | PASS | 1.19 | 0.001794 |
| decisions-post-schema-retry.json | form-polish | planned | planned | PASS | 1.11 | 0.001922 |
| decisions-post-schema.json | search | fast | fast | PASS | 1.33 | 0.001656 |
| decisions-post-schema.json | filters | fast | fast | PASS | 1.74 | 0.001583 |
| decisions-post-schema.json | autocomplete | fast | fast | PASS | 0.97 | 0.001570 |
| decisions-post-schema.json | flights | fast | fast | PASS | 1.14 | 0.001874 |
| decisions-post-schema.json | polish-search | fast | fast | PASS | 1.10 | 0.001712 |
| decisions-post-schema.json | new-tab | fast | planned | FAIL | 1.79 | 0.001446 |
| decisions-post-schema.json | hotel | planned | planned | PASS | 0.94 | 0.001481 |
| decisions-post-schema.json | research | planned | planned | PASS | 1.09 | 0.001480 |
| decisions-post-schema.json | polish-analysis | planned | planned | PASS | 0.89 | 0.001484 |
| decisions-post-schema.json | missing-values | planned | planned | PASS | 1.02 | 0.001539 |
| decisions-post-schema.json | article | planned | planned | PASS | 1.31 | 0.001466 |
| decisions-post-schema.json | mixed | planned | planned | PASS | 2.55 | 0.001473 |
| decisions-post-schema.json | wizard | planned | planned | PASS | 0.99 | 0.001556 |
| decisions-post-schema.json | form | planned | — | FAIL | 1.29 | 0.000000 |
| decisions-post-schema.json | form-polish | planned | — | FAIL | 1.10 | 0.000000 |
| decisions-post-schema.json | cycle-recovery | planned | planned | PASS | 2.19 | 0.001478 |

Every desktop check:

| Series | Check | Result | Time s (when measured) |
|---|---|---|---:|
| desktop-auto-recheck.json | auto_navigation | PASS | 7.39 |
| desktop-auto-recheck.json | stop | PASS | 0.03 |
| desktop-auto-recheck.json | classic_after_stop | FAIL | — |
| desktop-auto-schema.json | auto_navigation | PASS | 6.39 |
| desktop-auto-schema.json | stop | PASS | 0.03 |
| desktop-auto-schema.json | classic_after_stop | PASS | — |
| desktop-auto-schema.json | followup_context | PASS | — |
| desktop-auto.json | auto_navigation | PASS | 15.51 |
| desktop-auto.json | stop | PASS | 0.03 |
| desktop-auto.json | classic_after_stop | FAIL | — |
