# Native browser PoC: historical results

This is the earlier, separate September 17 experiment with Gemini and three engines. Later Auto results are in the [complete archive](../../research/ALL-RESULTS.md#auto). Raw measurements and their historical source hashes are unchanged; this English report replaces the earlier Polish narrative.

## Final comparison

Success requires both agent completion and independent verification. Local cells have three attempts; Flights has ten. Medians include successful attempts only; failures remain in the denominator.

| Task | First + Gemini | Ultrafast + Gemini | Browser Use + Gemini |
| --- | ---: | ---: | ---: |
| google-flights | 30.78 s · 10/10 | 11.42 s · 10/10 | 34.82 s · 10/10 |
| search | 3.54 s · 3/3 | 2.48 s · 3/3 | 4.45 s · 3/3 |
| filters | 3.60 s · 3/3 | 1.74 s · 3/3 | 5.45 s · 3/3 |
| autocomplete | 4.37 s · 3/3 | 2.45 s · 3/3 | 8.20 s · 3/3 |
| wizard-6 | 34.96 s · 3/3 | 24.07 s · 3/3 | 20.20 s · 3/3 |
| wizard-10 | 51.84 s · 3/3 | 37.33 s · 3/3 | 33.46 s · 3/3 |
| compare-offers | 9.11 s · 3/3 | — · 0/3 | 10.49 s · 3/3 |
| research-offers | 13.80 s · 3/3 | — · 0/3 | 27.26 s · 3/3 |
| tabs | 4.93 s · 3/3 | — · 0/3 | 4.30 s · 3/3 |

First and Browser Use completed 34/34 each; Ultrafast completed 25/34. It failed all six analysis tasks at its 60-action limit without invoking Gemini. In three new-tab attempts, the correct page opened but the engine remained on the old tab and ended blocked. Counting page state alone would give 28/34, which is not autonomous completion.

## Timing and architecture

Flights medians were 30.782 s First, 11.424 s Ultrafast and 34.824 s Browser Use. P90 values were 32.251, 11.689 and 37.406 s, describing this small sample only. Mean primary-model time was 26.382, 2.086 and 19.452 s; mean Jev time 1.678, 7.654 and 0 s; mean other work 2.153, 1.589 and 15.425 s. Setup means were 1.643, 2.247 and 2.881 s, outside task time. Mean components are additive; medians are not.

Across ten Flights attempts, First used 193 Gemini and 22 Jev calls; Ultrafast used 20 Gemini and 184 Jev calls; Browser Use used 113 Gemini calls. The fast loop reduces visits to the generative planner. The author’s seven-second Ultrafast/Mercury measurement uses another configuration and clock; this is not an exact reproduction.

In the ten-stage form, First used 42–43 Gemini calls, Ultrafast 20 and Browser Use 11 per attempt. Batching changed the ranking. In offer analysis, a stronger field-value helper did not help when the decision loop never invoked it for reasoning. Confidence values above 0.55 did not prevent wrong hotel choices.

## Conditions, costs and validation

The model was `google/gemini-3.8-flash / low`, upstream `google-ai-studio`, Jev `jev-1.13.0`. Frozen PoC revision: `6354eac83e6985d4082fb116e986da089886fc7c`; app baseline `77846cb`. [Native pins](sources.json). Chrome 151.0.7922.34, viewport 1120×780, en-US, Europe/Zurich, Python 3.12.12, Node 24.20.0. Sequential rotating engine order. Flights repeats 1–5 used fresh profiles; 6–10 reused repeat 5’s profile with a new browser process and reset fields. This does not isolate cache alone.

Task time includes retries/recovery and independent verification; browser startup, navigation, consent and initial observation are setup. Final screenshot and cleanup are outside task time. Common limits were 240 s and $1 reported usage per attempt. Native action/step limits differ and are documented in the [test catalog](../../research/TEST-CATALOG.md). Browser Use groups up to five actions, uses vision on demand and disables its extra model judge in favor of the shared verifier. Its hosted cloud/models were not tested.

Final 102-attempt cost was $3.998840412: First $3.048718734, Ultrafast $0.166502928, Browser Use $0.783618750. All retained PoC records, including pilots/Stop/headful, cost $4.295353056. These amounts include returned OpenRouter usage and a Jev estimate at the configured $0.042/M input tokens; missing interrupted usage, subscriptions, infrastructure and development are excluded.

Validation included 31 upstream offline tests, negative verifier checks, a visible-window search smoke and deliberate Stop tests. Final browser closure measurements were about 0.96 s for First and 0.15 s for both native engines; full Ultrafast cleanup took about 2.09 s. These clocks differ from desktop UI response. Earlier setup errors, provider timeout, cycles and screenshots after Stop remain in [diagnostics](results/diagnostics.json.gz). Post-comparison changes improved Stop measurement and redaction without replacing completed final measurements.

## Resulting design decision

Keep the application, UX and permission checks. Let the planner read and reason, delegate short mechanical subgoals, group known fields, detect cycles and return from uncertainty with fresh evidence. Browser Use is a useful comparison, not evidence that the entire app should be replaced. The later Auto implementation tested this direction.

[All attempts](../../research/ALL-RESULTS.md) · [Flights JSON](results/final-flights.json) · [Local JSON](results/final-local.json) · [Statistics](results/summary.json) · [Traces](results/final-traces.json.gz) · [Validation](results/validation.json) · [Security check](results/security.json) · [Portable reproduction](../../BENCHMARKS.md).
