# Jev First + Gemini through OpenRouter: measured comparison

Implementation: `8d99ab0` on `experiment/jev-browser`. All final variants use this same implementation; pilot and diagnostic attempts are kept separately. Gemini is `google/gemini-3.8-flash` with `low` reasoning through OpenRouter, pinned to `google-ai-studio`; Luna is `gpt-5.6-luna / low` through Codex. Runs are interleaved, with rotating order. No automatic stronger-model escalation.

## Local tasks: 72 attempts

Eight small local scenarios, three repetitions per variant, fresh host Chromium profile per attempt. All attempts are retained. Medians use successful attempts; time includes independent verification and excludes setup.

| Variant | Independently correct | Median task | Primary calls, all attempts | Jev decisions |
|---|---:|---:|---:|---:|
| Jev First + Luna | 23/24 | 9.94 s | 61 | 70 |
| Jev First + Gemini | 24/24 | 4.05 s | 58 | 77 |
| Classic + Gemini | 23/24 | 8.68 s | 173 | 0 |

Jev First + Gemini lowered the pooled successful-task median by about **59%** against Jev First + Luna. Across the 23 scenario/repetition pairs where both succeeded, the median speed ratio was **2.54×**. Against Classic + Gemini, the pooled median was about 53% lower. These results describe these fixtures and current provider conditions, not general web-agent reliability.

The earlier 15.12-second Luna median came from a different run; the appropriate concurrent baseline here is 9.94 seconds.

| Component, mean per attempt | First + Luna | First + Gemini | Classic + Gemini |
|---|---:|---:|---:|
| Primary adapter round trips | 9.73 s | 2.96 s | 9.13 s |
| Jev requests | 1.22 s | 1.13 s | 0 |
| Browser, host and independent verification | 0.12 s | 0.21 s | 0.09 s |
| Total mean | 11.06 s | 4.29 s | 9.21 s |

Component means are additive; they are different statistics from the task medians above. Median individual primary round trip: First/Luna **2.81 s**, First/Gemini **1.05 s**. Codex timing includes its runtime/transport/initialization and model response; existing measurements do not isolate pure inference. OpenRouter timing records headers and full response, not first token. Failed primary requests also count toward elapsed time.

Failures: Luna accepted text entered into autocomplete without selecting the suggestion. Classic/Gemini repeatedly supplied an invalid action shape and then returned an empty API response; the adapter rejected it. First/Gemini passed all 24 external checks. No Jev provider failures occurred in this series.

Reported primary API cost: First/Gemini **$0.113829**, Classic/Gemini **$0.236642**. Estimated Jev total across both First variants: **$0.007456**. Luna subscription usage is unpriced. Failed/interrupted requests may be billed without a returned usage record.

[Local metrics](jev-openrouter-local-2026-09-17.json) · [Local traces](jev-openrouter-local-2026-09-17-traces.json.gz).

## Google Flights

Goal matches the public Jev Ultrafast example: one-way Zurich → London, September 20, 2026, one adult, economy; stop at visible matching results, without selecting or booking a flight. Browser viewport is 1120×780, locale en-US, timezone Europe/Zurich. Each attempt starts with a new isolated profile; consent rejection, browser startup, initial navigation and an initial page observation are recorded as setup. Task time includes the agent and an independent final verifier. Screenshots are outside task time.

The verifier checks route, date and year, one-way mode, passenger count, economy and actual flight result rows. Both engines use visible controls; guessed encoded search URLs are prohibited in the shared prompt.

| Variant | Correct | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|---:|
| Jev First + Luna | 3/3 | 78.59 s | 160.94 s | 84.07 s | **84.07 s** |
| Jev First + Gemini | 3/3 | 35.33 s | 28.37 s | 33.06 s | **33.06 s** |
| Classic + Gemini | 3/3 | 44.12 s | 30.85 s | 29.32 s | **30.85 s** |

First/Gemini's pooled median was **60.7% lower (2.54× speed ratio)** than First/Luna. For Gemini, Classic had the lower pooled median, while First was faster in two of three matched pairs and had a lower mean (32.25 versus 34.76 seconds). Three pairs do not establish a reliable engine winner. The reference 7-second result was not reproduced.

| Component, mean per attempt | First + Luna | First + Gemini | Classic + Gemini |
|---|---:|---:|---:|
| Primary adapter | 99.62 s | 28.93 s | 33.97 s |
| Jev | 2.98 s | 1.13 s | 0 |
| Browser/host/check | 5.27 s | 2.20 s | 0.80 s |
| Total mean | 107.86 s | 32.25 s | 34.76 s |

For First/Gemini, about **90%** of task time still went to primary-model round trips: 58 calls across three tasks (18, 18 and 22). Jev made just five decisions in total before returning control for uncertainty or an uncertain action result. All recovery passed through the normal tool policy; denied or uncertain actions were not automatically replayed. This is why substituting a faster primary model helps, but does not reproduce a Jev-driven loop. A Browser Use/Jev Ultrafast experiment would need to change that loop, not just the browser launcher or UI.

Browser preparation averaged 2.77–2.82 seconds, separately from task time. Independent verification averaged about 31 ms. There were no setup failures, Jev service errors, approval requests or unsuccessful results in the final Flights series. One Luna round trip took 31.2 seconds, illustrating substantial runtime/provider variation.

Reported primary API charge for this series: First/Gemini **$0.456230**, Classic/Gemini **$0.470984**; estimated Jev charge across both First variants **$0.008841**. Total reported OpenRouter charges for the two final comparison series: **$1.277685**, excluding pilots, diagnostics, UI checks and any unreported failed-request billing.

[Flights metrics](jev-openrouter-flights-2026-09-17.json) · [Flights traces](jev-openrouter-flights-2026-09-17-traces.json.gz) · [Verified result screenshot](jev-openrouter-flights-result-2026-09-17.png).

The [reference 7.073-second recording](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md) uses a different architecture: Jev executes the loop, with Mercury only supplying text values. It uses an existing Chrome profile and excludes the independent post-run verification from the recording clock. It is a useful target, not a matched measurement against our app.

## Validation and diagnostics

The desktop smoke checked Electron → daemon → browser container navigation, Stop, Classic after Stop and a follow-up that creates a new adapter from persisted conversation context. It used the same encrypted OpenRouter credential and API model as the benchmark. Model/effort are host-configured; engine selection remains in the existing UI.

Final verification: **432 tests passed, 12 skipped**; typecheck and build passed. One earlier full-suite run overlapped the desktop smoke and hit an existing terminal idle-detection timing failure; the isolated rerun and the final full suite both passed, with no terminal implementation changes.

Desktop navigation passed in 7.66 seconds including UI submission, Stop reached the stopped state in 173 ms (including the test's polling interval), Classic after Stop passed, and persisted-context follow-up passed. There were no renderer errors. The OpenRouter key was confirmed encrypted in OS safeStorage and absent from the private .env; settings permissions were 0600. The key was never added to the repository. [Desktop verification](jev-openrouter-desktop-2026-09-17.json).

Pilots are excluded from the final comparison. The first Flights pilot also exposed an independent-verifier bug: labels change after an airport is selected and custom combobox names can use aria-labelledby. That diagnostic remains marked with its original failed check rather than being silently relabelled. Another diagnostic contained a real failed search and a consent-navigation setup failure. Neither is mixed into the final sample.

[Local pilot](jev-openrouter-pilot-2026-09-17.json) · [Flights pilot](jev-openrouter-flights-pilot-2026-09-17.json) · [Flights diagnostic](jev-openrouter-flights-diagnostic-2026-09-17.json) · [Configuration and reproduction](../openrouter.md).
