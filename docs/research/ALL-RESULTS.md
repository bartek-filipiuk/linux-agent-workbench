# All retained browser experiments

English archive of measurements from September 17–18, 2026. Generated from canonical JSON by `python3 scripts/research-report.py`; no benchmarks are rerun. The original measurements, including non-English test prompts and page text, remain unchanged as evidence.

**606 runner records**, **78 routing cases**, **8 direct-driver cases**, and **24 desktop checks**. These categories have different success criteria and clocks. They must not be combined into one benchmark success rate.

[Current findings and charts](README.md) · [Task catalog and methodology](TEST-CATALOG.md) · [Costs](COSTS.md) · [CSV](trials.csv) · [Application](../APPLICATION.md)

Known retained usage plus estimated Jev cost: **$11.050362711**. Subscription allocation, missing interrupted usage, earlier desktop usage and development work are not included. The cost ledger explains omissions and prevents double counting.

## How to read the archive

Each series below preserves source order and lists every record. A row number is a 1-based position in the canonical `results` array. Median/min/max values use successful attempts only; unsuccessful attempts remain in the denominator. Missing measurements are shown as an em dash. Setup is separate from task time; retries, recovery and independent verification belong to task time in the final PoC/Auto series. Full traces and raw observations remain in the linked files and adjacent trace archives.

The earlier final app comparisons contain 281 records; their diagnostics contain 40. Native PoC has 102 final, 16 pilot, 7 intentional Stop and 1 visible-window record. Auto has 159 runner records, including a selected 119-trial comparison and an 18-record interrupted block. The remaining Auto records are 19 pilots, one credit check, one visible-window smoke and one intentional Stop. Unit-suite totals are recorded separately in the test catalog.

### Historical interpretation

- Optional Hybrid did not establish a general speedup: it never used Jev in 28/40 attempts; paired Classic/Hybrid ratio median was about 1.01×. First made delegation explicit. Sol/Luna comparisons also changed the planner, so same-model comparisons are kept separate.
- Earlier First/Luna completed 24/24 versus Classic/Luna 23/24. The faster Gemini primary planner reduced latency further. These historical series are not pooled with the later frozen Auto comparison.
- Native PoC completed 34/34 with First, 34/34 with Browser Use, and 25/34 with Ultrafast. Ultrafast failed all six offer-analysis attempts. It opened the right new tab in three other attempts but ended blocked; these remain autonomous-completion failures. Counting only page state would give it 28/34.
- Earlier Flights PoC medians were First 30.782 s, Ultrafast 11.424 s and Browser Use 34.824 s, each over 10 attempts. Mean primary-model time was 26.382 / 2.086 / 19.452 s; Jev time 1.678 / 7.654 / 0 s; other work 2.153 / 1.589 / 15.425 s. Do not add these means to medians.
- Long forms reverse the earlier native ranking: Browser Use grouped actions while Ultrafast generated field values separately. In the ten-stage form, First used 42–43 Gemini calls, Ultrafast 20 and Browser Use 11 per attempt. Intelligence in a helper does not help if the decision loop never invokes it for reasoning.

<a id="auto"></a>
## Latest Auto comparison

The selected sample completed **119/119**. It consists of 54 records from the first six complete groups in `final-local.json`, the entire 18-record restarted research/tabs block, all 27 changed-data records, and all 20 Flights records. The original interrupted research/tabs block contains four successes and 14 credit failures; all 18 stay in this archive, excluded from the comparison as a block. The selection rule was declared before resumption. Raw final files therefore contain 137 records.

See [latest matched medians and ranges](../jev-auto-results.md). Auto improved long forms and reasoning tasks but lost some simple interactions to First. Its Flights range was 17.83–64.02 s; native Ultrafast remained fastest there. Three or five repeats are not proof of production reliability. Changed-data fixtures are not unseen websites.

Routing pilots progressed 12/16 → 15/16 → 16/16, plus 6/6 held-out categories. Each of three early pilots also contained two malformed JSON-string batch arguments; route-category tests alone missed them. After the shared schema fix, the final category check was 13/16: one valid but unexpected observation route, two HTTP 429 failures with no model response. Held-out was 6/6 and targeted retries of the two unavailable cases were 2/2. All 20 returned calls in these three checks had valid schemas. Actual execution had 193/194 valid task/batch arguments; one malformed wait was rejected and corrected within the measured time.

Retained setup/diagnostic failures include Browser Harness socket-path length, blank transport-tab verification, consent redirect races, a 25-second Jev timeout, reasoning cycles, screenshots attempted after Stop, HTTP 402 credit exhaustion, HTTP 429 rate limits and an unrelated terminal idle-detection timing failure under concurrent load. The final full suite passed. No failed attempt is replaced in the raw archive.

<a id="referencja"></a>
## External seven-second reference

The author’s Jev Ultrafast result was 7.073 s with Mercury as a text helper: 17 Jev calls totaling 3.720 s, two Mercury calls totaling 0.927 s, and 2.426 s of other work. Its clock starts after the first observation and ends at DONE; setup and the later independent verifier are outside it. This is not a result from the standard Browser Use agent with Gemini or our app. [Pinned author measurement](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/flights-measurement.json).

The author’s three paired baseline/candidate measurements were 11.214/6.964, 8.984/7.913 and 9.450/7.092 seconds. All were reported verified; this external data does not increase our counters. A separate prepared-subgoal prototype took 12.884 s; its static setup is a different experiment. [Paired comparison](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/full-speed-measurement.json) · [Prepared prototype](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/performance-prepared.md).

## Every source and attempt

### jev-2026-09-17.json

[historical/final: canonical source](../../docs/benchmarks/jev-2026-09-17.json) · 80 records · 80 recorded successes · known cost $0.002188536.

File SHA-256: `78c76984c5553c5fa4dd15a1199c91ec9ee9bbd0ae32efbcdd26bfddd1e64ec0`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / gpt-5.6-sol | 5/5 | 17.203 | 13.029–20.416 |
| search / jev-hybrid / gpt-5.6-sol | 5/5 | 12.966 | 12.029–14.834 |
| filters / classic / gpt-5.6-sol | 5/5 | 19.912 | 15.509–21.464 |
| filters / jev-hybrid / gpt-5.6-sol | 5/5 | 20.239 | 13.485–23.552 |
| autocomplete / classic / gpt-5.6-sol | 5/5 | 16.276 | 13.031–17.627 |
| autocomplete / jev-hybrid / gpt-5.6-sol | 5/5 | 17.206 | 14.626–29.823 |
| form / classic / gpt-5.6-sol | 5/5 | 22.666 | 14.066–29.916 |
| form / jev-hybrid / gpt-5.6-sol | 5/5 | 14.686 | 13.250–20.299 |
| navigation / classic / gpt-5.6-sol | 5/5 | 15.138 | 14.147–19.867 |
| navigation / jev-hybrid / gpt-5.6-sol | 5/5 | 15.514 | 12.773–16.689 |
| tabs / classic / gpt-5.6-sol | 5/5 | 15.724 | 13.059–20.182 |
| tabs / jev-hybrid / gpt-5.6-sol | 5/5 | 16.691 | 9.849–23.871 |
| scroll / classic / gpt-5.6-sol | 5/5 | 15.689 | 12.655–17.998 |
| scroll / jev-hybrid / gpt-5.6-sol | 5/5 | 18.676 | 14.601–25.327 |
| disclosure / classic / gpt-5.6-sol | 5/5 | 10.600 | 9.489–12.047 |
| disclosure / jev-hybrid / gpt-5.6-sol | 5/5 | 10.840 | 9.816–12.848 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / gpt-5.6-sol | 1 | True | 15.897 | 0.191 | 15.800 | 0.000 | 6 / 0 | 0.000000000 |
| 2 | search | jev-hybrid / gpt-5.6-sol | 1 | True | 12.029 | 0.194 | 10.667 | 1.266 | 4 / 3 | 0.000137550 |
| 3 | search | jev-hybrid / gpt-5.6-sol | 2 | True | 12.966 | 0.184 | 11.436 | 1.425 | 5 / 3 | 0.000138306 |
| 4 | search | classic / gpt-5.6-sol | 2 | True | 13.029 | 0.191 | 12.943 | 0.000 | 6 / 0 | 0.000000000 |
| 5 | search | classic / gpt-5.6-sol | 3 | True | 17.203 | 0.190 | 17.128 | 0.000 | 6 / 0 | 0.000000000 |
| 6 | search | jev-hybrid / gpt-5.6-sol | 3 | True | 14.834 | 0.180 | 13.646 | 1.095 | 4 / 3 | 0.000138306 |
| 7 | search | jev-hybrid / gpt-5.6-sol | 4 | True | 14.472 | 0.187 | 13.089 | 1.285 | 4 / 3 | 0.000139062 |
| 8 | search | classic / gpt-5.6-sol | 4 | True | 17.793 | 0.185 | 17.710 | 0.000 | 6 / 0 | 0.000000000 |
| 9 | search | classic / gpt-5.6-sol | 5 | True | 20.416 | 0.189 | 20.342 | 0.000 | 6 / 0 | 0.000000000 |
| 10 | search | jev-hybrid / gpt-5.6-sol | 5 | True | 12.888 | 0.189 | 11.586 | 1.204 | 4 / 3 | 0.000138684 |
| 11 | filters | classic / gpt-5.6-sol | 1 | True | 20.674 | 0.187 | 20.530 | 0.000 | 8 / 0 | 0.000000000 |
| 12 | filters | jev-hybrid / gpt-5.6-sol | 1 | True | 13.485 | 0.187 | 11.799 | 1.561 | 5 / 4 | 0.000229740 |
| 13 | filters | jev-hybrid / gpt-5.6-sol | 2 | True | 20.239 | 0.201 | 20.141 | 0.000 | 8 / 0 | 0.000000000 |
| 14 | filters | classic / gpt-5.6-sol | 2 | True | 19.912 | 0.194 | 19.812 | 0.000 | 8 / 0 | 0.000000000 |
| 15 | filters | classic / gpt-5.6-sol | 3 | True | 15.509 | 0.189 | 15.406 | 0.000 | 9 / 0 | 0.000000000 |
| 16 | filters | jev-hybrid / gpt-5.6-sol | 3 | True | 14.481 | 0.186 | 12.747 | 1.597 | 5 / 4 | 0.000229740 |
| 17 | filters | jev-hybrid / gpt-5.6-sol | 4 | True | 23.552 | 0.195 | 23.451 | 0.000 | 8 / 0 | 0.000000000 |
| 18 | filters | classic / gpt-5.6-sol | 4 | True | 17.148 | 0.201 | 17.037 | 0.000 | 8 / 0 | 0.000000000 |
| 19 | filters | classic / gpt-5.6-sol | 5 | True | 21.464 | 0.197 | 21.354 | 0.000 | 8 / 0 | 0.000000000 |
| 20 | filters | jev-hybrid / gpt-5.6-sol | 5 | True | 20.406 | 0.197 | 20.309 | 0.000 | 8 / 0 | 0.000000000 |
| 21 | autocomplete | classic / gpt-5.6-sol | 1 | True | 16.617 | 0.193 | 16.506 | 0.000 | 6 / 0 | 0.000000000 |
| 22 | autocomplete | jev-hybrid / gpt-5.6-sol | 1 | True | 17.206 | 0.193 | 17.128 | 0.000 | 6 / 0 | 0.000000000 |
| 23 | autocomplete | jev-hybrid / gpt-5.6-sol | 2 | True | 17.117 | 0.192 | 17.042 | 0.000 | 6 / 0 | 0.000000000 |
| 24 | autocomplete | classic / gpt-5.6-sol | 2 | True | 13.031 | 0.219 | 12.959 | 0.000 | 6 / 0 | 0.000000000 |
| 25 | autocomplete | classic / gpt-5.6-sol | 3 | True | 15.876 | 0.193 | 15.791 | 0.000 | 6 / 0 | 0.000000000 |
| 26 | autocomplete | jev-hybrid / gpt-5.6-sol | 3 | True | 29.823 | 0.185 | 29.077 | 0.665 | 9 / 1 | 0.000041412 |
| 27 | autocomplete | jev-hybrid / gpt-5.6-sol | 4 | True | 14.626 | 0.189 | 14.553 | 0.000 | 6 / 0 | 0.000000000 |
| 28 | autocomplete | classic / gpt-5.6-sol | 4 | True | 17.627 | 0.194 | 17.558 | 0.000 | 6 / 0 | 0.000000000 |
| 29 | autocomplete | classic / gpt-5.6-sol | 5 | True | 16.276 | 0.187 | 16.163 | 0.000 | 6 / 0 | 0.000000000 |
| 30 | autocomplete | jev-hybrid / gpt-5.6-sol | 5 | True | 17.644 | 0.180 | 17.543 | 0.000 | 6 / 0 | 0.000000000 |
| 31 | form | classic / gpt-5.6-sol | 1 | True | 26.775 | 0.183 | 26.674 | 0.000 | 8 / 0 | 0.000000000 |
| 32 | form | jev-hybrid / gpt-5.6-sol | 1 | True | 13.250 | 0.194 | 11.488 | 1.644 | 4 / 4 | 0.000264642 |
| 33 | form | jev-hybrid / gpt-5.6-sol | 2 | True | 13.815 | 0.192 | 11.933 | 1.782 | 4 / 4 | 0.000265314 |
| 34 | form | classic / gpt-5.6-sol | 2 | True | 29.916 | 0.195 | 29.830 | 0.000 | 8 / 0 | 0.000000000 |
| 35 | form | classic / gpt-5.6-sol | 3 | True | 22.666 | 0.183 | 22.575 | 0.000 | 8 / 0 | 0.000000000 |
| 36 | form | jev-hybrid / gpt-5.6-sol | 3 | True | 20.299 | 0.193 | 20.204 | 0.000 | 8 / 0 | 0.000000000 |
| 37 | form | jev-hybrid / gpt-5.6-sol | 4 | True | 14.686 | 0.202 | 13.185 | 1.400 | 4 / 4 | 0.000267330 |
| 38 | form | classic / gpt-5.6-sol | 4 | True | 14.066 | 0.185 | 13.970 | 0.000 | 8 / 0 | 0.000000000 |
| 39 | form | classic / gpt-5.6-sol | 5 | True | 18.652 | 0.194 | 18.555 | 0.000 | 8 / 0 | 0.000000000 |
| 40 | form | jev-hybrid / gpt-5.6-sol | 5 | True | 16.784 | 0.195 | 15.106 | 1.172 | 5 / 3 | 0.000198450 |
| 41 | navigation | classic / gpt-5.6-sol | 1 | True | 16.048 | 0.187 | 15.908 | 0.000 | 6 / 0 | 0.000000000 |
| 42 | navigation | jev-hybrid / gpt-5.6-sol | 1 | True | 15.807 | 0.198 | 15.659 | 0.000 | 6 / 0 | 0.000000000 |
| 43 | navigation | jev-hybrid / gpt-5.6-sol | 2 | True | 13.276 | 0.187 | 13.111 | 0.000 | 6 / 0 | 0.000000000 |
| 44 | navigation | classic / gpt-5.6-sol | 2 | True | 14.147 | 0.194 | 13.995 | 0.000 | 6 / 0 | 0.000000000 |
| 45 | navigation | classic / gpt-5.6-sol | 3 | True | 14.300 | 0.192 | 14.147 | 0.000 | 6 / 0 | 0.000000000 |
| 46 | navigation | jev-hybrid / gpt-5.6-sol | 3 | True | 16.689 | 0.192 | 16.545 | 0.000 | 6 / 0 | 0.000000000 |
| 47 | navigation | jev-hybrid / gpt-5.6-sol | 4 | True | 15.514 | 0.195 | 15.371 | 0.000 | 6 / 0 | 0.000000000 |
| 48 | navigation | classic / gpt-5.6-sol | 4 | True | 15.138 | 0.181 | 15.003 | 0.000 | 6 / 0 | 0.000000000 |
| 49 | navigation | classic / gpt-5.6-sol | 5 | True | 19.867 | 0.187 | 19.728 | 0.000 | 6 / 0 | 0.000000000 |
| 50 | navigation | jev-hybrid / gpt-5.6-sol | 5 | True | 12.773 | 0.177 | 12.619 | 0.000 | 8 / 0 | 0.000000000 |
| 51 | tabs | classic / gpt-5.6-sol | 1 | True | 20.182 | 0.193 | 20.115 | 0.000 | 5 / 0 | 0.000000000 |
| 52 | tabs | jev-hybrid / gpt-5.6-sol | 1 | True | 9.849 | 0.187 | 9.782 | 0.000 | 4 / 0 | 0.000000000 |
| 53 | tabs | jev-hybrid / gpt-5.6-sol | 2 | True | 11.058 | 0.194 | 10.993 | 0.000 | 4 / 0 | 0.000000000 |
| 54 | tabs | classic / gpt-5.6-sol | 2 | True | 15.724 | 0.181 | 15.643 | 0.000 | 4 / 0 | 0.000000000 |
| 55 | tabs | classic / gpt-5.6-sol | 3 | True | 18.849 | 0.186 | 18.782 | 0.000 | 5 / 0 | 0.000000000 |
| 56 | tabs | jev-hybrid / gpt-5.6-sol | 3 | True | 16.691 | 0.186 | 16.621 | 0.000 | 5 / 0 | 0.000000000 |
| 57 | tabs | jev-hybrid / gpt-5.6-sol | 4 | True | 22.024 | 0.185 | 20.753 | 0.000 | 6 / 0 | 0.000000000 |
| 58 | tabs | classic / gpt-5.6-sol | 4 | True | 13.756 | 0.188 | 13.678 | 0.000 | 4 / 0 | 0.000000000 |
| 59 | tabs | classic / gpt-5.6-sol | 5 | True | 13.059 | 0.200 | 12.986 | 0.000 | 4 / 0 | 0.000000000 |
| 60 | tabs | jev-hybrid / gpt-5.6-sol | 5 | True | 23.871 | 0.189 | 23.794 | 0.000 | 7 / 0 | 0.000000000 |
| 61 | scroll | classic / gpt-5.6-sol | 1 | True | 16.221 | 0.185 | 16.140 | 0.000 | 6 / 0 | 0.000000000 |
| 62 | scroll | jev-hybrid / gpt-5.6-sol | 1 | True | 15.694 | 0.192 | 15.612 | 0.000 | 6 / 0 | 0.000000000 |
| 63 | scroll | jev-hybrid / gpt-5.6-sol | 2 | True | 18.676 | 0.188 | 18.576 | 0.000 | 6 / 0 | 0.000000000 |
| 64 | scroll | classic / gpt-5.6-sol | 2 | True | 17.998 | 0.197 | 17.914 | 0.000 | 7 / 0 | 0.000000000 |
| 65 | scroll | classic / gpt-5.6-sol | 3 | True | 14.228 | 0.196 | 14.152 | 0.000 | 8 / 0 | 0.000000000 |
| 66 | scroll | jev-hybrid / gpt-5.6-sol | 3 | True | 25.327 | 0.197 | 25.219 | 0.000 | 9 / 0 | 0.000000000 |
| 67 | scroll | jev-hybrid / gpt-5.6-sol | 4 | True | 14.601 | 0.193 | 14.501 | 0.000 | 6 / 0 | 0.000000000 |
| 68 | scroll | classic / gpt-5.6-sol | 4 | True | 12.655 | 0.191 | 12.580 | 0.000 | 4 / 0 | 0.000000000 |
| 69 | scroll | classic / gpt-5.6-sol | 5 | True | 15.689 | 0.188 | 15.598 | 0.000 | 6 / 0 | 0.000000000 |
| 70 | scroll | jev-hybrid / gpt-5.6-sol | 5 | True | 22.085 | 0.186 | 21.953 | 0.000 | 8 / 0 | 0.000000000 |
| 71 | disclosure | classic / gpt-5.6-sol | 1 | True | 10.600 | 0.191 | 10.529 | 0.000 | 4 / 0 | 0.000000000 |
| 72 | disclosure | jev-hybrid / gpt-5.6-sol | 1 | True | 12.848 | 0.188 | 12.786 | 0.000 | 4 / 0 | 0.000000000 |
| 73 | disclosure | jev-hybrid / gpt-5.6-sol | 2 | True | 10.840 | 0.187 | 10.781 | 0.000 | 4 / 0 | 0.000000000 |
| 74 | disclosure | classic / gpt-5.6-sol | 2 | True | 12.047 | 0.193 | 11.979 | 0.000 | 4 / 0 | 0.000000000 |
| 75 | disclosure | classic / gpt-5.6-sol | 3 | True | 9.840 | 0.190 | 9.775 | 0.000 | 4 / 0 | 0.000000000 |
| 76 | disclosure | jev-hybrid / gpt-5.6-sol | 3 | True | 9.816 | 0.188 | 9.760 | 0.000 | 4 / 0 | 0.000000000 |
| 77 | disclosure | jev-hybrid / gpt-5.6-sol | 4 | True | 11.898 | 0.191 | 11.834 | 0.000 | 4 / 0 | 0.000000000 |
| 78 | disclosure | classic / gpt-5.6-sol | 4 | True | 10.749 | 0.185 | 10.687 | 0.000 | 4 / 0 | 0.000000000 |
| 79 | disclosure | classic / gpt-5.6-sol | 5 | True | 9.489 | 0.186 | 9.425 | 0.000 | 4 / 0 | 0.000000000 |
| 80 | disclosure | jev-hybrid / gpt-5.6-sol | 5 | True | 10.617 | 0.188 | 10.549 | 0.000 | 4 / 0 | 0.000000000 |

### jev-driver-2026-09-17.json

[historical/driver: canonical source](../../docs/benchmarks/jev-driver-2026-09-17.json) · 8 records · 7 recorded successes · known cost $0.001204014.

File SHA-256: `aeb282442a20d34f4bbc49b5cb72c8c0a7570f157fd5f2b74a35b316a5b5e040`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Functional page-state result and driver-only clock; not an end-to-end planner task.

| Row | Task | Functional success | Driver status | Driver s | Jev s | Jev calls | Jev USD |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | search | True | completion_candidate | 1.568 | 1.491 | 3 | 0.00013629 |
| 2 | filters | True | completion_candidate | 1.345 | 1.246 | 4 | 0.00022722 |
| 3 | autocomplete | True | completion_candidate | 1.554 | 1.172 | 4 | 0.00016905000000000002 |
| 4 | form | True | completion_candidate | 1.474 | 1.388 | 4 | 0.00025342800000000004 |
| 5 | navigation | False | needs_help | 0.714 | 0.648 | 2 | 7.5474e-05 |
| 6 | tabs | True | needs_help | 1.029 | 0.957 | 2 | 7.0644e-05 |
| 7 | scroll | True | completion_candidate | 1.717 | 1.595 | 6 | 0.000196056 |
| 8 | disclosure | True | completion_candidate | 0.625 | 0.554 | 2 | 7.5852e-05 |

### jev-first-comparison-2026-09-17.json

[historical/final: canonical source](../../docs/benchmarks/jev-first-comparison-2026-09-17.json) · 72 records · 72 recorded successes · known cost $0.006952218.

File SHA-256: `dca4345a2d1f21b4a7910b3980bf1d34080d9ea14087fab1b89fcd721827219e`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / gpt-5.6-sol | 3/3 | 16.561 | 16.412–18.731 |
| search / jev-first / gpt-5.6-sol | 3/3 | 22.388 | 9.113–23.492 |
| search / jev-first / gpt-5.6-luna | 3/3 | 9.471 | 8.840–20.512 |
| filters / jev-first / gpt-5.6-sol | 3/3 | 17.649 | 12.550–18.561 |
| filters / jev-first / gpt-5.6-luna | 3/3 | 11.830 | 8.342–12.496 |
| filters / classic / gpt-5.6-sol | 3/3 | 20.150 | 20.131–22.720 |
| autocomplete / jev-first / gpt-5.6-luna | 3/3 | 13.454 | 12.578–13.854 |
| autocomplete / classic / gpt-5.6-sol | 3/3 | 16.212 | 14.470–17.759 |
| autocomplete / jev-first / gpt-5.6-sol | 3/3 | 23.439 | 22.986–24.514 |
| form / classic / gpt-5.6-sol | 3/3 | 24.707 | 17.887–25.796 |
| form / jev-first / gpt-5.6-sol | 3/3 | 21.767 | 20.310–24.227 |
| form / jev-first / gpt-5.6-luna | 3/3 | 25.131 | 21.223–37.848 |
| navigation / jev-first / gpt-5.6-sol | 3/3 | 9.277 | 8.444–10.008 |
| navigation / jev-first / gpt-5.6-luna | 3/3 | 13.405 | 8.630–14.767 |
| navigation / classic / gpt-5.6-sol | 3/3 | 13.894 | 13.173–15.105 |
| tabs / jev-first / gpt-5.6-luna | 3/3 | 8.350 | 7.782–9.054 |
| tabs / classic / gpt-5.6-sol | 3/3 | 12.066 | 9.776–12.319 |
| tabs / jev-first / gpt-5.6-sol | 3/3 | 13.009 | 9.301–19.700 |
| scroll / classic / gpt-5.6-sol | 3/3 | 22.314 | 16.710–29.862 |
| scroll / jev-first / gpt-5.6-sol | 3/3 | 16.996 | 14.119–19.728 |
| scroll / jev-first / gpt-5.6-luna | 3/3 | 15.364 | 14.911–15.726 |
| disclosure / jev-first / gpt-5.6-sol | 3/3 | 10.952 | 8.480–13.141 |
| disclosure / jev-first / gpt-5.6-luna | 3/3 | 7.248 | 7.246–10.546 |
| disclosure / classic / gpt-5.6-sol | 3/3 | 12.654 | 10.813–14.751 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / gpt-5.6-sol | 1 | True | 18.731 | 0.195 | 18.639 | 0.000 | 6 / 0 | 0.000000000 |
| 2 | search | jev-first / gpt-5.6-sol | 1 | True | 23.492 | 0.189 | 22.227 | 1.145 | 6 / 0 | 0.000000000 |
| 3 | search | jev-first / gpt-5.6-luna | 1 | True | 20.512 | 0.185 | 18.275 | 2.126 | 6 / 0 | 0.000000000 |
| 4 | search | jev-first / gpt-5.6-sol | 2 | True | 22.388 | 0.195 | 19.953 | 2.326 | 6 / 0 | 0.000000000 |
| 5 | search | jev-first / gpt-5.6-luna | 2 | True | 9.471 | 0.196 | 7.446 | 1.929 | 2 / 3 | 0.000166152 |
| 6 | search | classic / gpt-5.6-sol | 2 | True | 16.561 | 0.189 | 16.484 | 0.000 | 6 / 0 | 0.000000000 |
| 7 | search | jev-first / gpt-5.6-luna | 3 | True | 8.840 | 0.184 | 7.207 | 1.533 | 2 / 3 | 0.000161616 |
| 8 | search | classic / gpt-5.6-sol | 3 | True | 16.412 | 0.179 | 16.328 | 0.000 | 6 / 0 | 0.000000000 |
| 9 | search | jev-first / gpt-5.6-sol | 3 | True | 9.113 | 0.183 | 7.375 | 1.630 | 2 / 3 | 0.000172032 |
| 10 | filters | jev-first / gpt-5.6-sol | 1 | True | 17.649 | 0.186 | 16.058 | 1.473 | 4 / 3 | 0.000201054 |
| 11 | filters | jev-first / gpt-5.6-luna | 1 | True | 11.830 | 0.193 | 9.448 | 2.259 | 3 / 4 | 0.000263004 |
| 12 | filters | classic / gpt-5.6-sol | 1 | True | 22.720 | 0.193 | 22.608 | 0.000 | 8 / 0 | 0.000000000 |
| 13 | filters | jev-first / gpt-5.6-luna | 2 | True | 8.342 | 0.190 | 6.450 | 1.775 | 2 / 4 | 0.000262500 |
| 14 | filters | classic / gpt-5.6-sol | 2 | True | 20.131 | 0.194 | 20.031 | 0.000 | 8 / 0 | 0.000000000 |
| 15 | filters | jev-first / gpt-5.6-sol | 2 | True | 12.550 | 0.181 | 10.651 | 1.764 | 2 / 4 | 0.000266532 |
| 16 | filters | classic / gpt-5.6-sol | 3 | True | 20.150 | 0.188 | 20.017 | 0.000 | 8 / 0 | 0.000000000 |
| 17 | filters | jev-first / gpt-5.6-sol | 3 | True | 18.561 | 0.177 | 16.868 | 1.571 | 4 / 4 | 0.000279132 |
| 18 | filters | jev-first / gpt-5.6-luna | 3 | True | 12.496 | 0.189 | 10.804 | 1.545 | 3 / 4 | 0.000263004 |
| 19 | autocomplete | jev-first / gpt-5.6-luna | 1 | True | 12.578 | 0.183 | 11.494 | 0.992 | 4 / 2 | 0.000092694 |
| 20 | autocomplete | classic / gpt-5.6-sol | 1 | True | 14.470 | 0.190 | 14.391 | 0.000 | 6 / 0 | 0.000000000 |
| 21 | autocomplete | jev-first / gpt-5.6-sol | 1 | True | 23.439 | 0.187 | 21.657 | 1.670 | 6 / 3 | 0.000155694 |
| 22 | autocomplete | classic / gpt-5.6-sol | 2 | True | 16.212 | 0.188 | 16.092 | 0.000 | 6 / 0 | 0.000000000 |
| 23 | autocomplete | jev-first / gpt-5.6-sol | 2 | True | 24.514 | 0.184 | 23.699 | 0.710 | 7 / 1 | 0.000048510 |
| 24 | autocomplete | jev-first / gpt-5.6-luna | 2 | True | 13.854 | 0.189 | 12.404 | 1.359 | 4 / 2 | 0.000093702 |
| 25 | autocomplete | jev-first / gpt-5.6-sol | 3 | True | 22.986 | 0.181 | 21.762 | 1.124 | 5 / 2 | 0.000101766 |
| 26 | autocomplete | jev-first / gpt-5.6-luna | 3 | True | 13.454 | 0.191 | 12.384 | 0.969 | 4 / 2 | 0.000093198 |
| 27 | autocomplete | classic / gpt-5.6-sol | 3 | True | 17.759 | 0.186 | 17.688 | 0.000 | 6 / 0 | 0.000000000 |
| 28 | form | classic / gpt-5.6-sol | 1 | True | 17.887 | 0.192 | 17.756 | 0.000 | 8 / 0 | 0.000000000 |
| 29 | form | jev-first / gpt-5.6-sol | 1 | True | 24.227 | 0.187 | 21.647 | 2.437 | 5 / 5 | 0.000372708 |
| 30 | form | jev-first / gpt-5.6-luna | 1 | True | 21.223 | 0.191 | 20.039 | 1.024 | 8 / 2 | 0.000127554 |
| 31 | form | jev-first / gpt-5.6-sol | 2 | True | 21.767 | 0.202 | 20.016 | 1.638 | 3 / 4 | 0.000333732 |
| 32 | form | jev-first / gpt-5.6-luna | 2 | True | 25.131 | 0.182 | 24.201 | 0.811 | 8 / 1 | 0.000064008 |
| 33 | form | classic / gpt-5.6-sol | 2 | True | 24.707 | 0.200 | 24.589 | 0.000 | 8 / 0 | 0.000000000 |
| 34 | form | jev-first / gpt-5.6-luna | 3 | True | 37.848 | 0.187 | 34.721 | 2.965 | 3 / 6 | 0.000440412 |
| 35 | form | classic / gpt-5.6-sol | 3 | True | 25.796 | 0.194 | 25.671 | 0.000 | 9 / 0 | 0.000000000 |
| 36 | form | jev-first / gpt-5.6-sol | 3 | True | 20.310 | 0.185 | 17.767 | 2.419 | 4 / 5 | 0.000399210 |
| 37 | navigation | jev-first / gpt-5.6-sol | 1 | True | 8.444 | 0.187 | 7.086 | 1.172 | 2 / 3 | 0.000120540 |
| 38 | navigation | jev-first / gpt-5.6-luna | 1 | True | 13.405 | 0.184 | 12.293 | 0.934 | 4 / 2 | 0.000086772 |
| 39 | navigation | classic / gpt-5.6-sol | 1 | True | 13.894 | 0.188 | 13.762 | 0.000 | 6 / 0 | 0.000000000 |
| 40 | navigation | jev-first / gpt-5.6-luna | 2 | True | 8.630 | 0.184 | 7.185 | 1.276 | 2 / 3 | 0.000119910 |
| 41 | navigation | classic / gpt-5.6-sol | 2 | True | 13.173 | 0.191 | 13.027 | 0.000 | 8 / 0 | 0.000000000 |
| 42 | navigation | jev-first / gpt-5.6-sol | 2 | True | 10.008 | 0.189 | 8.493 | 1.345 | 2 / 3 | 0.000120120 |
| 43 | navigation | classic / gpt-5.6-sol | 3 | True | 15.105 | 0.193 | 14.961 | 0.000 | 6 / 0 | 0.000000000 |
| 44 | navigation | jev-first / gpt-5.6-sol | 3 | True | 9.277 | 0.189 | 7.533 | 1.587 | 2 / 3 | 0.000120750 |
| 45 | navigation | jev-first / gpt-5.6-luna | 3 | True | 14.767 | 0.193 | 13.519 | 1.085 | 4 / 2 | 0.000086436 |
| 46 | tabs | jev-first / gpt-5.6-luna | 1 | True | 7.782 | 0.190 | 6.675 | 1.002 | 2 / 2 | 0.000081732 |
| 47 | tabs | classic / gpt-5.6-sol | 1 | True | 9.776 | 0.191 | 9.711 | 0.000 | 4 / 0 | 0.000000000 |
| 48 | tabs | jev-first / gpt-5.6-sol | 1 | True | 9.301 | 0.185 | 7.914 | 1.286 | 2 / 2 | 0.000087444 |
| 49 | tabs | classic / gpt-5.6-sol | 2 | True | 12.319 | 0.192 | 12.236 | 0.000 | 4 / 0 | 0.000000000 |
| 50 | tabs | jev-first / gpt-5.6-sol | 2 | True | 19.700 | 0.190 | 17.618 | 1.907 | 3 / 4 | 0.000186564 |
| 51 | tabs | jev-first / gpt-5.6-luna | 2 | True | 9.054 | 0.186 | 8.067 | 0.877 | 2 / 2 | 0.000082572 |
| 52 | tabs | jev-first / gpt-5.6-sol | 3 | True | 13.009 | 0.174 | 11.892 | 1.028 | 2 / 2 | 0.000086772 |
| 53 | tabs | jev-first / gpt-5.6-luna | 3 | True | 8.350 | 0.185 | 7.268 | 0.993 | 2 / 2 | 0.000084756 |
| 54 | tabs | classic / gpt-5.6-sol | 3 | True | 12.066 | 0.190 | 11.991 | 0.000 | 4 / 0 | 0.000000000 |
| 55 | scroll | classic / gpt-5.6-sol | 1 | True | 29.862 | 0.194 | 29.776 | 0.000 | 6 / 0 | 0.000000000 |
| 56 | scroll | jev-first / gpt-5.6-sol | 1 | True | 19.728 | 0.183 | 18.013 | 1.567 | 4 / 4 | 0.000134022 |
| 57 | scroll | jev-first / gpt-5.6-luna | 1 | True | 14.911 | 0.186 | 12.897 | 1.861 | 4 / 4 | 0.000134862 |
| 58 | scroll | jev-first / gpt-5.6-sol | 2 | True | 14.119 | 0.184 | 12.440 | 1.544 | 4 / 4 | 0.000134358 |
| 59 | scroll | jev-first / gpt-5.6-luna | 2 | True | 15.364 | 0.197 | 13.425 | 1.801 | 4 / 4 | 0.000133686 |
| 60 | scroll | classic / gpt-5.6-sol | 2 | True | 16.710 | 0.190 | 16.623 | 0.000 | 6 / 0 | 0.000000000 |
| 61 | scroll | jev-first / gpt-5.6-luna | 3 | True | 15.726 | 0.191 | 13.801 | 1.780 | 4 / 4 | 0.000133518 |
| 62 | scroll | classic / gpt-5.6-sol | 3 | True | 22.314 | 0.191 | 22.215 | 0.000 | 6 / 0 | 0.000000000 |
| 63 | scroll | jev-first / gpt-5.6-sol | 3 | True | 16.996 | 0.199 | 15.173 | 1.674 | 4 / 4 | 0.000135030 |
| 64 | disclosure | jev-first / gpt-5.6-sol | 1 | True | 13.141 | 0.189 | 11.935 | 1.120 | 3 / 2 | 0.000087612 |
| 65 | disclosure | jev-first / gpt-5.6-luna | 1 | True | 7.246 | 0.191 | 6.056 | 1.110 | 2 / 2 | 0.000087444 |
| 66 | disclosure | classic / gpt-5.6-sol | 1 | True | 14.751 | 0.193 | 14.687 | 0.000 | 4 / 0 | 0.000000000 |
| 67 | disclosure | jev-first / gpt-5.6-luna | 2 | True | 10.546 | 0.188 | 9.529 | 0.936 | 2 / 2 | 0.000086772 |
| 68 | disclosure | classic / gpt-5.6-sol | 2 | True | 10.813 | 0.196 | 10.749 | 0.000 | 4 / 0 | 0.000000000 |
| 69 | disclosure | jev-first / gpt-5.6-sol | 2 | True | 8.480 | 0.192 | 7.298 | 1.080 | 2 / 2 | 0.000088788 |
| 70 | disclosure | classic / gpt-5.6-sol | 3 | True | 12.654 | 0.179 | 12.585 | 0.000 | 4 / 0 | 0.000000000 |
| 71 | disclosure | jev-first / gpt-5.6-sol | 3 | True | 10.952 | 0.183 | 9.900 | 0.972 | 2 / 2 | 0.000087276 |
| 72 | disclosure | jev-first / gpt-5.6-luna | 3 | True | 7.248 | 0.194 | 6.226 | 0.931 | 2 / 2 | 0.000086268 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 2:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR",
    "matched": true
  },
  "jevErrors": [
    {
      "reason": "http_error",
      "elapsedMs": 1145.0158440000014,
      "httpStatus": 503,
      "parentCallId": "exec-13de019f-d617-4ade-80df-8b3e256e8522"
    }
  ]
}
```

Row 3:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR",
    "matched": true
  },
  "jevErrors": [
    {
      "reason": "http_error",
      "elapsedMs": 2125.9177710000004,
      "httpStatus": 503,
      "parentCallId": "exec-0ea465f6-7384-4db0-afc7-29a670c2e99f"
    }
  ]
}
```

Row 4:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR",
    "matched": true
  },
  "jevErrors": [
    {
      "reason": "http_error",
      "elapsedMs": 2326.337962999998,
      "httpStatus": 503,
      "parentCallId": "exec-b3478eff-05b5-4595-97a1-6a56f1a31b78"
    }
  ]
}
```


### jev-first-diagnostic-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-first-diagnostic-2026-09-17.json) · 16 records · 15 recorded successes · known cost $0.002074968.

File SHA-256: `4d764efcfc3a66da97cab7eb7f432ca198a6a8c440fd30109610e3c6dcfab616`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / gpt-5.6-sol | 3/3 | 15.527 | 15.315–17.895 |
| search / jev-first / gpt-5.6-sol | 3/3 | 10.631 | 9.117–11.940 |
| search / jev-first / gpt-5.6-luna | 3/3 | 8.965 | 8.743–10.858 |
| filters / jev-first / gpt-5.6-sol | 2/2 | 16.295 | 11.589–21.001 |
| filters / jev-first / gpt-5.6-luna | 2/2 | 12.464 | 11.600–13.327 |
| filters / classic / gpt-5.6-sol | 2/3 | 19.914 | 18.809–21.019 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / gpt-5.6-sol | 1 | True | 17.895 | 0.194 | 17.805 | 0.000 | 6 / 0 | 0.000000000 |
| 2 | search | jev-first / gpt-5.6-sol | 1 | True | 9.117 | 0.194 | 7.614 | 1.406 | 2 / 3 | 0.000166152 |
| 3 | search | jev-first / gpt-5.6-luna | 1 | True | 8.965 | 0.182 | 7.682 | 1.184 | 2 / 3 | 0.000162372 |
| 4 | search | jev-first / gpt-5.6-sol | 2 | True | 11.940 | 0.190 | 10.627 | 1.209 | 2 / 3 | 0.000172788 |
| 5 | search | jev-first / gpt-5.6-luna | 2 | True | 10.858 | 0.194 | 9.580 | 1.182 | 2 / 3 | 0.000167664 |
| 6 | search | classic / gpt-5.6-sol | 2 | True | 15.315 | 0.190 | 15.242 | 0.000 | 6 / 0 | 0.000000000 |
| 7 | search | jev-first / gpt-5.6-luna | 3 | True | 8.743 | 0.188 | 7.407 | 1.231 | 2 / 3 | 0.000166152 |
| 8 | search | classic / gpt-5.6-sol | 3 | True | 15.527 | 0.185 | 15.456 | 0.000 | 6 / 0 | 0.000000000 |
| 9 | search | jev-first / gpt-5.6-sol | 3 | True | 10.631 | 0.187 | 9.298 | 1.228 | 2 / 3 | 0.000164640 |
| 10 | filters | jev-first / gpt-5.6-sol | 1 | True | 11.589 | 0.190 | 9.953 | 1.525 | 2 / 4 | 0.000274596 |
| 11 | filters | jev-first / gpt-5.6-luna | 1 | True | 13.327 | 0.185 | 11.719 | 1.488 | 3 / 4 | 0.000263004 |
| 12 | filters | classic / gpt-5.6-sol | 1 | True | 21.019 | 0.192 | 20.913 | 0.000 | 8 / 0 | 0.000000000 |
| 13 | filters | jev-first / gpt-5.6-luna | 2 | True | 11.600 | 0.195 | 9.194 | 2.270 | 3 / 4 | 0.000265020 |
| 14 | filters | classic / gpt-5.6-sol | 2 | True | 18.809 | 0.190 | 18.689 | 0.000 | 8 / 0 | 0.000000000 |
| 15 | filters | jev-first / gpt-5.6-sol | 2 | True | 21.001 | 0.190 | 19.267 | 1.592 | 4 / 4 | 0.000272580 |
| 16 | filters | classic / gpt-5.6-sol | 3 | False | 17.909 | 0.185 | 16.702 | 0.000 | 7 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 16:

```json
{
  "state": "stopped",
  "endReason": "benchmark_interrupted",
  "verification": {
    "expected": "Applied: Books, in stock: yes",
    "matched": false
  }
}
```


### jev-first-luna-final-2026-09-17.json

[historical/final: canonical source](../../docs/benchmarks/jev-first-luna-final-2026-09-17.json) · 48 records · 47 recorded successes · known cost $0.003530310.

File SHA-256: `23ed3898053babade7a1d98e0813b8069e9c8b37dc019eece48aaa01e87bba73`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / gpt-5.6-luna | 2/3 | 40.112 | 30.083–50.141 |
| search / jev-first / gpt-5.6-luna | 3/3 | 14.022 | 10.138–16.860 |
| filters / jev-first / gpt-5.6-luna | 3/3 | 16.011 | 12.554–19.124 |
| filters / classic / gpt-5.6-luna | 3/3 | 24.931 | 18.974–63.821 |
| autocomplete / classic / gpt-5.6-luna | 3/3 | 38.618 | 27.569–41.561 |
| autocomplete / jev-first / gpt-5.6-luna | 3/3 | 12.912 | 11.657–15.141 |
| form / jev-first / gpt-5.6-luna | 3/3 | 19.665 | 17.025–19.855 |
| form / classic / gpt-5.6-luna | 3/3 | 23.920 | 23.392–29.347 |
| navigation / classic / gpt-5.6-luna | 3/3 | 34.098 | 23.729–37.831 |
| navigation / jev-first / gpt-5.6-luna | 3/3 | 16.181 | 12.893–18.559 |
| tabs / jev-first / gpt-5.6-luna | 3/3 | 8.356 | 8.022–9.855 |
| tabs / classic / gpt-5.6-luna | 3/3 | 11.010 | 10.916–12.969 |
| scroll / classic / gpt-5.6-luna | 3/3 | 33.164 | 20.865–33.798 |
| scroll / jev-first / gpt-5.6-luna | 3/3 | 18.800 | 14.541–26.851 |
| disclosure / jev-first / gpt-5.6-luna | 3/3 | 15.105 | 14.255–20.020 |
| disclosure / classic / gpt-5.6-luna | 3/3 | 11.268 | 9.415–18.999 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / gpt-5.6-luna | 1 | False | 33.415 | 0.197 | 33.352 | 0.000 | 4 / 0 | 0.000000000 |
| 2 | search | jev-first / gpt-5.6-luna | 1 | True | 16.860 | 0.195 | 15.437 | 1.319 | 2 / 3 | 0.000168420 |
| 3 | search | jev-first / gpt-5.6-luna | 2 | True | 14.022 | 0.188 | 12.655 | 1.268 | 2 / 3 | 0.000167286 |
| 4 | search | classic / gpt-5.6-luna | 2 | True | 50.141 | 0.186 | 49.981 | 0.000 | 6 / 0 | 0.000000000 |
| 5 | search | classic / gpt-5.6-luna | 3 | True | 30.083 | 0.215 | 29.991 | 0.000 | 6 / 0 | 0.000000000 |
| 6 | search | jev-first / gpt-5.6-luna | 3 | True | 10.138 | 0.187 | 8.692 | 1.342 | 2 / 3 | 0.000161616 |
| 7 | filters | jev-first / gpt-5.6-luna | 1 | True | 12.554 | 0.192 | 10.425 | 1.996 | 3 / 4 | 0.000266532 |
| 8 | filters | classic / gpt-5.6-luna | 1 | True | 24.931 | 0.195 | 24.777 | 0.000 | 9 / 0 | 0.000000000 |
| 9 | filters | classic / gpt-5.6-luna | 2 | True | 18.974 | 0.194 | 18.873 | 0.000 | 8 / 0 | 0.000000000 |
| 10 | filters | jev-first / gpt-5.6-luna | 2 | True | 16.011 | 0.188 | 14.257 | 1.585 | 4 / 4 | 0.000271068 |
| 11 | filters | jev-first / gpt-5.6-luna | 3 | True | 19.124 | 0.188 | 17.675 | 1.327 | 3 / 3 | 0.000197274 |
| 12 | filters | classic / gpt-5.6-luna | 3 | True | 63.821 | 0.224 | 63.711 | 0.000 | 9 / 0 | 0.000000000 |
| 13 | autocomplete | classic / gpt-5.6-luna | 1 | True | 41.561 | 0.199 | 41.419 | 0.000 | 6 / 0 | 0.000000000 |
| 14 | autocomplete | jev-first / gpt-5.6-luna | 1 | True | 15.141 | 0.187 | 13.535 | 1.495 | 4 / 2 | 0.000092442 |
| 15 | autocomplete | jev-first / gpt-5.6-luna | 2 | True | 11.657 | 0.193 | 10.190 | 1.362 | 3 / 2 | 0.000100254 |
| 16 | autocomplete | classic / gpt-5.6-luna | 2 | True | 27.569 | 0.186 | 27.422 | 0.000 | 6 / 0 | 0.000000000 |
| 17 | autocomplete | classic / gpt-5.6-luna | 3 | True | 38.618 | 0.184 | 38.469 | 0.000 | 6 / 0 | 0.000000000 |
| 18 | autocomplete | jev-first / gpt-5.6-luna | 3 | True | 12.912 | 0.188 | 11.791 | 1.022 | 3 / 2 | 0.000093198 |
| 19 | form | jev-first / gpt-5.6-luna | 1 | True | 19.665 | 0.187 | 16.922 | 2.582 | 3 / 6 | 0.000419916 |
| 20 | form | classic / gpt-5.6-luna | 1 | True | 23.392 | 0.190 | 23.276 | 0.000 | 9 / 0 | 0.000000000 |
| 21 | form | classic / gpt-5.6-luna | 2 | True | 23.920 | 0.193 | 23.833 | 0.000 | 8 / 0 | 0.000000000 |
| 22 | form | jev-first / gpt-5.6-luna | 2 | True | 17.025 | 0.181 | 15.673 | 1.207 | 5 / 2 | 0.000129822 |
| 23 | form | jev-first / gpt-5.6-luna | 3 | True | 19.855 | 0.188 | 16.931 | 2.775 | 3 / 6 | 0.000455028 |
| 24 | form | classic / gpt-5.6-luna | 3 | True | 29.347 | 0.191 | 29.240 | 0.000 | 9 / 0 | 0.000000000 |
| 25 | navigation | classic / gpt-5.6-luna | 1 | True | 37.831 | 0.189 | 37.691 | 0.000 | 6 / 0 | 0.000000000 |
| 26 | navigation | jev-first / gpt-5.6-luna | 1 | True | 12.893 | 0.176 | 11.749 | 0.967 | 3 / 2 | 0.000088620 |
| 27 | navigation | jev-first / gpt-5.6-luna | 2 | True | 18.559 | 0.176 | 17.374 | 1.013 | 3 / 2 | 0.000086940 |
| 28 | navigation | classic / gpt-5.6-luna | 2 | True | 23.729 | 0.189 | 23.574 | 0.000 | 6 / 0 | 0.000000000 |
| 29 | navigation | classic / gpt-5.6-luna | 3 | True | 34.098 | 0.190 | 33.946 | 0.000 | 6 / 0 | 0.000000000 |
| 30 | navigation | jev-first / gpt-5.6-luna | 3 | True | 16.181 | 0.184 | 15.025 | 0.992 | 3 / 2 | 0.000086940 |
| 31 | tabs | jev-first / gpt-5.6-luna | 1 | True | 8.356 | 0.183 | 7.183 | 1.079 | 2 / 2 | 0.000084756 |
| 32 | tabs | classic / gpt-5.6-luna | 1 | True | 10.916 | 0.174 | 10.829 | 0.000 | 4 / 0 | 0.000000000 |
| 33 | tabs | classic / gpt-5.6-luna | 2 | True | 12.969 | 0.187 | 12.899 | 0.000 | 4 / 0 | 0.000000000 |
| 34 | tabs | jev-first / gpt-5.6-luna | 2 | True | 8.022 | 0.186 | 6.979 | 0.951 | 2 / 2 | 0.000083748 |
| 35 | tabs | jev-first / gpt-5.6-luna | 3 | True | 9.855 | 0.188 | 8.790 | 0.975 | 2 / 2 | 0.000084924 |
| 36 | tabs | classic / gpt-5.6-luna | 3 | True | 11.010 | 0.185 | 10.940 | 0.000 | 4 / 0 | 0.000000000 |
| 37 | scroll | classic / gpt-5.6-luna | 1 | True | 20.865 | 0.185 | 20.748 | 0.000 | 8 / 0 | 0.000000000 |
| 38 | scroll | jev-first / gpt-5.6-luna | 1 | True | 14.541 | 0.182 | 12.634 | 1.762 | 3 / 4 | 0.000134526 |
| 39 | scroll | jev-first / gpt-5.6-luna | 2 | True | 18.800 | 0.185 | 16.667 | 1.983 | 3 / 4 | 0.000133854 |
| 40 | scroll | classic / gpt-5.6-luna | 2 | True | 33.164 | 0.187 | 33.049 | 0.000 | 8 / 0 | 0.000000000 |
| 41 | scroll | classic / gpt-5.6-luna | 3 | True | 33.798 | 0.189 | 33.692 | 0.000 | 8 / 0 | 0.000000000 |
| 42 | scroll | jev-first / gpt-5.6-luna | 3 | True | 26.851 | 0.183 | 24.214 | 2.497 | 4 / 4 | 0.000133686 |
| 43 | disclosure | jev-first / gpt-5.6-luna | 1 | True | 15.105 | 0.183 | 10.009 | 5.001 | 3 / 0 | 0.000000000 |
| 44 | disclosure | classic / gpt-5.6-luna | 1 | True | 9.415 | 0.185 | 9.344 | 0.000 | 4 / 0 | 0.000000000 |
| 45 | disclosure | classic / gpt-5.6-luna | 2 | True | 18.999 | 0.186 | 18.924 | 0.000 | 4 / 0 | 0.000000000 |
| 46 | disclosure | jev-first / gpt-5.6-luna | 2 | True | 14.255 | 0.182 | 12.900 | 1.270 | 3 / 0 | 0.000000000 |
| 47 | disclosure | jev-first / gpt-5.6-luna | 3 | True | 20.020 | 0.183 | 18.829 | 1.086 | 2 / 2 | 0.000089460 |
| 48 | disclosure | classic / gpt-5.6-luna | 3 | True | 11.268 | 0.185 | 11.193 | 0.000 | 4 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR",
    "matched": false
  },
  "jevErrors": []
}
```

Row 43:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Shipping time: three business days.",
    "matched": true
  },
  "jevErrors": [
    {
      "reason": "timeout_or_transport",
      "elapsedMs": 5001.199934999924,
      "parentCallId": "exec-4f1f02f8-81ea-402e-a0b6-a3715e3a43ad"
    }
  ]
}
```

Row 46:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "expected": "Shipping time: three business days.",
    "matched": true
  },
  "jevErrors": [
    {
      "reason": "http_error",
      "elapsedMs": 1270.2857690000674,
      "httpStatus": 503,
      "parentCallId": "exec-e6aaa7c1-65d2-4064-b97e-2988b42e952f"
    }
  ]
}
```


### jev-first-pilot-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-first-pilot-2026-09-17.json) · 2 records · 2 recorded successes · known cost $0.000341586.

File SHA-256: `2f1c5b37063517e1e1f3c23d5576cded2cfb94b3c35e66b24c7471327e661926`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / jev-first / gpt-5.6-sol | 1/1 | 11.388 | 11.388–11.388 |
| search / jev-first / gpt-5.6-luna | 1/1 | 8.308 | 8.308–8.308 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | jev-first / gpt-5.6-sol | 1 | True | 11.388 | 0.392 | 9.763 | 1.501 | 2 / 3 | 0.000172032 |
| 2 | search | jev-first / gpt-5.6-luna | 1 | True | 8.308 | 0.182 | 6.857 | 1.358 | 2 / 3 | 0.000169554 |

### jev-first-service-errors-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-first-service-errors-2026-09-17.json) · 16 records · 15 recorded successes · known cost $0.001256808.

File SHA-256: `100c27cd2d0e80152a26cf5a36e7210050e7662cbd24d39c2187cc171dc8819b`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / gpt-5.6-sol | 3/3 | 17.889 | 16.229–19.227 |
| search / jev-first / gpt-5.6-sol | 3/3 | 9.248 | 9.119–23.252 |
| search / jev-first / gpt-5.6-luna | 3/3 | 20.635 | 7.950–21.563 |
| filters / jev-first / gpt-5.6-sol | 2/2 | 25.480 | 24.872–26.088 |
| filters / jev-first / gpt-5.6-luna | 2/2 | 18.847 | 14.370–23.323 |
| filters / classic / gpt-5.6-sol | 2/3 | 20.045 | 18.519–21.572 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / gpt-5.6-sol | 1 | True | 19.227 | 0.199 | 19.128 | 0.000 | 6 / 0 | 0.000000000 |
| 2 | search | jev-first / gpt-5.6-sol | 1 | True | 9.248 | 0.187 | 7.789 | 1.349 | 2 / 3 | 0.000169764 |
| 3 | search | jev-first / gpt-5.6-luna | 1 | True | 7.950 | 0.189 | 6.622 | 1.235 | 2 / 3 | 0.000161616 |
| 4 | search | jev-first / gpt-5.6-sol | 2 | True | 9.119 | 0.185 | 7.705 | 1.312 | 2 / 3 | 0.000172032 |
| 5 | search | jev-first / gpt-5.6-luna | 2 | True | 21.563 | 0.187 | 20.623 | 0.000 | 7 / 0 | 0.000000000 |
| 6 | search | classic / gpt-5.6-sol | 2 | True | 16.229 | 0.186 | 16.160 | 0.000 | 6 / 0 | 0.000000000 |
| 7 | search | jev-first / gpt-5.6-luna | 3 | True | 20.635 | 0.189 | 19.720 | 0.000 | 7 / 0 | 0.000000000 |
| 8 | search | classic / gpt-5.6-sol | 3 | True | 17.889 | 0.184 | 17.821 | 0.000 | 6 / 0 | 0.000000000 |
| 9 | search | jev-first / gpt-5.6-sol | 3 | True | 23.252 | 0.189 | 22.494 | 0.000 | 6 / 0 | 0.000000000 |
| 10 | filters | jev-first / gpt-5.6-sol | 1 | True | 24.872 | 0.185 | 24.042 | 0.000 | 8 / 0 | 0.000000000 |
| 11 | filters | jev-first / gpt-5.6-luna | 1 | True | 23.323 | 0.195 | 22.559 | 0.000 | 8 / 0 | 0.000000000 |
| 12 | filters | classic / gpt-5.6-sol | 1 | True | 18.519 | 0.188 | 18.407 | 0.000 | 8 / 0 | 0.000000000 |
| 13 | filters | jev-first / gpt-5.6-luna | 2 | True | 14.370 | 0.183 | 12.111 | 2.134 | 3 / 4 | 0.000273084 |
| 14 | filters | classic / gpt-5.6-sol | 2 | True | 21.572 | 0.187 | 21.479 | 0.000 | 8 / 0 | 0.000000000 |
| 15 | filters | jev-first / gpt-5.6-sol | 2 | True | 26.088 | 0.187 | 22.638 | 3.223 | 5 / 7 | 0.000480312 |
| 16 | filters | classic / gpt-5.6-sol | 3 | False | 5.375 | 0.193 | 3.784 | 0.000 | 1 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 16:

```json
{
  "state": "stopped",
  "endReason": "benchmark_interrupted",
  "verification": {
    "expected": "Applied: Books, in stock: yes",
    "matched": false
  }
}
```


### jev-openrouter-flights-2026-09-17.json

[historical/final: canonical source](../../docs/benchmarks/jev-openrouter-flights-2026-09-17.json) · 9 records · 9 recorded successes · known cost $0.936055020.

File SHA-256: `611abeaaa3d5b0e843db072b8c557867048ab063cd8753cad47fdc931204b00b`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / jev-first / gpt-5.6-luna | 3/3 | 84.067 | 78.587–160.935 |
| google-flights / jev-first / google/gemini-3.8-flash | 3/3 | 33.063 | 28.368–35.330 |
| google-flights / classic / google/gemini-3.8-flash | 3/3 | 30.851 | 29.319–44.120 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | jev-first / gpt-5.6-luna | 1 | True | 78.587 | 2.776 | 73.171 | 3.470 | 24 / 4 | 0.001939392 |
| 2 | google-flights | jev-first / google/gemini-3.8-flash | 1 | True | 35.330 | 2.920 | 30.255 | 0.941 | 18 / 1 | 0.145694970 |
| 3 | google-flights | classic / google/gemini-3.8-flash | 1 | True | 44.120 | 2.877 | 43.347 | 0.000 | 24 / 0 | 0.174697500 |
| 4 | google-flights | jev-first / google/gemini-3.8-flash | 2 | True | 28.368 | 2.675 | 25.626 | 1.532 | 18 / 3 | 0.140514084 |
| 5 | google-flights | classic / google/gemini-3.8-flash | 2 | True | 30.851 | 2.666 | 29.998 | 0.000 | 25 / 0 | 0.146569500 |
| 6 | google-flights | jev-first / gpt-5.6-luna | 2 | True | 160.935 | 2.820 | 147.769 | 1.227 | 25 / 2 | 0.000971460 |
| 7 | google-flights | classic / google/gemini-3.8-flash | 3 | True | 29.319 | 2.920 | 28.555 | 0.000 | 24 / 0 | 0.149716875 |
| 8 | google-flights | jev-first / gpt-5.6-luna | 3 | True | 84.067 | 2.716 | 77.907 | 4.241 | 19 / 7 | 0.003605154 |
| 9 | google-flights | jev-first / google/gemini-3.8-flash | 3 | True | 33.063 | 2.753 | 30.899 | 0.903 | 22 / 1 | 0.172346085 |

### jev-openrouter-flights-diagnostic-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-openrouter-flights-diagnostic-2026-09-17.json) · 2 records · 0 recorded successes · known cost $0.386763108.

File SHA-256: `3e4b06ffc5b849a60ea0b4a74ce1a401061d90b3c0726b6df5d7e5e8cb1cd1f9`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / jev-first / google/gemini-3.8-flash | 0/1 | — | — |
| google-flights / classic / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | jev-first / google/gemini-3.8-flash | 1 | False | 66.077 | 3.134 | 60.408 | 0.888 | 35 / 1 | 0.386763108 |
| 2 | google-flights | classic / google/gemini-3.8-flash | 1 | False | — | — | — | — | — / — | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "passed": false,
    "checks": {
      "searchPage": false,
      "origin": true,
      "destination": false,
      "oneWay": false,
      "departure": false,
      "year": false,
      "passenger": true,
      "economy": true,
      "results": false
    },
    "url": "https://www.google.com/travel/flights?tfs=CBwQARoOagwIAxIIL20vMDg5NjYaDnIMCAMSCC9tLzA4OTY2QAFIAXABggELCP___________wGYAQE&tfu=KgIIAw&hl=en",
    "controls": [
      {
        "role": "button",
        "label": "Main menu",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Change appearance",
        "value": ""
      },
      {
        "role": "button",
        "label": "Google apps",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "Round trip",
        "value": "Round trip"
      },
      {
        "role": "button",
        "label": "1 passenger",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "Economy",
        "value": "Economy"
      },
      {
        "role": "combobox",
        "label": "Where from?",
        "value": "Z\u00fcrich"
      },
      {
        "role": "button",
        "label": "Swap origin and destination.",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "Where to?",
        "value": ""
      },
      {
        "role": "input",
        "label": "Departure",
        "value": ""
      },
      {
        "role": "input",
        "label": "Return",
        "value": ""
      },
      {
        "role": "button",
        "label": "Explore destinations",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Learn more about this section",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Previous",
        "value": ""
      },
      {
        "role": "button",
        "label": "Next",
        "value": ""
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to London (LTN) from PLN\u00a0130.  Operated by Ryanair. Oct 22 to Oct 30. Nonstop",
        "value": "Wroc\u0142awLondonOct 22 \u2014 Oct 30Nonstopfrom PLN\u00a0130"
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to Paris (BVA) from PLN\u00a0188.  Operated by Ryanair. Nov 22 to Nov 30. Nonstop",
        "value": "Wroc\u0142awParisNov 22 \u2014 Nov 30Nonstopfrom PLN\u00a0188"
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to Milan (BGY) from PLN\u00a0130.  Operated by Ryanair. Oct 31 to Nov 7. Nonstop",
        "value": "Wroc\u0142awMilanOct 31 \u2014 Nov 7Nonstopfrom PLN\u00a0130"
      },
      {
        "role": "button",
        "label": "Explore more destinations from Wroc\u0142aw",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Previous",
        "value": ""
      },
      {
        "role": "button",
        "label": "Next",
        "value": ""
      },
      {
        "role": "button",
        "label": "What are some good flight destinations from Poland?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find last-minute flight deals?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find cheap flights for a weekend getaway?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find flight deals if my travel plans are flexible?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find cheap flights to anywhere?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I get flight alerts for my trip?",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Currency PLN",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": "Report Illegal Content"
      },
      {
        "role": "button",
        "label": "International sites",
        "value": ""
      },
      {
        "role": "button",
        "label": "Explore flights",
        "value": ""
      }
    ],
    "visibleFlights": [],
    "text": "Skip to main content\nAccessibility feedback\nExplore\nFlights\nHotels\nVacation rentals\nChange appearance\nSign in\nFlights\nRound trip\n1\nEconomy\nZ\u00fcrich\nExplore\nFlexible? Discover the best flight deals with AI\nDescribe your ideal trip, and let Google Flights find the best deals for you\nExplore deals with AI\nFind and book cheap flights worldwide and track prices\nFind cheap flights from Poland to anywhere\nWroc\u0142aw\nWarsaw\nKrak\u00f3w\nGda\u0144sk\nWroc\u0142aw\nLondon\nOct 22 \u2014 Oct 30\nNonstop\nfrom PLN\u00a0130\nWroc\u0142aw\nParis\nNov 22 \u2014 Nov 30\nNonstop\nfrom PLN\u00a0188\nWroc\u0142aw\nMilan\nOct 31 \u2014 Nov 7\nNonstop\nfrom PLN\u00a0130\nExplore destinations\nUseful tools to help you find the best airline tickets\nFind the cheapest days to fly\nThe Date grid and Price graph make it easy to find the best flight deals\nKnow when to book with price insights\nPrice history and trend data show you the best time to book your airline ticket to get the cheapest price for your flight\nTrack flight prices for a trip\nNot ready to book yet? Observe price changes for a route or flight and get notified when prices drop.\nExplore the best flight deals with AI\nDescribe your ideal trip and let Google Flights find you the best deals\nInsightful tools help you choose your trip dates\nIf your travel plans are flexible, use the form above to start searching for a specific trip. Then, play around with the Date grid and Price graph options on the Search page to find the cheapest days to fly and book your tickets.\nPopular flight destinations from Poland\nLondon\nMilan\nParis\nTokyo\nOslo\nBarcelona\nFrankfurt am Main\nCopenhagen\nRome\nMunich\nFrequently asked questions\nWhat are some good flight destinations from Poland?\nHow can I find last-minute flight deals?\nHow can I find cheap flights for a weekend getaway?\nHow can I find flight deals if my travel plans are flexible?\nHow can I find cheap flights to anywhere?\nHow can I get flight alerts for my trip?\nSearch more flights\nFind cheap flights on popular routes\nFlights from cities in Poland\nInternational flights from Poland\nFlights from Warsaw\nFlights from Krak\u00f3w\nFlights from Gda\u0144sk\nFlights from Wroc\u0142aw\nFlights from Pozna\u0144\nFlights from Rzesz\u00f3w\nLanguage\u200bEnglish (United States)\nLocation\u200bPoland\nCurrencyPLN\n\nCurrent language and currency options applied: English (United States) - Poland - PLN\n\nDisplayed currencies may differ from the currencies used to purchase flights. Learn more\n\nPrices are final prices and include all taxes and fees, including payment fees for the cheapest common payment method (which may differ depending on the provider). Additional charges may apply for other types of payment, luggage, meals, WLAN or other additional services. Prices, availability and travel details are provided based on the latest information received from our partners. This information is reflected in the results within a period of less than 24 hours. Additional conditions may also be applied by our partners. You should then check prices and conditions with the services providers before booking.\n\nAbout\nPrivacy\nTerms\nJoin user studies\nReport Illegal Content\nFeedback\nHelp Center and Consumer Information\nInternational sites\nExplore flights"
  },
  "jevErrors": []
}
```

Row 2:

```json
{
  "error": "page.waitForURL: net::ERR_ABORTED; maybe frame was detached?\n=========================== logs ===========================\nwaiting for navigation to \"https://www.google.com/travel/flights**\" until \"load\"\n============================================================"
}
```


### jev-openrouter-flights-pilot-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-openrouter-flights-pilot-2026-09-17.json) · 2 records · 0 recorded successes · known cost $0.158206470.

File SHA-256: `671d8875b7f7e28783b36e7f2e2774ad42d167d6752eb093e452db593a2c93d1`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / jev-first / google/gemini-3.8-flash | 0/1 | — | — |
| google-flights / classic / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | jev-first / google/gemini-3.8-flash | 1 | False | 31.395 | 2.732 | 25.740 | 1.155 | 19 / 2 | 0.140564970 |
| 2 | google-flights | classic / google/gemini-3.8-flash | 1 | False | 5.815 | 3.166 | 4.623 | 0.000 | 5 / 0 | 0.017641500 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "passed": false,
    "checks": {
      "searchPage": true,
      "origin": false,
      "destination": true,
      "oneWay": false,
      "departure": true,
      "year": true,
      "passenger": true,
      "economy": false,
      "results": true
    },
    "url": "https://www.google.com/travel/flights/search?tfs=CBwQAhojEgoyMDI2LTA5LTIwagcIARIDWlJIcgwIAxIIL20vMDRqcGxAAUgBcAGCAQsI____________AZgBAg&hl=en",
    "controls": [
      {
        "label": "Main menu",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Change appearance",
        "value": ""
      },
      {
        "label": "Google apps",
        "value": ""
      },
      {
        "label": "",
        "value": "One way"
      },
      {
        "label": "1 passenger, change number of passengers.",
        "value": ""
      },
      {
        "label": "",
        "value": "Economy"
      },
      {
        "label": "Where from? Z\u00fcrich ZRH",
        "value": "Z\u00fcrich"
      },
      {
        "label": "Swap origin and destination.",
        "value": ""
      },
      {
        "label": "Where to?",
        "value": "London"
      },
      {
        "label": "Departure",
        "value": "Sun, Sep 20"
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Stops, Not selected",
        "value": ""
      },
      {
        "label": "Airlines, Not selected",
        "value": ""
      },
      {
        "label": "Bags, Not selected",
        "value": ""
      },
      {
        "label": "Price, Not selected",
        "value": ""
      },
      {
        "label": "Times, Not selected",
        "value": ""
      },
      {
        "label": "Emissions, Not selected",
        "value": ""
      },
      {
        "label": "Connecting airports, Not selected",
        "value": ""
      },
      {
        "label": "Duration, Not selected",
        "value": ""
      },
      {
        "label": "Previous",
        "value": ""
      },
      {
        "label": "Next",
        "value": ""
      },
      {
        "label": "Learn more about ranking",
        "value": ""
      },
      {
        "label": "Learn more about ranking",
        "value": ""
      },
      {
        "label": "Learn more about ranking",
        "value": ""
      },
      {
        "label": "",
        "value": "bag fees"
      },
      {
        "label": "",
        "value": "Passenger assistance"
      },
      {
        "label": "Sorted by top flights, Change sort order.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 82 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 7:40 AM on Sunday, September 20 and arrives at Heathrow Airport at 8:35 AM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 71 kilograms. -13% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Avoids as much CO2e as 670 trees absorb in a day. Learn more about this calculation.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 6:20 PM on Sunday, September 20 and arrives at Heathrow Airport at 7:05 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 79 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 4:45 PM on Sunday, September 20 and arrives at London Gatwick Airport at 5:35 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Climate friendly",
        "value": ""
      },
      {
        "label": "View price history",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Track prices from Z\u00fcrich to London departing 2026-09-20",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 93 kilograms. +13% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 8:55 PM on Sunday, September 20 and arrives at London Luton Airport at 9:40 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 86 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 8:40 PM on Sunday, September 20 and arrives at London Gatwick Airport at 9:20 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 171 kilograms. +109% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 10:25 AM on Sunday, September 20 and arrives at Heathrow Airport at 4:00 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 82 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 1:20 PM on Sunday, September 20 and arrives at Heathrow Airport at 2:20 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 100 kilograms. +22% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 8:25 PM on Sunday, September 20 and arrives at London City Airport at 9:00 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 88 kilograms. +7% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 6:00 PM on Sunday, September 20 and arrives at London City Airport at 6:40 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 88 kilograms. +7% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 5:10 PM on Sunday, September 20 and arrives at London Gatwick Airport at 5:50 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 91 kilograms. +11% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 7:05 AM on Sunday, September 20 and arrives at Heathrow Airport at 7:55 AM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 96 kilograms. +17% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 7:35 AM on Sunday, September 20 and arrives at London Gatwick Airport at 8:20 AM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 89 kilograms. +9% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 12:05 PM on Sunday, September 20 and arrives at Heathrow Airport at 1:00 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 68 kilograms. -17% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 3:35 PM on Sunday, September 20 and arrives at Heathrow Airport at 4:25 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 68 kilograms. -17% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 5:00 PM on Sunday, September 20 and arrives at Heathrow Airport at 5:50 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 70 kilograms. -15% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 6:30 PM on Sunday, September 20 and arrives at Heathrow Airport at 7:20 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 86 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 1:05 PM on Sunday, September 20 and arrives at London City Airport at 1:45 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 86 kilograms. Average emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 4:50 PM on Sunday, September 20 and arrives at London City Airport at 5:25 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 71 kilograms. -13% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 7:45 PM on Sunday, September 20 and arrives at Heathrow Airport at 8:30 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 89 kilograms. +9% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 8:55 PM on Sunday, September 20 and arrives at Heathrow Airport at 9:45 PM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "Carbon emissions estimate: 70 kilograms. -15% emissions. Learn more about this emissions estimate",
        "value": ""
      },
      {
        "label": "This price for this flight doesn't include overhead bin access. If you need a carry-on bag, use the Bags filter to update prices.",
        "value": ""
      },
      {
        "label": "Flight details. Leaves Zurich Airport at 10:30 AM on Sunday, September 20 and arrives at Heathrow Airport at 11:20 AM on Sunday, September 20.",
        "value": ""
      },
      {
        "label": "View more flights",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Currency PLN",
        "value": ""
      },
      {
        "label": "",
        "value": "Report Illegal Content"
      }
    ],
    "visibleFlights": [
      "From 551 Polish zlotys. Nonstop flight with British Airways. Leaves Zurich Airport at 7:40 AM on Sunday, September 20 and arrives at Heathrow Airport at 8:35 AM on Sunday, September 20. Total duration 1 hr 55 min.   Select flight",
      "From 675 Polish zlotys. Nonstop flight with British Airways. Leaves Zurich Airport at 6:20 PM on Sunday, September 20 and arrives at Heathrow Airport at 7:05 PM on Sunday, September 20. Total duration 1 hr 45 min.   Select flight",
      "From 820 Polish zlotys.This price does not include overhead bin access. Nonstop flight with easyJet. Leaves Zurich Airport at 4:45 PM on Sunday, September 20 and arrives at London Gatwick Airport at 5:35 PM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 790 Polish zlotys.This price does not include overhead bin access. Nonstop flight with easyJet. Leaves Zurich Airport at 8:55 PM on Sunday, September 20 and arrives at London Luton Airport at 9:40 PM on Sunday, September 20. Total duration 1 hr 45 min.   Select flight",
      "From 831 Polish zlotys.This price does not include overhead bin access. Nonstop flight with easyJet. Leaves Zurich Airport at 8:40 PM on Sunday, September 20 and arrives at London Gatwick Airport at 9:20 PM on Sunday, September 20. Total duration 1 hr 40 min.   Select flight",
      "From 966 Polish zlotys.This price does not include overhead bin access. 1 stop flight with Scandinavian Airlines. Operated by Sas Connect, Sas Connect. Leaves Zurich Airport at 10:25 AM on Sunday, September 20 and arrives at Heathrow Airport at 4:00 PM on Sunday, September 20. Total duration 6 hr 35 min.  Layover (1 of 1) is a 2 hr 50 min layover at Copenhagen Airport in Copenhagen. Select flight",
      "From 1021 Polish zlotys. Nonstop flight with British Airways. Leaves Zurich Airport at 1:20 PM on Sunday, September 20 and arrives at Heathrow Airport at 2:20 PM on Sunday, September 20. Total duration 2 hr.   Select flight",
      "From 1036 Polish zlotys. Nonstop flight with British Airways. Operated by BA Cityflyer. Leaves Zurich Airport at 8:25 PM on Sunday, September 20 and arrives at London City Airport at 9:00 PM on Sunday, September 20. Total duration 1 hr 35 min.   Select flight",
      "From 1417 Polish zlotys.This price does not include overhead bin access. Nonstop flight with SWISS. Operated by Helvetic. Leaves Zurich Airport at 6:00 PM on Sunday, September 20 and arrives at London City Airport at 6:40 PM on Sunday, September 20. Total duration 1 hr 40 min.   Select flight",
      "From 1423 Polish zlotys.This price does not include overhead bin access. Nonstop flight with SWISS. Leaves Zurich Airport at 5:10 PM on Sunday, September 20 and arrives at London Gatwick Airport at 5:50 PM on Sunday, September 20. Total duration 1 hr 40 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Leaves Zurich Airport at 7:05 AM on Sunday, September 20 and arrives at Heathrow Airport at 7:55 AM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Operated by Helvetic. Leaves Zurich Airport at 7:35 AM on Sunday, September 20 and arrives at London Gatwick Airport at 8:20 AM on Sunday, September 20. Total duration 1 hr 45 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Operated by Air Baltic. Leaves Zurich Airport at 12:05 PM on Sunday, September 20 and arrives at Heathrow Airport at 1:00 PM on Sunday, September 20. Total duration 1 hr 55 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Leaves Zurich Airport at 3:35 PM on Sunday, September 20 and arrives at Heathrow Airport at 4:25 PM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Leaves Zurich Airport at 5:00 PM on Sunday, September 20 and arrives at Heathrow Airport at 5:50 PM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 1478 Polish zlotys. Nonstop flight with SWISS. Leaves Zurich Airport at 6:30 PM on Sunday, September 20 and arrives at Heathrow Airport at 7:20 PM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 1509 Polish zlotys. Nonstop flight with SWISS. Operated by Helvetic. Leaves Zurich Airport at 1:05 PM on Sunday, September 20 and arrives at London City Airport at 1:45 PM on Sunday, September 20. Total duration 1 hr 40 min.   Select flight",
      "From 1509 Polish zlotys. Nonstop flight with SWISS. Operated by Helvetic. Leaves Zurich Airport at 4:50 PM on Sunday, September 20 and arrives at London City Airport at 5:25 PM on Sunday, September 20. Total duration 1 hr 35 min.   Select flight",
      "From 1997 Polish zlotys. Nonstop flight with British Airways. Leaves Zurich Airport at 7:45 PM on Sunday, September 20 and arrives at Heathrow Airport at 8:30 PM on Sunday, September 20. Total duration 1 hr 45 min.   Select flight",
      "From 2127 Polish zlotys.This price does not include overhead bin access. Nonstop flight with SWISS. Operated by Air Baltic. Leaves Zurich Airport at 8:55 PM on Sunday, September 20 and arrives at Heathrow Airport at 9:45 PM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight",
      "From 2689 Polish zlotys.This price does not include overhead bin access. Nonstop flight with SWISS. Leaves Zurich Airport at 10:30 AM on Sunday, September 20 and arrives at Heathrow Airport at 11:20 AM on Sunday, September 20. Total duration 1 hr 50 min.   Select flight"
    ],
    "text": "Skip to main content\nAccessibility feedback\nExplore\nFlights\nHotels\nVacation rentals\nChange appearance\nSign in\nLoading results\nFlight search\nOne way\n1\nEconomy\nZ\u00fcrich\u00a0ZRH\nLondon\nFilters\nAll filters\nStops\nAirlines\nBags\nPrice\nTimes\nEmissions\nConnecting airports\nDuration\nSearch results\n21 results returned.\nBest\nCheapest\nfrom PLN\u00a0551\nTop options\nRanked based on price and conveniencePrices include required taxes + fees for 1 adult. Optional charges and bag fees may apply. Passenger assistance info.\nSorted by top flights\n7:40 AM\n\u00a0\u2013\u00a0\n8:35 AM\nBritish Airways\n1 hr 55 min\nZRH\u2013LHR\nNonstop\n82 kg CO2e\nAvg emissions\nPLN\u00a0551\n6:20 PM\n\u00a0\u2013\u00a0\n7:05 PM\nBritish Airways\n1 hr 45 min\nZRH\u2013LHR\nNonstop\n71 kg CO2e\n-13% emissions\nPLN\u00a0675\nAvoids as much CO2e as 670 trees absorb in a day\n4:45 PM\n\u00a0\u2013\u00a0\n5:35 PM\neasyJet\n1 hr 50 min\nZRH\u2013LGW\nNonstop\n79 kg CO2e\nAvg emissions\nPLN\u00a0820\nTrains to considerTo arrive closer to your destination\n3:34 PM\u00a0\u2013\u00a010:00 PM\nZ\u00fcrich HB\u00a0\u2013\u00a0St Pancras International\n7 hr 26 min\n2 stops\nSee more train options\nPrice insights\nPrices are currently high\nView price history\nTrack prices\nTrack prices from Z\u00fcrich to London departing 2026-09-20\nSep 20\nTrack prices from Z\u00fcrich to London - Any dates\nAny dates\nDate grid\nPrice graph\nOther flights\n8:55 PM\n\u00a0\u2013\u00a0\n9:40 PM\neasyJet\n1 hr 45 min\nZRH\u2013LTN\nNonstop\n93 kg CO2e\n+13% emissions\nPLN\u00a0790\n8:40 PM\n\u00a0\u2013\u00a0\n9:20 PM\neasyJet\n1 hr 40 min\nZRH\u2013LGW\nNonstop\n86 kg CO2e\nAvg emissions\nPLN\u00a0831\n10:25 AM\n\u00a0\u2013\u00a0\n4:00 PM\nScandinavian AirlinesOperated by Sas Connect, Sas Connect\n6 hr 35 min\nZRH\u2013LHR\n1 stop\n2 hr 50 min CPH\n171 kg CO2e\n+109% emissions\nPLN\u00a0966\n1:20 PM\n\u00a0\u2013\u00a0\n2:20 PM\nBritish Airways\n2 hr\nZRH\u2013LHR\nNonstop\n82 kg CO2e\nAvg emissions\nPLN\u00a01,021\n8:25 PM\n\u00a0\u2013\u00a0\n9:00 PM\nBritish AirwaysOperated by BA Cityflyer\n1 hr 35 min\nZRH\u2013LCY\nNonstop\n100 kg CO2e\n+22% emissions\nPLN\u00a01,036\n6:00 PM\n\u00a0\u2013\u00a0\n6:40 PM\nSWISSOperated by Helvetic\n1 hr 40 min\nZRH\u2013LCY\nNonstop\n88 kg CO2e\n+7% emissions\nPLN\u00a01,417\n5:10 PM\n\u00a0\u2013\u00a0\n5:50 PM\nSWISS\n1 hr 40 min\nZRH\u2013LGW\nNonstop\n88 kg CO2e\n+7% emissions\nPLN\u00a01,423\n7:05 AM\n\u00a0\u2013\u00a0\n7:55 AM\nSWISS\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n91 kg CO2e\n+11% emissions\nPLN\u00a01,478\n7:35 AM\n\u00a0\u2013\u00a0\n8:20 AM\nSWISSOperated by Helvetic\n1 hr 45 min\nZRH\u2013LGW\nNonstop\n96 kg CO2e\n+17% emissions\nPLN\u00a01,478\n12:05 PM\n\u00a0\u2013\u00a0\n1:00 PM\nSWISSOperated by Air Baltic\n1 hr 55 min\nZRH\u2013LHR\nNonstop\n89 kg CO2e\n+9% emissions\nPLN\u00a01,478\n3:35 PM\n\u00a0\u2013\u00a0\n4:25 PM\nSWISS\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n68 kg CO2e\n-17% emissions\nPLN\u00a01,478\n5:00 PM\n\u00a0\u2013\u00a0\n5:50 PM\nSWISS\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n68 kg CO2e\n-17% emissions\nPLN\u00a01,478\n6:30 PM\n\u00a0\u2013\u00a0\n7:20 PM\nSWISS\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n70 kg CO2e\n-15% emissions\nPLN\u00a01,478\n1:05 PM\n\u00a0\u2013\u00a0\n1:45 PM\nSWISSOperated by Helvetic\n1 hr 40 min\nZRH\u2013LCY\nNonstop\n86 kg CO2e\nAvg emissions\nPLN\u00a01,509\n4:50 PM\n\u00a0\u2013\u00a0\n5:25 PM\nSWISSOperated by Helvetic\n1 hr 35 min\nZRH\u2013LCY\nNonstop\n86 kg CO2e\nAvg emissions\nPLN\u00a01,509\n7:45 PM\n\u00a0\u2013\u00a0\n8:30 PM\nBritish Airways\n1 hr 45 min\nZRH\u2013LHR\nNonstop\n71 kg CO2e\n-13% emissions\nPLN\u00a01,997\n8:55 PM\n\u00a0\u2013\u00a0\n9:45 PM\nSWISSOperated by Air Baltic\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n89 kg CO2e\n+9% emissions\nPLN\u00a02,127\n10:30 AM\n\u00a0\u2013\u00a0\n11:20 AM\nSWISS\n1 hr 50 min\nZRH\u2013LHR\nNonstop\n70 kg CO2e\n-15% emissions\nPLN\u00a02,689\nView more flights\nLanguage\u200bEnglish (United States)\nLocation\u200bPoland\nCurrencyPLN\nAbout\nPrivacy\nTerms\nJoin user studies\nReport Illegal Content\nFeedback\nHelp Center and Consumer Information\n\nDisplayed currencies may differ from the currencies used to purchase flights. Learn more\n\nPrices are final prices and include all taxes and fees, including payment fees for the cheapest common payment method (which may differ depending on the provider). Additional charges may apply for other types of payment, luggage, meals, WLAN or other additional services. Prices, availability and travel details are provided based on the latest information received from our partners. This information is reflected in the results within a period of less than 24 hours. Additional conditions may also be applied by our partners. You should then check prices and conditions with the services providers before booking.\n\nfrom PLN\u00a0551\nPage loaded."
  },
  "jevErrors": []
}
```

Row 2:

```json
{
  "state": "failed",
  "endReason": "OpenRouter returned an empty response",
  "verification": {
    "passed": false,
    "checks": {
      "searchPage": false,
      "origin": false,
      "destination": false,
      "oneWay": false,
      "departure": false,
      "year": false,
      "passenger": true,
      "economy": false,
      "results": false
    },
    "url": "https://www.google.com/travel/flights?hl=en",
    "controls": [
      {
        "label": "Main menu",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Change appearance",
        "value": ""
      },
      {
        "label": "Google apps",
        "value": ""
      },
      {
        "label": "",
        "value": "Round trip"
      },
      {
        "label": "1 passenger, change number of passengers.",
        "value": ""
      },
      {
        "label": "",
        "value": "Economy"
      },
      {
        "label": "Where from?",
        "value": "Wroc\u0142aw"
      },
      {
        "label": "Swap origin and destination.",
        "value": ""
      },
      {
        "label": "Where to? ",
        "value": ""
      },
      {
        "label": "Departure",
        "value": ""
      },
      {
        "label": "Return",
        "value": ""
      },
      {
        "label": "Explore destinations",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Learn more about this section",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Previous",
        "value": ""
      },
      {
        "label": "Next",
        "value": ""
      },
      {
        "label": "Find flights from Wroc\u0142aw (WRO) to London (LTN) from PLN\u00a0130.  Operated by Ryanair. Oct 22 to Oct 30. Nonstop",
        "value": "Wroc\u0142awLondonOct 22 \u2014 Oct 30Nonstopfrom PLN\u00a0130"
      },
      {
        "label": "Find flights from Wroc\u0142aw (WRO) to Paris (BVA) from PLN\u00a0188.  Operated by Ryanair. Nov 22 to Nov 30. Nonstop",
        "value": "Wroc\u0142awParisNov 22 \u2014 Nov 30Nonstopfrom PLN\u00a0188"
      },
      {
        "label": "Find flights from Wroc\u0142aw (WRO) to Milan (BGY) from PLN\u00a0130.  Operated by Ryanair. Oct 31 to Nov 7. Nonstop",
        "value": "Wroc\u0142awMilanOct 31 \u2014 Nov 7Nonstopfrom PLN\u00a0130"
      },
      {
        "label": "Explore more destinations from Wroc\u0142aw",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Previous",
        "value": ""
      },
      {
        "label": "Next",
        "value": ""
      },
      {
        "label": "What are some good flight destinations from Poland?",
        "value": ""
      },
      {
        "label": "How can I find last-minute flight deals?",
        "value": ""
      },
      {
        "label": "How can I find cheap flights for a weekend getaway?",
        "value": ""
      },
      {
        "label": "How can I find flight deals if my travel plans are flexible?",
        "value": ""
      },
      {
        "label": "How can I find cheap flights to anywhere?",
        "value": ""
      },
      {
        "label": "How can I get flight alerts for my trip?",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "",
        "value": ""
      },
      {
        "label": "Currency PLN",
        "value": ""
      },
      {
        "label": "",
        "value": "Report Illegal Content"
      },
      {
        "label": "International sites",
        "value": ""
      },
      {
        "label": "Explore flights",
        "value": ""
      }
    ],
    "visibleFlights": [],
    "text": "Skip to main content\nAccessibility feedback\nExplore\nFlights\nHotels\nVacation rentals\nChange appearance\nSign in\nFlights\nRound trip\n1\nEconomy\nWroc\u0142aw\nExplore\nFlexible? Discover the best flight deals with AI\nDescribe your ideal trip, and let Google Flights find the best deals for you\nExplore deals with AI\nFind and book cheap flights worldwide and track prices\nFind cheap flights from Poland to anywhere\nWroc\u0142aw\nWarsaw\nKrak\u00f3w\nGda\u0144sk\nWroc\u0142aw\nLondon\nOct 22 \u2014 Oct 30\nNonstop\nfrom PLN\u00a0130\nWroc\u0142aw\nParis\nNov 22 \u2014 Nov 30\nNonstop\nfrom PLN\u00a0188\nWroc\u0142aw\nMilan\nOct 31 \u2014 Nov 7\nNonstop\nfrom PLN\u00a0130\nExplore destinations\nUseful tools to help you find the best airline tickets\nFind the cheapest days to fly\nThe Date grid and Price graph make it easy to find the best flight deals\nKnow when to book with price insights\nPrice history and trend data show you the best time to book your airline ticket to get the cheapest price for your flight\nTrack flight prices for a trip\nNot ready to book yet? Observe price changes for a route or flight and get notified when prices drop.\nExplore the best flight deals with AI\nDescribe your ideal trip and let Google Flights find you the best deals\nInsightful tools help you choose your trip dates\nIf your travel plans are flexible, use the form above to start searching for a specific trip. Then, play around with the Date grid and Price graph options on the Search page to find the cheapest days to fly and book your tickets.\nPopular flight destinations from Poland\nLondon\nMilan\nParis\nTokyo\nOslo\nBarcelona\nFrankfurt am Main\nCopenhagen\nRome\nMunich\nFrequently asked questions\nWhat are some good flight destinations from Poland?\nHow can I find last-minute flight deals?\nHow can I find cheap flights for a weekend getaway?\nHow can I find flight deals if my travel plans are flexible?\nHow can I find cheap flights to anywhere?\nHow can I get flight alerts for my trip?\nSearch more flights\nFind cheap flights on popular routes\nFlights from cities in Poland\nInternational flights from Poland\nFlights from Warsaw\nFlights from Krak\u00f3w\nFlights from Gda\u0144sk\nFlights from Wroc\u0142aw\nFlights from Pozna\u0144\nFlights from Rzesz\u00f3w\nLanguage\u200bEnglish (United States)\nLocation\u200bPoland\nCurrencyPLN\n\nCurrent language and currency options applied: English (United States) - Poland - PLN\n\nDisplayed currencies may differ from the currencies used to purchase flights. Learn more\n\nPrices are final prices and include all taxes and fees, including payment fees for the cheapest common payment method (which may differ depending on the provider). Additional charges may apply for other types of payment, luggage, meals, WLAN or other additional services. Prices, availability and travel details are provided based on the latest information received from our partners. This information is reflected in the results within a period of less than 24 hours. Additional conditions may also be applied by our partners. You should then check prices and conditions with the services providers before booking.\n\nAbout\nPrivacy\nTerms\nJoin user studies\nReport Illegal Content\nFeedback\nHelp Center and Consumer Information\nInternational sites\nExplore flights"
  },
  "jevErrors": []
}
```


### jev-openrouter-local-2026-09-17.json

[historical/final: canonical source](../../docs/benchmarks/jev-openrouter-local-2026-09-17.json) · 72 records · 70 recorded successes · known cost $0.357926754.

File SHA-256: `18094532841126b54ee75a8b60dd1e931f29f99b387400a58291dd65a6f0b503`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / jev-first / gpt-5.6-luna | 3/3 | 8.119 | 7.455–8.570 |
| search / jev-first / google/gemini-3.8-flash | 3/3 | 3.468 | 2.967–3.897 |
| search / classic / google/gemini-3.8-flash | 2/3 | 12.209 | 9.464–14.953 |
| filters / jev-first / google/gemini-3.8-flash | 3/3 | 4.156 | 3.526–5.496 |
| filters / classic / google/gemini-3.8-flash | 3/3 | 9.190 | 8.901–21.040 |
| filters / jev-first / gpt-5.6-luna | 3/3 | 11.500 | 9.860–13.566 |
| autocomplete / classic / google/gemini-3.8-flash | 3/3 | 8.678 | 8.466–11.897 |
| autocomplete / jev-first / gpt-5.6-luna | 2/3 | 11.643 | 9.940–13.345 |
| autocomplete / jev-first / google/gemini-3.8-flash | 3/3 | 4.027 | 3.913–4.248 |
| form / jev-first / gpt-5.6-luna | 3/3 | 21.287 | 15.930–22.154 |
| form / jev-first / google/gemini-3.8-flash | 3/3 | 3.795 | 3.644–4.891 |
| form / classic / google/gemini-3.8-flash | 3/3 | 12.147 | 11.848–13.074 |
| navigation / jev-first / google/gemini-3.8-flash | 3/3 | 5.511 | 3.187–7.555 |
| navigation / classic / google/gemini-3.8-flash | 3/3 | 7.498 | 6.228–10.852 |
| navigation / jev-first / gpt-5.6-luna | 3/3 | 10.622 | 9.199–10.652 |
| tabs / classic / google/gemini-3.8-flash | 3/3 | 5.381 | 4.977–8.982 |
| tabs / jev-first / gpt-5.6-luna | 3/3 | 8.261 | 7.577–8.266 |
| tabs / jev-first / google/gemini-3.8-flash | 3/3 | 4.063 | 3.837–7.185 |
| scroll / jev-first / gpt-5.6-luna | 3/3 | 12.586 | 12.000–12.931 |
| scroll / jev-first / google/gemini-3.8-flash | 3/3 | 4.133 | 4.102–4.885 |
| scroll / classic / google/gemini-3.8-flash | 3/3 | 6.689 | 6.269–7.274 |
| disclosure / jev-first / google/gemini-3.8-flash | 3/3 | 3.867 | 2.475–4.064 |
| disclosure / classic / google/gemini-3.8-flash | 3/3 | 5.578 | 4.842–7.635 |
| disclosure / jev-first / gpt-5.6-luna | 3/3 | 7.598 | 6.933–9.490 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | jev-first / gpt-5.6-luna | 1 | True | 8.570 | 0.206 | 6.959 | 1.484 | 2 / 3 | 0.000162750 |
| 2 | search | jev-first / google/gemini-3.8-flash | 1 | True | 3.897 | 0.193 | 2.967 | 0.826 | 2 / 3 | 0.003894660 |
| 3 | search | classic / google/gemini-3.8-flash | 1 | True | 14.953 | 0.191 | 14.881 | 0.000 | 7 / 0 | 0.009321750 |
| 4 | search | jev-first / google/gemini-3.8-flash | 2 | True | 3.468 | 0.197 | 2.154 | 1.222 | 2 / 3 | 0.003882660 |
| 5 | search | classic / google/gemini-3.8-flash | 2 | False | 9.296 | 0.175 | 9.274 | 0.000 | 7 / 0 | 0.007618500 |
| 6 | search | jev-first / gpt-5.6-luna | 2 | True | 7.455 | 0.170 | 6.169 | 1.194 | 2 / 3 | 0.000162750 |
| 7 | search | classic / google/gemini-3.8-flash | 3 | True | 9.464 | 0.184 | 9.391 | 0.000 | 7 / 0 | 0.009352500 |
| 8 | search | jev-first / gpt-5.6-luna | 3 | True | 8.119 | 0.190 | 6.866 | 1.146 | 2 / 3 | 0.000160482 |
| 9 | search | jev-first / google/gemini-3.8-flash | 3 | True | 2.967 | 0.226 | 2.067 | 0.771 | 2 / 3 | 0.003886200 |
| 10 | filters | jev-first / google/gemini-3.8-flash | 1 | True | 5.496 | 0.227 | 4.296 | 1.066 | 2 / 4 | 0.003980622 |
| 11 | filters | classic / google/gemini-3.8-flash | 1 | True | 9.190 | 0.184 | 9.089 | 0.000 | 9 / 0 | 0.013268250 |
| 12 | filters | jev-first / gpt-5.6-luna | 1 | True | 11.500 | 0.193 | 9.826 | 1.554 | 3 / 4 | 0.000269556 |
| 13 | filters | classic / google/gemini-3.8-flash | 2 | True | 8.901 | 0.187 | 8.792 | 0.000 | 9 / 0 | 0.013287000 |
| 14 | filters | jev-first / gpt-5.6-luna | 2 | True | 13.566 | 0.190 | 11.915 | 1.537 | 3 / 4 | 0.000265020 |
| 15 | filters | jev-first / google/gemini-3.8-flash | 2 | True | 4.156 | 0.200 | 2.593 | 1.444 | 2 / 4 | 0.003994122 |
| 16 | filters | jev-first / gpt-5.6-luna | 3 | True | 9.860 | 0.195 | 8.308 | 1.435 | 2 / 4 | 0.000256452 |
| 17 | filters | jev-first / google/gemini-3.8-flash | 3 | True | 3.526 | 0.180 | 2.188 | 1.217 | 2 / 4 | 0.004056372 |
| 18 | filters | classic / google/gemini-3.8-flash | 3 | True | 21.040 | 0.186 | 20.937 | 0.000 | 9 / 0 | 0.013283250 |
| 19 | autocomplete | classic / google/gemini-3.8-flash | 1 | True | 11.897 | 0.206 | 11.814 | 0.000 | 8 / 0 | 0.010919250 |
| 20 | autocomplete | jev-first / gpt-5.6-luna | 1 | True | 13.345 | 0.187 | 12.349 | 0.890 | 4 / 2 | 0.000096726 |
| 21 | autocomplete | jev-first / google/gemini-3.8-flash | 1 | True | 4.027 | 0.202 | 2.267 | 1.365 | 2 / 4 | 0.003934518 |
| 22 | autocomplete | jev-first / gpt-5.6-luna | 2 | False | 7.667 | 0.181 | 6.591 | 1.007 | 2 / 2 | 0.000100254 |
| 23 | autocomplete | jev-first / google/gemini-3.8-flash | 2 | True | 4.248 | 0.182 | 3.653 | 0.502 | 3 / 2 | 0.006185610 |
| 24 | autocomplete | classic / google/gemini-3.8-flash | 2 | True | 8.466 | 0.178 | 8.390 | 0.000 | 8 / 0 | 0.010881750 |
| 25 | autocomplete | jev-first / google/gemini-3.8-flash | 3 | True | 3.913 | 0.192 | 1.916 | 1.593 | 2 / 4 | 0.003978054 |
| 26 | autocomplete | classic / google/gemini-3.8-flash | 3 | True | 8.678 | 0.188 | 8.589 | 0.000 | 8 / 0 | 0.010689000 |
| 27 | autocomplete | jev-first / gpt-5.6-luna | 3 | True | 9.940 | 0.189 | 8.882 | 0.945 | 3 / 2 | 0.000098490 |
| 28 | form | jev-first / gpt-5.6-luna | 1 | True | 22.154 | 0.206 | 19.507 | 2.486 | 3 / 6 | 0.000437934 |
| 29 | form | jev-first / google/gemini-3.8-flash | 1 | True | 4.891 | 0.216 | 3.199 | 1.566 | 2 / 4 | 0.004254180 |
| 30 | form | classic / google/gemini-3.8-flash | 1 | True | 12.147 | 0.203 | 12.048 | 0.000 | 11 / 0 | 0.016749000 |
| 31 | form | jev-first / google/gemini-3.8-flash | 2 | True | 3.644 | 0.176 | 1.945 | 1.578 | 2 / 4 | 0.004317072 |
| 32 | form | classic / google/gemini-3.8-flash | 2 | True | 13.074 | 0.182 | 12.976 | 0.000 | 13 / 0 | 0.020184750 |
| 33 | form | jev-first / gpt-5.6-luna | 2 | True | 15.930 | 0.191 | 15.158 | 0.654 | 5 / 1 | 0.000065520 |
| 34 | form | classic / google/gemini-3.8-flash | 3 | True | 11.848 | 0.183 | 11.745 | 0.000 | 9 / 0 | 0.013221000 |
| 35 | form | jev-first / gpt-5.6-luna | 3 | True | 21.287 | 0.189 | 19.625 | 1.547 | 2 / 4 | 0.000313950 |
| 36 | form | jev-first / google/gemini-3.8-flash | 3 | True | 3.795 | 0.195 | 2.233 | 1.447 | 2 / 4 | 0.004189242 |
| 37 | navigation | jev-first / google/gemini-3.8-flash | 1 | True | 7.555 | 0.186 | 6.521 | 0.869 | 3 / 2 | 0.006182658 |
| 38 | navigation | classic / google/gemini-3.8-flash | 1 | True | 7.498 | 0.185 | 7.345 | 0.000 | 8 / 0 | 0.011162250 |
| 39 | navigation | jev-first / gpt-5.6-luna | 1 | True | 10.622 | 0.189 | 9.475 | 0.996 | 3 / 2 | 0.000086268 |
| 40 | navigation | classic / google/gemini-3.8-flash | 2 | True | 6.228 | 0.189 | 6.059 | 0.000 | 7 / 0 | 0.009473250 |
| 41 | navigation | jev-first / gpt-5.6-luna | 2 | True | 9.199 | 0.214 | 7.816 | 1.197 | 2 / 3 | 0.000118440 |
| 42 | navigation | jev-first / google/gemini-3.8-flash | 2 | True | 5.511 | 0.225 | 4.311 | 1.050 | 3 / 2 | 0.006112158 |
| 43 | navigation | jev-first / gpt-5.6-luna | 3 | True | 10.652 | 0.178 | 9.158 | 1.338 | 2 / 3 | 0.000119490 |
| 44 | navigation | jev-first / google/gemini-3.8-flash | 3 | True | 3.187 | 0.225 | 1.953 | 0.954 | 2 / 3 | 0.003869130 |
| 45 | navigation | classic / google/gemini-3.8-flash | 3 | True | 10.852 | 0.193 | 10.716 | 0.000 | 7 / 0 | 0.009465750 |
| 46 | tabs | classic / google/gemini-3.8-flash | 1 | True | 8.982 | 0.180 | 8.902 | 0.000 | 6 / 0 | 0.007759500 |
| 47 | tabs | jev-first / gpt-5.6-luna | 1 | True | 8.261 | 0.183 | 7.239 | 0.914 | 2 / 2 | 0.000085596 |
| 48 | tabs | jev-first / google/gemini-3.8-flash | 1 | True | 7.185 | 0.186 | 5.832 | 1.216 | 5 / 3 | 0.011463036 |
| 49 | tabs | jev-first / gpt-5.6-luna | 2 | True | 8.266 | 0.181 | 7.257 | 0.915 | 2 / 2 | 0.000085764 |
| 50 | tabs | jev-first / google/gemini-3.8-flash | 2 | True | 3.837 | 0.182 | 3.009 | 0.589 | 3 / 2 | 0.006018192 |
| 51 | tabs | classic / google/gemini-3.8-flash | 2 | True | 5.381 | 0.189 | 5.312 | 0.000 | 5 / 0 | 0.006383250 |
| 52 | tabs | jev-first / google/gemini-3.8-flash | 3 | True | 4.063 | 0.196 | 3.074 | 0.884 | 3 / 2 | 0.006186762 |
| 53 | tabs | classic / google/gemini-3.8-flash | 3 | True | 4.977 | 0.183 | 4.904 | 0.000 | 5 / 0 | 0.006379500 |
| 54 | tabs | jev-first / gpt-5.6-luna | 3 | True | 7.577 | 0.187 | 6.611 | 0.874 | 2 / 2 | 0.000083244 |
| 55 | scroll | jev-first / gpt-5.6-luna | 1 | True | 12.586 | 0.186 | 10.969 | 1.445 | 3 / 4 | 0.000134190 |
| 56 | scroll | jev-first / google/gemini-3.8-flash | 1 | True | 4.133 | 0.187 | 2.013 | 1.923 | 2 / 6 | 0.003924318 |
| 57 | scroll | classic / google/gemini-3.8-flash | 1 | True | 6.269 | 0.180 | 6.186 | 0.000 | 5 / 0 | 0.006273750 |
| 58 | scroll | jev-first / google/gemini-3.8-flash | 2 | True | 4.102 | 0.184 | 2.506 | 1.446 | 3 / 4 | 0.006217392 |
| 59 | scroll | classic / google/gemini-3.8-flash | 2 | True | 6.689 | 0.184 | 6.621 | 0.000 | 5 / 0 | 0.006273750 |
| 60 | scroll | jev-first / gpt-5.6-luna | 2 | True | 12.931 | 0.184 | 11.380 | 1.419 | 3 / 4 | 0.000134190 |
| 61 | scroll | classic / google/gemini-3.8-flash | 3 | True | 7.274 | 0.178 | 7.213 | 0.000 | 5 / 0 | 0.006273750 |
| 62 | scroll | jev-first / gpt-5.6-luna | 3 | True | 12.000 | 0.181 | 10.397 | 1.431 | 3 / 4 | 0.000134694 |
| 63 | scroll | jev-first / google/gemini-3.8-flash | 3 | True | 4.885 | 0.181 | 3.270 | 1.453 | 3 / 4 | 0.006188310 |
| 64 | disclosure | jev-first / google/gemini-3.8-flash | 1 | True | 2.475 | 0.214 | 1.789 | 0.597 | 2 / 2 | 0.003661974 |
| 65 | disclosure | classic / google/gemini-3.8-flash | 1 | True | 5.578 | 0.188 | 5.506 | 0.000 | 5 / 0 | 0.006136500 |
| 66 | disclosure | jev-first / gpt-5.6-luna | 1 | True | 7.598 | 0.180 | 6.581 | 0.930 | 2 / 2 | 0.000086604 |
| 67 | disclosure | classic / google/gemini-3.8-flash | 2 | True | 4.842 | 0.184 | 4.768 | 0.000 | 5 / 0 | 0.006136500 |
| 68 | disclosure | jev-first / gpt-5.6-luna | 2 | True | 6.933 | 0.204 | 5.932 | 0.919 | 2 / 2 | 0.000087612 |
| 69 | disclosure | jev-first / google/gemini-3.8-flash | 2 | True | 3.867 | 0.186 | 2.131 | 0.530 | 2 / 2 | 0.003636552 |
| 70 | disclosure | jev-first / gpt-5.6-luna | 3 | True | 9.490 | 0.196 | 8.461 | 0.939 | 2 / 2 | 0.000085932 |
| 71 | disclosure | jev-first / google/gemini-3.8-flash | 3 | True | 4.064 | 0.188 | 3.060 | 0.915 | 2 / 2 | 0.003638802 |
| 72 | disclosure | classic / google/gemini-3.8-flash | 3 | True | 7.635 | 0.192 | 7.571 | 0.000 | 5 / 0 | 0.006148500 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 5:

```json
{
  "state": "failed",
  "endReason": "OpenRouter returned an empty response",
  "verification": {
    "passed": false,
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR"
  },
  "jevErrors": []
}
```

Row 22:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "passed": false,
    "expected": "Selected destination: Paris, France"
  },
  "jevErrors": []
}
```


### jev-openrouter-pilot-2026-09-17.json

[historical/diagnostic: canonical source](../../docs/benchmarks/jev-openrouter-pilot-2026-09-17.json) · 2 records · 2 recorded successes · known cost $0.012727200.

File SHA-256: `58cc538e835e98298cef50dae59cbb0ec73ec88fef449301559a36f264c4441d`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / classic / google/gemini-3.8-flash | 1/1 | 6.683 | 6.683–6.683 |
| search / jev-first / google/gemini-3.8-flash | 1/1 | 3.744 | 3.744–3.744 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | classic / google/gemini-3.8-flash | 1 | True | 6.683 | 0.191 | 6.586 | 0.000 | 7 / 0 | 0.009143250 |
| 2 | search | jev-first / google/gemini-3.8-flash | 1 | True | 3.744 | 0.193 | 2.299 | 1.332 | 2 / 3 | 0.003583950 |

### final-flights.json

[poc/final: canonical source](../../docs/benchmarks/browser-poc/results/final-flights.json) · 30 records · 30 recorded successes · known cost $2.076432768.

File SHA-256: `028c411d90f4a63c65faf8cd67681b4f7c1bfb540bef5f61905448a20019a922`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-first / google/gemini-3.8-flash | 10/10 | 30.782 | 26.232–32.717 |
| google-flights / ultrafast / google/gemini-3.8-flash | 10/10 | 11.424 | 10.148–12.229 |
| google-flights / browser-use / google/gemini-3.8-flash | 10/10 | 34.824 | 31.156–37.856 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-first / google/gemini-3.8-flash | 1 | True | 32.165 | 1.766 | 27.359 | 2.801 | 20 / 4 | 0.162418503 |
| 2 | google-flights | ultrafast / google/gemini-3.8-flash | 1 | True | 11.609 | 3.174 | 2.190 | 7.798 | 2 / 18 | 0.004910244 |
| 3 | google-flights | browser-use / google/gemini-3.8-flash | 1 | True | 35.097 | 3.329 | 20.083 | 0.000 | 11 / 0 | 0.044739750 |
| 4 | google-flights | ultrafast / google/gemini-3.8-flash | 2 | True | 11.430 | 3.147 | 1.916 | 7.791 | 2 / 18 | 0.004961442 |
| 5 | google-flights | browser-use / google/gemini-3.8-flash | 2 | True | 36.028 | 3.166 | 19.871 | 0.000 | 12 / 0 | 0.047273250 |
| 6 | google-flights | app-first / google/gemini-3.8-flash | 2 | True | 26.232 | 2.742 | 24.112 | 0.873 | 20 / 1 | 0.199005738 |
| 7 | google-flights | browser-use / google/gemini-3.8-flash | 3 | True | 37.356 | 4.192 | 20.800 | 0.000 | 12 / 0 | 0.041664075 |
| 8 | google-flights | app-first / google/gemini-3.8-flash | 3 | True | 28.056 | 2.762 | 26.010 | 0.899 | 20 / 1 | 0.162830208 |
| 9 | google-flights | ultrafast / google/gemini-3.8-flash | 3 | True | 10.886 | 3.197 | 1.957 | 7.243 | 2 / 18 | 0.004961442 |
| 10 | google-flights | app-first / google/gemini-3.8-flash | 4 | True | 30.560 | 1.551 | 26.880 | 1.789 | 18 / 3 | 0.142003149 |
| 11 | google-flights | ultrafast / google/gemini-3.8-flash | 4 | True | 10.148 | 3.242 | 2.310 | 6.478 | 2 / 17 | 0.004371846 |
| 12 | google-flights | browser-use / google/gemini-3.8-flash | 4 | True | 34.388 | 3.082 | 18.556 | 0.000 | 12 / 0 | 0.043876725 |
| 13 | google-flights | ultrafast / google/gemini-3.8-flash | 5 | True | 11.468 | 3.111 | 2.116 | 7.800 | 2 / 19 | 0.005163126 |
| 14 | google-flights | browser-use / google/gemini-3.8-flash | 5 | True | 31.156 | 3.078 | 15.922 | 0.000 | 11 / 0 | 0.046025250 |
| 15 | google-flights | app-first / google/gemini-3.8-flash | 5 | True | 32.069 | 2.868 | 25.979 | 0.917 | 18 / 1 | 0.157998849 |
| 16 | google-flights | browser-use / google/gemini-3.8-flash | 6 | True | 34.550 | 2.292 | 19.456 | 0.000 | 11 / 0 | 0.042939075 |
| 17 | google-flights | app-first / google/gemini-3.8-flash | 6 | True | 32.717 | 0.869 | 28.250 | 3.232 | 20 / 4 | 0.162088104 |
| 18 | google-flights | ultrafast / google/gemini-3.8-flash | 6 | True | 11.629 | 1.413 | 2.199 | 7.830 | 2 / 19 | 0.005163126 |
| 19 | google-flights | app-first / google/gemini-3.8-flash | 7 | True | 27.179 | 0.866 | 24.719 | 0.900 | 20 / 1 | 0.160243923 |
| 20 | google-flights | ultrafast / google/gemini-3.8-flash | 7 | True | 11.069 | 1.172 | 2.382 | 7.396 | 2 / 18 | 0.004910244 |
| 21 | google-flights | browser-use / google/gemini-3.8-flash | 7 | True | 37.856 | 2.484 | 22.186 | 0.000 | 12 / 0 | 0.046313325 |
| 22 | google-flights | ultrafast / google/gemini-3.8-flash | 8 | True | 11.403 | 1.320 | 1.956 | 7.699 | 2 / 18 | 0.004961442 |
| 23 | google-flights | browser-use / google/gemini-3.8-flash | 8 | True | 35.507 | 2.494 | 20.990 | 0.000 | 10 / 0 | 0.037737825 |
| 24 | google-flights | app-first / google/gemini-3.8-flash | 8 | True | 31.004 | 1.078 | 28.265 | 0.904 | 20 / 1 | 0.153411549 |
| 25 | google-flights | browser-use / google/gemini-3.8-flash | 9 | True | 33.027 | 2.179 | 17.905 | 0.000 | 11 / 0 | 0.042927750 |
| 26 | google-flights | app-first / google/gemini-3.8-flash | 9 | True | 32.199 | 0.806 | 25.594 | 2.380 | 18 / 3 | 0.147788517 |
| 27 | google-flights | ultrafast / google/gemini-3.8-flash | 9 | True | 12.229 | 1.320 | 1.775 | 8.773 | 2 / 19 | 0.005307228 |
| 28 | google-flights | app-first / google/gemini-3.8-flash | 10 | True | 29.945 | 1.126 | 26.650 | 2.089 | 19 / 3 | 0.141552291 |
| 29 | google-flights | ultrafast / google/gemini-3.8-flash | 10 | True | 11.417 | 1.377 | 2.054 | 7.733 | 2 / 20 | 0.005361072 |
| 30 | google-flights | browser-use / google/gemini-3.8-flash | 10 | True | 33.813 | 2.514 | 18.755 | 0.000 | 11 / 0 | 0.043523700 |

### final-local.json

[poc/final: canonical source](../../docs/benchmarks/browser-poc/results/final-local.json) · 72 records · 63 recorded successes · known cost $1.922407644.

File SHA-256: `fd571311b5d09fefbbb58b8d2cb29660cf1bd690863a3ca503dac3b670c2f112`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-first / google/gemini-3.8-flash | 3/3 | 3.542 | 3.528–4.334 |
| search / ultrafast / google/gemini-3.8-flash | 3/3 | 2.477 | 2.296–3.202 |
| search / browser-use / google/gemini-3.8-flash | 3/3 | 4.452 | 4.314–4.571 |
| filters / ultrafast / google/gemini-3.8-flash | 3/3 | 1.736 | 1.673–1.940 |
| filters / browser-use / google/gemini-3.8-flash | 3/3 | 5.447 | 5.302–5.896 |
| filters / app-first / google/gemini-3.8-flash | 3/3 | 3.597 | 3.414–4.254 |
| autocomplete / browser-use / google/gemini-3.8-flash | 3/3 | 8.200 | 7.091–8.487 |
| autocomplete / app-first / google/gemini-3.8-flash | 3/3 | 4.368 | 4.042–4.407 |
| autocomplete / ultrafast / google/gemini-3.8-flash | 3/3 | 2.454 | 2.447–2.865 |
| wizard-6 / app-first / google/gemini-3.8-flash | 3/3 | 34.960 | 28.746–42.798 |
| wizard-6 / ultrafast / google/gemini-3.8-flash | 3/3 | 24.069 | 21.100–29.949 |
| wizard-6 / browser-use / google/gemini-3.8-flash | 3/3 | 20.202 | 19.759–20.884 |
| wizard-10 / ultrafast / google/gemini-3.8-flash | 3/3 | 37.329 | 36.744–38.321 |
| wizard-10 / browser-use / google/gemini-3.8-flash | 3/3 | 33.459 | 31.301–34.246 |
| wizard-10 / app-first / google/gemini-3.8-flash | 3/3 | 51.841 | 47.593–60.242 |
| compare-offers / browser-use / google/gemini-3.8-flash | 3/3 | 10.488 | 7.966–11.004 |
| compare-offers / app-first / google/gemini-3.8-flash | 3/3 | 9.105 | 5.489–11.184 |
| compare-offers / ultrafast / google/gemini-3.8-flash | 0/3 | — | — |
| research-offers / app-first / google/gemini-3.8-flash | 3/3 | 13.797 | 13.198–16.017 |
| research-offers / ultrafast / google/gemini-3.8-flash | 0/3 | — | — |
| research-offers / browser-use / google/gemini-3.8-flash | 3/3 | 27.257 | 25.815–29.518 |
| tabs / ultrafast / google/gemini-3.8-flash | 0/3 | — | — |
| tabs / browser-use / google/gemini-3.8-flash | 3/3 | 4.305 | 4.157–4.324 |
| tabs / app-first / google/gemini-3.8-flash | 3/3 | 4.931 | 2.850–7.685 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-first / google/gemini-3.8-flash | 1 | True | 4.334 | 0.367 | 2.071 | 2.125 | 2 / 3 | 0.004061160 |
| 2 | search | ultrafast / google/gemini-3.8-flash | 1 | True | 2.477 | 0.687 | 1.108 | 1.275 | 1 / 3 | 0.000476190 |
| 3 | search | browser-use / google/gemini-3.8-flash | 1 | True | 4.571 | 1.444 | 3.075 | 0.000 | 2 / 0 | 0.003153750 |
| 4 | search | ultrafast / google/gemini-3.8-flash | 2 | True | 2.296 | 0.683 | 1.009 | 1.183 | 1 / 3 | 0.000596190 |
| 5 | search | browser-use / google/gemini-3.8-flash | 2 | True | 4.314 | 2.812 | 2.816 | 0.000 | 2 / 0 | 0.002619750 |
| 6 | search | app-first / google/gemini-3.8-flash | 2 | True | 3.528 | 0.312 | 2.132 | 1.288 | 2 / 3 | 0.004016160 |
| 7 | search | browser-use / google/gemini-3.8-flash | 3 | True | 4.452 | 1.442 | 2.947 | 0.000 | 2 / 0 | 0.002393250 |
| 8 | search | app-first / google/gemini-3.8-flash | 3 | True | 3.542 | 0.315 | 2.128 | 1.300 | 2 / 3 | 0.003965148 |
| 9 | search | ultrafast / google/gemini-3.8-flash | 3 | True | 3.202 | 0.683 | 2.001 | 1.103 | 1 / 3 | 0.000476190 |
| 10 | filters | ultrafast / google/gemini-3.8-flash | 1 | True | 1.673 | 0.694 | 0.000 | 1.502 | 0 / 4 | 0.000366282 |
| 11 | filters | browser-use / google/gemini-3.8-flash | 1 | True | 5.447 | 1.518 | 3.106 | 0.000 | 2 / 0 | 0.002598000 |
| 12 | filters | app-first / google/gemini-3.8-flash | 1 | True | 3.414 | 0.320 | 1.760 | 1.527 | 2 / 4 | 0.004098372 |
| 13 | filters | browser-use / google/gemini-3.8-flash | 2 | True | 5.896 | 1.458 | 3.683 | 0.000 | 2 / 0 | 0.002597250 |
| 14 | filters | app-first / google/gemini-3.8-flash | 2 | True | 3.597 | 0.313 | 1.895 | 1.569 | 2 / 4 | 0.004084872 |
| 15 | filters | ultrafast / google/gemini-3.8-flash | 2 | True | 1.736 | 0.691 | 0.000 | 1.635 | 0 / 4 | 0.000366282 |
| 16 | filters | app-first / google/gemini-3.8-flash | 3 | True | 4.254 | 0.314 | 2.348 | 1.776 | 2 / 4 | 0.004078872 |
| 17 | filters | ultrafast / google/gemini-3.8-flash | 3 | True | 1.940 | 0.670 | 0.000 | 1.810 | 0 / 4 | 0.000366282 |
| 18 | filters | browser-use / google/gemini-3.8-flash | 3 | True | 5.302 | 1.434 | 3.079 | 0.000 | 2 / 0 | 0.002856000 |
| 19 | autocomplete | browser-use / google/gemini-3.8-flash | 1 | True | 8.487 | 1.423 | 6.057 | 0.000 | 4 / 0 | 0.004689000 |
| 20 | autocomplete | app-first / google/gemini-3.8-flash | 1 | True | 4.407 | 0.301 | 3.240 | 1.064 | 3 / 2 | 0.006277332 |
| 21 | autocomplete | ultrafast / google/gemini-3.8-flash | 1 | True | 2.447 | 0.687 | 0.771 | 1.561 | 1 / 4 | 0.000543708 |
| 22 | autocomplete | app-first / google/gemini-3.8-flash | 2 | True | 4.042 | 0.312 | 1.991 | 1.634 | 2 / 4 | 0.004022490 |
| 23 | autocomplete | ultrafast / google/gemini-3.8-flash | 2 | True | 2.454 | 0.679 | 0.796 | 1.521 | 1 / 4 | 0.000543708 |
| 24 | autocomplete | browser-use / google/gemini-3.8-flash | 2 | True | 8.200 | 1.424 | 5.809 | 0.000 | 4 / 0 | 0.004971000 |
| 25 | autocomplete | ultrafast / google/gemini-3.8-flash | 3 | True | 2.865 | 0.694 | 1.021 | 1.715 | 1 / 4 | 0.000543708 |
| 26 | autocomplete | browser-use / google/gemini-3.8-flash | 3 | True | 7.091 | 1.417 | 5.650 | 0.000 | 4 / 0 | 0.004802250 |
| 27 | autocomplete | app-first / google/gemini-3.8-flash | 3 | True | 4.368 | 0.315 | 2.250 | 1.705 | 2 / 4 | 0.004015248 |
| 28 | wizard-6 | app-first / google/gemini-3.8-flash | 1 | True | 28.746 | 0.318 | 18.664 | 9.453 | 14 / 29 | 0.063911094 |
| 29 | wizard-6 | ultrafast / google/gemini-3.8-flash | 1 | True | 21.100 | 0.744 | 11.678 | 8.441 | 12 / 25 | 0.007574640 |
| 30 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | True | 20.884 | 1.934 | 12.516 | 0.000 | 7 / 0 | 0.012103500 |
| 31 | wizard-6 | ultrafast / google/gemini-3.8-flash | 2 | True | 29.949 | 0.879 | 20.941 | 8.081 | 12 / 25 | 0.008054640 |
| 32 | wizard-6 | browser-use / google/gemini-3.8-flash | 2 | True | 19.759 | 1.931 | 11.389 | 0.000 | 7 / 0 | 0.011798250 |
| 33 | wizard-6 | app-first / google/gemini-3.8-flash | 2 | True | 34.960 | 0.301 | 33.722 | 0.700 | 29 / 1 | 0.200152893 |
| 34 | wizard-6 | browser-use / google/gemini-3.8-flash | 3 | True | 20.202 | 1.936 | 11.807 | 0.000 | 7 / 0 | 0.012355500 |
| 35 | wizard-6 | app-first / google/gemini-3.8-flash | 3 | True | 42.798 | 0.318 | 41.591 | 0.667 | 28 / 1 | 0.194110206 |
| 36 | wizard-6 | ultrafast / google/gemini-3.8-flash | 3 | True | 24.069 | 0.712 | 13.836 | 9.194 | 12 / 25 | 0.007972140 |
| 37 | wizard-10 | ultrafast / google/gemini-3.8-flash | 1 | True | 37.329 | 0.694 | 21.724 | 13.966 | 20 / 41 | 0.014471628 |
| 38 | wizard-10 | browser-use / google/gemini-3.8-flash | 1 | True | 33.459 | 1.922 | 19.695 | 0.000 | 11 / 0 | 0.021061500 |
| 39 | wizard-10 | app-first / google/gemini-3.8-flash | 1 | True | 47.593 | 0.310 | 46.031 | 0.713 | 42 / 1 | 0.259858224 |
| 40 | wizard-10 | browser-use / google/gemini-3.8-flash | 2 | True | 31.301 | 1.921 | 17.552 | 0.000 | 11 / 0 | 0.021761250 |
| 41 | wizard-10 | app-first / google/gemini-3.8-flash | 2 | True | 51.841 | 0.309 | 50.231 | 0.728 | 43 / 1 | 0.272538126 |
| 42 | wizard-10 | ultrafast / google/gemini-3.8-flash | 2 | True | 36.744 | 0.695 | 22.609 | 12.484 | 20 / 41 | 0.014010378 |
| 43 | wizard-10 | app-first / google/gemini-3.8-flash | 3 | True | 60.242 | 0.306 | 58.753 | 0.619 | 42 / 1 | 0.261230610 |
| 44 | wizard-10 | ultrafast / google/gemini-3.8-flash | 3 | True | 38.321 | 0.703 | 22.684 | 13.954 | 20 / 41 | 0.013245378 |
| 45 | wizard-10 | browser-use / google/gemini-3.8-flash | 3 | True | 34.246 | 1.912 | 20.508 | 0.000 | 11 / 0 | 0.020121000 |
| 46 | compare-offers | browser-use / google/gemini-3.8-flash | 1 | True | 11.004 | 1.912 | 9.473 | 0.000 | 2 / 0 | 0.018189750 |
| 47 | compare-offers | app-first / google/gemini-3.8-flash | 1 | True | 9.105 | 0.310 | 6.285 | 2.644 | 4 / 6 | 0.010922406 |
| 48 | compare-offers | ultrafast / google/gemini-3.8-flash | 1 | False | 22.684 | 0.677 | 0.000 | 20.455 | 0 / 61 | 0.008582238 |
| 49 | compare-offers | app-first / google/gemini-3.8-flash | 2 | True | 5.489 | 0.312 | 4.467 | 0.890 | 4 / 2 | 0.010677480 |
| 50 | compare-offers | ultrafast / google/gemini-3.8-flash | 2 | False | 22.352 | 0.684 | 0.000 | 20.286 | 0 / 61 | 0.008582448 |
| 51 | compare-offers | browser-use / google/gemini-3.8-flash | 2 | True | 10.488 | 1.918 | 8.917 | 0.000 | 2 / 0 | 0.017926500 |
| 52 | compare-offers | ultrafast / google/gemini-3.8-flash | 3 | False | 23.498 | 0.706 | 0.000 | 21.350 | 0 / 61 | 0.008582448 |
| 53 | compare-offers | browser-use / google/gemini-3.8-flash | 3 | True | 7.966 | 1.947 | 6.441 | 0.000 | 2 / 0 | 0.015154500 |
| 54 | compare-offers | app-first / google/gemini-3.8-flash | 3 | True | 11.184 | 0.318 | 5.655 | 5.174 | 4 / 12 | 0.012562590 |
| 55 | research-offers | app-first / google/gemini-3.8-flash | 1 | True | 13.797 | 0.301 | 12.524 | 0.690 | 11 / 2 | 0.044532318 |
| 56 | research-offers | ultrafast / google/gemini-3.8-flash | 1 | False | 24.298 | 0.709 | 0.000 | 21.835 | 0 / 61 | 0.006874392 |
| 57 | research-offers | browser-use / google/gemini-3.8-flash | 1 | True | 29.518 | 1.948 | 23.062 | 0.000 | 8 / 0 | 0.055947000 |
| 58 | research-offers | ultrafast / google/gemini-3.8-flash | 2 | False | 22.698 | 0.712 | 0.000 | 20.262 | 0 / 61 | 0.006874224 |
| 59 | research-offers | browser-use / google/gemini-3.8-flash | 2 | True | 27.257 | 1.947 | 20.771 | 0.000 | 8 / 0 | 0.056165250 |
| 60 | research-offers | app-first / google/gemini-3.8-flash | 2 | True | 16.017 | 0.311 | 14.460 | 0.934 | 11 / 2 | 0.044776878 |
| 61 | research-offers | browser-use / google/gemini-3.8-flash | 3 | True | 25.815 | 1.455 | 19.355 | 0.000 | 8 / 0 | 0.045817275 |
| 62 | research-offers | app-first / google/gemini-3.8-flash | 3 | True | 13.198 | 0.312 | 10.127 | 2.355 | 9 / 7 | 0.033629454 |
| 63 | research-offers | ultrafast / google/gemini-3.8-flash | 3 | False | 22.901 | 0.697 | 0.000 | 20.530 | 0 / 61 | 0.006874224 |
| 64 | tabs | ultrafast / google/gemini-3.8-flash | 1 | False | 1.339 | 0.910 | 0.000 | 1.130 | 0 / 3 | 0.000170898 |
| 65 | tabs | browser-use / google/gemini-3.8-flash | 1 | True | 4.157 | 1.450 | 2.925 | 0.000 | 2 / 0 | 0.002388000 |
| 66 | tabs | app-first / google/gemini-3.8-flash | 1 | True | 2.850 | 0.318 | 1.873 | 0.847 | 2 / 2 | 0.003917238 |
| 67 | tabs | browser-use / google/gemini-3.8-flash | 2 | True | 4.324 | 1.465 | 3.094 | 0.000 | 2 / 0 | 0.002611500 |
| 68 | tabs | app-first / google/gemini-3.8-flash | 2 | True | 4.931 | 0.323 | 3.841 | 0.958 | 2 / 2 | 0.003949788 |
| 69 | tabs | ultrafast / google/gemini-3.8-flash | 2 | False | 1.043 | 0.681 | 0.000 | 0.989 | 0 / 2 | 0.000112602 |
| 70 | tabs | app-first / google/gemini-3.8-flash | 3 | True | 7.685 | 0.323 | 6.062 | 1.456 | 2 / 4 | 0.003988944 |
| 71 | tabs | ultrafast / google/gemini-3.8-flash | 3 | False | 1.317 | 0.675 | 0.000 | 1.154 | 0 / 3 | 0.000170898 |
| 72 | tabs | browser-use / google/gemini-3.8-flash | 3 | True | 4.305 | 1.431 | 3.066 | 0.000 | 2 / 0 | 0.002517000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 48:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false
  }
}
```

Row 50:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false
  }
}
```

Row 52:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false
  }
}
```

Row 56:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false,
    "visited": [
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "boreal"
    ]
  }
}
```

Row 58:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false,
    "visited": [
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas"
    ]
  }
}
```

Row 63:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false,
    "visited": [
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas",
      "atlas",
      "boreal",
      "cedar",
      "atlas",
      "atlas",
      "atlas"
    ]
  }
}
```

Row 64:

```json
{
  "state": "blocked",
  "error": null,
  "verification": {
    "passed": true,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```

Row 69:

```json
{
  "state": "blocked",
  "error": null,
  "verification": {
    "passed": true,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```

Row 71:

```json
{
  "state": "blocked",
  "error": null,
  "verification": {
    "passed": true,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```


### diagnostics.json.gz: headed-smoke.json

[poc/headful: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 1 recorded successes · known cost $0.000476190.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / ultrafast / google/gemini-3.8-flash | 1/1 | 2.344 | 2.344–2.344 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | ultrafast / google/gemini-3.8-flash | 1 | True | 2.344 | 1.126 | 1.045 | 1.233 | 1 / 3 | 0.000476190 |

### diagnostics.json.gz: pilot-cleanup.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 1 recorded successes · known cost $0.004731750.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / browser-use / google/gemini-3.8-flash | 1/1 | 6.814 | 6.814–6.814 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | browser-use / google/gemini-3.8-flash | 1 | True | 6.814 | 1.767 | 5.382 | 0.000 | 3 / 0 | 0.004731750 |

### diagnostics.json.gz: pilot-complex.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 6 records · 4 recorded successes · known cost $0.086577840.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / app-first / google/gemini-3.8-flash | 1/1 | 21.285 | 21.285–21.285 |
| wizard-6 / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |
| wizard-6 / browser-use / google/gemini-3.8-flash | 1/1 | 19.332 | 19.332–19.332 |
| compare-offers / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |
| compare-offers / browser-use / google/gemini-3.8-flash | 1/1 | 11.778 | 11.778–11.778 |
| compare-offers / app-first / google/gemini-3.8-flash | 1/1 | 6.161 | 6.161–6.161 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | app-first / google/gemini-3.8-flash | 1 | True | 21.285 | 0.323 | 11.425 | 9.195 | 8 / 27 | 0.031155198 |
| 2 | wizard-6 | ultrafast / google/gemini-3.8-flash | 1 | False | 33.857 | 0.712 | 4.749 | 28.718 | 5 / 10 | 0.002879538 |
| 3 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | True | 19.332 | 1.965 | 10.954 | 0.000 | 7 / 0 | 0.013338750 |
| 4 | compare-offers | ultrafast / google/gemini-3.8-flash | 1 | False | 20.362 | 0.915 | 0.000 | 18.235 | 0 / 61 | 0.008582238 |
| 5 | compare-offers | browser-use / google/gemini-3.8-flash | 1 | True | 11.778 | 1.918 | 10.233 | 0.000 | 2 / 0 | 0.016404750 |
| 6 | compare-offers | app-first / google/gemini-3.8-flash | 1 | True | 6.161 | 0.316 | 5.361 | 0.652 | 5 / 1 | 0.014217366 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 2:

```json
{
  "state": "ready",
  "error": "Model connection failed; no action executed.",
  "verification": {
    "passed": false,
    "checks": {
      "count": false,
      "values": false
    },
    "records": [
      {
        "city": "Basel",
        "person": "Ada",
        "mode": "Train"
      },
      {
        "city": "Bern",
        "person": "Ada",
        "mode": "Train"
      }
    ]
  }
}
```

Row 4:

```json
{
  "state": "blocked",
  "error": "Stopped at the 60-action demo budget",
  "verification": {
    "passed": false
  }
}
```


### diagnostics.json.gz: pilot-flights-v3.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 3 records · 3 recorded successes · known cost $0.196695324.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-first / google/gemini-3.8-flash | 1/1 | 30.079 | 30.079–30.079 |
| google-flights / ultrafast / google/gemini-3.8-flash | 1/1 | 8.806 | 8.806–8.806 |
| google-flights / browser-use / google/gemini-3.8-flash | 1/1 | 29.788 | 29.788–29.788 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-first / google/gemini-3.8-flash | 1 | True | 30.079 | 2.668 | 27.921 | 0.875 | 19 / 1 | 0.149043228 |
| 2 | google-flights | ultrafast / google/gemini-3.8-flash | 1 | True | 8.806 | 3.565 | 1.639 | 5.668 | 2 / 17 | 0.004371846 |
| 3 | google-flights | browser-use / google/gemini-3.8-flash | 1 | True | 29.788 | 3.249 | 16.198 | 0.000 | 10 / 0 | 0.043280250 |

### diagnostics.json.gz: pilot-search.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 3 records · 2 recorded successes · known cost $0.007079160.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-first / google/gemini-3.8-flash | 1/1 | 3.381 | 3.381–3.381 |
| search / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |
| search / browser-use / google/gemini-3.8-flash | 1/1 | 5.961 | 5.961–5.961 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-first / google/gemini-3.8-flash | 1 | True | 3.381 | 0.398 | 2.033 | 1.207 | 2 / 3 | 0.004007910 |
| 2 | search | ultrafast / google/gemini-3.8-flash | 1 | False | — | 1.144 | — | — | — / — | 0.000000000 |
| 3 | search | browser-use / google/gemini-3.8-flash | 1 | True | 5.961 | 2.987 | 4.277 | 0.000 | 2 / 0 | 0.003071250 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 2:

```json
{
  "error": "fatal: AF_UNIX path too long"
}
```


### diagnostics.json.gz: pilot-ultrafast-search.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000476190.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | ultrafast / google/gemini-3.8-flash | 1 | False | 2.305 | 1.002 | 1.061 | 1.157 | 1 / 3 | 0.000476190 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "done",
  "error": "Open an HTTP or HTTPS page before reading"
}
```


### diagnostics.json.gz: pilot-ultrafast-v2.json

[poc/pilot: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 2 records · 1 recorded successes · known cost $0.000476190.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / ultrafast / google/gemini-3.8-flash | 1/1 | 2.492 | 2.492–2.492 |
| google-flights / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | ultrafast / google/gemini-3.8-flash | 1 | True | 2.492 | 0.709 | 1.104 | 1.281 | 1 / 3 | 0.000476190 |
| 2 | google-flights | ultrafast / google/gemini-3.8-flash | 1 | False | — | 0.928 | — | — | — / — | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 2:

```json
{
  "error": "page.waitForURL: net::ERR_ABORTED; maybe frame was detached?\n=========================== logs ===========================\nwaiting for navigation to \"https://www.google.com/travel/flights**\" until \"domcontentloaded\"\n============================================================"
}
```


### diagnostics.json.gz: stop-app-first.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / app-first / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | app-first / google/gemini-3.8-flash | 1 | False | 0.356 | 0.325 | 0.354 | 0.000 | 1 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "stopped",
  "endReason": "benchmark_stop",
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "stopMs": 16.912213000000065
}
```


### diagnostics.json.gz: stop-browser-use.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / browser-use / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | False | 0.440 | 1.796 | 0.000 | 0.000 | 0 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "error",
  "error": "Cannot read properties of undefined (reading 'evaluate')",
  "browserStopMs": 143.07932800000026,
  "stopMs": 431.8155490000004
}
```


### diagnostics.json.gz: stop-final-app-first.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / app-first / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | app-first / google/gemini-3.8-flash | 1 | False | 0.355 | 0.352 | 0.353 | 0.000 | 1 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "stopped",
  "endReason": "benchmark_stop",
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "browserStopMs": 962.7028049999999,
  "stopMs": 968.4257469999998
}
```


### diagnostics.json.gz: stop-final-browser-use.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / browser-use / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | False | 0.435 | 1.492 | 0.000 | 0.000 | 0 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "error",
  "error": "Cannot read properties of undefined (reading 'screenshot')",
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "browserStopMs": 145.52122999999983,
  "stopMs": 377.9116640000002
}
```


### diagnostics.json.gz: stop-final-ultrafast.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | ultrafast / google/gemini-3.8-flash | 1 | False | 0.352 | 0.708 | 0.000 | 0.000 | 0 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "ready",
  "error": "stopped",
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "browserStopMs": 150.011892,
  "stopMs": 2086.273222
}
```


### diagnostics.json.gz: stop-ultrafast.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / ultrafast / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | ultrafast / google/gemini-3.8-flash | 1 | False | 0.353 | 0.979 | 0.000 | 0.000 | 0 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "ready",
  "error": "stopped",
  "verification": {
    "passed": false,
    "checks": {
      "count": false,
      "values": false
    },
    "records": []
  },
  "browserStopMs": 328.32058500000016,
  "stopMs": 2098.9013920000007
}
```


### diagnostics.json.gz: stop-verified-browser-use.json

[poc/stop: canonical source](../../docs/benchmarks/browser-poc/results/diagnostics.json.gz) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-6 / browser-use / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | False | 0.423 | 1.772 | 0.000 | 0.000 | 0 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "browserStopMs": 148.9672660000001,
  "stopMs": 369.39099399999986
}
```


### credit-recheck-1.json

[auto/credit-check: canonical source](../../docs/benchmarks/jev-auto/credit-recheck-1.json) · 1 records · 0 recorded successes · known cost $0.000000000.

File SHA-256: `8cf841f6c03463397794928aa05e1fcb6a30d70c1d94ef1adc783ae5930226ca`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-auto / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-auto / google/gemini-3.8-flash | 1 | False | 0.459 | 0.426 | 0.449 | 0.000 | 1 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Search results for blue notebook: Blue Notebook, 12 EUR"
  },
  "jevErrors": []
}
```


### decisions-final-heldout.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-final-heldout.json) · 6 records · 6 recorded successes · known cost $0.009402750.

File SHA-256: `40d5cfbd0f0a05695cf0b7f50cf4646c57f3e22eb575cf2c273c693349b17238`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | italian-city | fast | fast | True | 1.245 | 0.001599 |  |
| 2 | inventory | fast | fast | True | 1.464 | 0.001605 |  |
| 3 | lease-cost | planned | planned | True | 1.007 | 0.001539 |  |
| 4 | multi-page | planned | planned | True | 0.974 | 0.00147 |  |
| 5 | registration-wizard | planned | planned | True | 1.098 | 0.00153975 |  |
| 6 | missing-card | planned | planned | True | 1.099 | 0.00165 |  |

### decisions-pilot-1.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-pilot-1.json) · 16 records · 12 recorded successes · known cost $0.023631750.

File SHA-256: `6d313a44e6d3776bb671ef1960e16d4b9559c8a3211ef60c3d2e12fab01b70b8`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | search | fast | fast | True | 1.464 | 0.00158625 |  |
| 2 | filters | fast | planned | False | 1.007 | 0.001371 |  |
| 3 | autocomplete | fast | planned | False | 1.093 | 0.00134625 |  |
| 4 | flights | fast | planned | False | 2.338 | 0.00138825 |  |
| 5 | polish-search | fast | fast | True | 1.221 | 0.0016425 |  |
| 6 | new-tab | fast | planned | False | 0.888 | 0.00136875 |  |
| 7 | hotel | planned | planned | True | 0.787 | 0.0013845 |  |
| 8 | research | planned | planned | True | 1.291 | 0.00138375 |  |
| 9 | polish-analysis | planned | planned | True | 1.057 | 0.0013845 |  |
| 10 | missing-values | planned | planned | True | 1.069 | 0.00173175 |  |
| 11 | article | planned | planned | True | 2.496 | 0.001347 |  |
| 12 | mixed | planned | planned | True | 1.014 | 0.001377 |  |
| 13 | wizard | planned | planned | True | 0.814 | 0.00139575 |  |
| 14 | form | planned | planned | True | 0.907 | 0.00167175 |  |
| 15 | form-polish | planned | planned | True | 1.129 | 0.0018705 |  |
| 16 | cycle-recovery | planned | planned | True | 0.786 | 0.00138225 |  |

### decisions-pilot-2.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-pilot-2.json) · 16 records · 15 recorded successes · known cost $0.025827000.

File SHA-256: `1dd5c9a7423074cd6ae04ba9eee3b37b21cb12208eb5b8581dfd662ebdd2a067`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | search | fast | fast | True | 1.391 | 0.0016365 |  |
| 2 | filters | fast | fast | True | 0.973 | 0.00148875 |  |
| 3 | autocomplete | fast | fast | True | 1.022 | 0.00152775 |  |
| 4 | flights | fast | fast | True | 1.311 | 0.00198975 |  |
| 5 | polish-search | fast | fast | True | 0.938 | 0.001674 |  |
| 6 | new-tab | fast | fast | True | 1.466 | 0.00149025 |  |
| 7 | hotel | planned | planned | True | 0.913 | 0.00142725 |  |
| 8 | research | planned | planned | True | 2.405 | 0.0014265 |  |
| 9 | polish-analysis | planned | planned | True | 1.052 | 0.00142725 |  |
| 10 | missing-values | planned | planned | True | 1.084 | 0.00156075 |  |
| 11 | article | planned | planned | True | 1.059 | 0.00141225 |  |
| 12 | mixed | planned | planned | True | 1.016 | 0.00141975 |  |
| 13 | wizard | planned | fast | False | 1.623 | 0.00229725 |  |
| 14 | form | planned | planned | True | 0.980 | 0.00171825 |  |
| 15 | form-polish | planned | planned | True | 1.083 | 0.00190575 |  |
| 16 | cycle-recovery | planned | planned | True | 0.947 | 0.001425 |  |

### decisions-pilot-3.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-pilot-3.json) · 16 records · 16 recorded successes · known cost $0.025509000.

File SHA-256: `b5d513956f3e5b028b06994d9dc39b58d595f8015214b3389f15fc9e85c996d9`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | search | fast | fast | True | 1.153 | 0.0016185 |  |
| 2 | filters | fast | fast | True | 1.167 | 0.001572 |  |
| 3 | autocomplete | fast | fast | True | 1.153 | 0.00156225 |  |
| 4 | flights | fast | fast | True | 2.417 | 0.00200175 |  |
| 5 | polish-search | fast | fast | True | 1.146 | 0.001716 |  |
| 6 | new-tab | fast | fast | True | 7.578 | 0.0015435 |  |
| 7 | hotel | planned | planned | True | 1.018 | 0.00146175 |  |
| 8 | research | planned | planned | True | 1.031 | 0.001461 |  |
| 9 | polish-analysis | planned | planned | True | 1.079 | 0.0014655 |  |
| 10 | missing-values | planned | planned | True | 1.165 | 0.0015015 |  |
| 11 | article | planned | planned | True | 1.174 | 0.00144675 |  |
| 12 | mixed | planned | planned | True | 1.012 | 0.0015255 |  |
| 13 | wizard | planned | planned | True | 2.345 | 0.001533 |  |
| 14 | form | planned | planned | True | 2.359 | 0.001749 |  |
| 15 | form-polish | planned | planned | True | 1.139 | 0.0018915 |  |
| 16 | cycle-recovery | planned | planned | True | 1.293 | 0.0014595 |  |

### decisions-post-schema-heldout.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-post-schema-heldout.json) · 6 records · 6 recorded successes · known cost $0.009306000.

File SHA-256: `45cd7193dd7fc645a262f684813517ffe4562e199bb1d9348577153b33ceca57`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | italian-city | fast | fast | True | 2.996 | 0.00162225 |  |
| 2 | inventory | fast | fast | True | 2.048 | 0.00159075 |  |
| 3 | lease-cost | planned | planned | True | 4.084 | 0.001476 |  |
| 4 | multi-page | planned | planned | True | 1.101 | 0.001467 |  |
| 5 | registration-wizard | planned | planned | True | 0.879 | 0.001533 |  |
| 6 | missing-card | planned | planned | True | 1.096 | 0.001617 |  |

### decisions-post-schema-retry.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-post-schema-retry.json) · 2 records · 2 recorded successes · known cost $0.003715500.

File SHA-256: `cff2e40f026a8df0a25e7df232565d030edc42fe6c8bf10c8d2b1d55e1330f9a`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | form | planned | planned | True | 1.185 | 0.001794 |  |
| 2 | form-polish | planned | planned | True | 1.106 | 0.0019215 |  |

### decisions-post-schema.json

[auto/routing: canonical source](../../docs/benchmarks/jev-auto/decisions-post-schema.json) · 16 records · 13 recorded successes · known cost $0.021797250.

File SHA-256: `912f22cf330701012673a1fd346881db2b69e7f8c69e9f102ee355b97bdf0221`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Category check only: no browser actions are executed.

| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| 1 | search | fast | fast | True | 1.327 | 0.001656 |  |
| 2 | filters | fast | fast | True | 1.744 | 0.00158325 |  |
| 3 | autocomplete | fast | fast | True | 0.968 | 0.00156975 |  |
| 4 | flights | fast | fast | True | 1.139 | 0.00187425 |  |
| 5 | polish-search | fast | fast | True | 1.099 | 0.00171225 |  |
| 6 | new-tab | fast | planned | False | 1.791 | 0.001446 |  |
| 7 | hotel | planned | planned | True | 0.939 | 0.0014805 |  |
| 8 | research | planned | planned | True | 1.092 | 0.00147975 |  |
| 9 | polish-analysis | planned | planned | True | 0.885 | 0.00148425 |  |
| 10 | missing-values | planned | planned | True | 1.022 | 0.001539 |  |
| 11 | article | planned | planned | True | 1.309 | 0.0014655 |  |
| 12 | mixed | planned | planned | True | 2.553 | 0.001473 |  |
| 13 | wizard | planned | planned | True | 0.994 | 0.0015555 |  |
| 14 | form | planned | — | False | 1.292 | — | OpenRouter failed after 2 attempts: HTTP 429 |
| 15 | form-polish | planned | — | False | 1.104 | — | OpenRouter failed after 2 attempts: HTTP 429 |
| 16 | cycle-recovery | planned | planned | True | 2.192 | 0.00147825 |  |

### final-flights.json

[auto/final-file: canonical source](../../docs/benchmarks/jev-auto/final-flights.json) · 20 records · 20 recorded successes · known cost $1.364957661.

File SHA-256: `ef4e7c654ad329b1e9c781bb8c530be32fbcc4ee9c4ac7110c55a6ac7af8c374`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 5/5 | 21.786 | 17.827–64.024 |
| google-flights / app-first / google/gemini-3.8-flash | 5/5 | 36.823 | 27.199–45.176 |
| google-flights / ultrafast / google/gemini-3.8-flash | 5/5 | 13.324 | 11.705–14.384 |
| google-flights / browser-use / google/gemini-3.8-flash | 5/5 | 35.448 | 35.143–39.086 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 64.024 | 3.045 | 59.282 | 1.775 | 26 / 3 | 0.224887743 |
| 2 | google-flights | app-first / google/gemini-3.8-flash | 1 | True | 27.199 | 2.969 | 23.146 | 2.477 | 15 / 3 | 0.117888051 |
| 3 | google-flights | ultrafast / google/gemini-3.8-flash | 1 | True | 13.324 | 3.649 | 2.018 | 9.119 | 2 / 19 | 0.005258970 |
| 4 | google-flights | browser-use / google/gemini-3.8-flash | 1 | True | 39.086 | 4.087 | 20.761 | 0.000 | 12 / 0 | 0.047603250 |
| 5 | google-flights | app-first / google/gemini-3.8-flash | 2 | True | 45.176 | 3.240 | 41.389 | 1.207 | 20 / 1 | 0.155894775 |
| 6 | google-flights | ultrafast / google/gemini-3.8-flash | 2 | True | 14.384 | 3.809 | 1.925 | 10.233 | 2 / 19 | 0.005139480 |
| 7 | google-flights | browser-use / google/gemini-3.8-flash | 2 | True | 35.448 | 5.427 | 18.051 | 0.000 | 11 / 0 | 0.043342350 |
| 8 | google-flights | app-auto / google/gemini-3.8-flash | 2 | True | 26.709 | 3.302 | 12.077 | 9.015 | 5 / 15 | 0.047684376 |
| 9 | google-flights | ultrafast / google/gemini-3.8-flash | 3 | True | 13.652 | 4.120 | 3.576 | 7.965 | 2 / 16 | 0.004163526 |
| 10 | google-flights | browser-use / google/gemini-3.8-flash | 3 | True | 35.143 | 5.153 | 18.502 | 0.000 | 11 / 0 | 0.045314250 |
| 11 | google-flights | app-auto / google/gemini-3.8-flash | 3 | True | 20.184 | 3.359 | 4.047 | 12.823 | 2 / 19 | 0.017910936 |
| 12 | google-flights | app-first / google/gemini-3.8-flash | 3 | True | 35.806 | 3.398 | 33.260 | 0.914 | 19 / 1 | 0.157690878 |
| 13 | google-flights | browser-use / google/gemini-3.8-flash | 4 | True | 35.433 | 5.328 | 18.858 | 0.000 | 11 / 0 | 0.043614225 |
| 14 | google-flights | app-auto / google/gemini-3.8-flash | 4 | True | 21.786 | 3.329 | 8.216 | 10.701 | 6 / 16 | 0.051691521 |
| 15 | google-flights | app-first / google/gemini-3.8-flash | 4 | True | 36.823 | 3.183 | 31.024 | 1.122 | 18 / 1 | 0.139615836 |
| 16 | google-flights | ultrafast / google/gemini-3.8-flash | 4 | True | 13.183 | 3.684 | 2.718 | 8.024 | 2 / 19 | 0.005028180 |
| 17 | google-flights | app-auto / google/gemini-3.8-flash | 5 | True | 17.827 | 2.815 | 5.386 | 8.966 | 2 / 19 | 0.017792670 |
| 18 | google-flights | app-first / google/gemini-3.8-flash | 5 | True | 43.246 | 3.421 | 37.459 | 0.915 | 24 / 1 | 0.183568464 |
| 19 | google-flights | ultrafast / google/gemini-3.8-flash | 5 | True | 11.705 | 4.001 | 2.143 | 7.845 | 2 / 17 | 0.004476930 |
| 20 | google-flights | browser-use / google/gemini-3.8-flash | 5 | True | 37.558 | 4.104 | 19.297 | 0.000 | 12 / 0 | 0.046391250 |

### final-holdout.json

[auto/final-file: canonical source](../../docs/benchmarks/jev-auto/final-holdout.json) · 27 records · 27 recorded successes · known cost $0.311199648.

File SHA-256: `97bc82a94cb856a07ac3cf1b600991f9897598baf5b179a999f6273f34e32f39`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| wizard-4-new / app-auto / google/gemini-3.8-flash | 3/3 | 10.288 | 8.942–13.430 |
| wizard-4-new / app-first / google/gemini-3.8-flash | 3/3 | 14.765 | 14.163–21.822 |
| wizard-4-new / browser-use / google/gemini-3.8-flash | 3/3 | 15.007 | 14.786–17.319 |
| compare-new / app-first / google/gemini-3.8-flash | 3/3 | 8.266 | 7.968–11.406 |
| compare-new / browser-use / google/gemini-3.8-flash | 3/3 | 12.929 | 12.498–13.419 |
| compare-new / app-auto / google/gemini-3.8-flash | 3/3 | 3.992 | 3.871–6.222 |
| autocomplete-new / browser-use / google/gemini-3.8-flash | 3/3 | 12.845 | 8.264–20.149 |
| autocomplete-new / app-auto / google/gemini-3.8-flash | 3/3 | 4.759 | 4.693–8.393 |
| autocomplete-new / app-first / google/gemini-3.8-flash | 3/3 | 4.909 | 4.623–5.056 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | wizard-4-new | app-auto / google/gemini-3.8-flash | 1 | True | 10.288 | 0.440 | 9.704 | 0.000 | 6 / 0 | 0.017769750 |
| 2 | wizard-4-new | app-first / google/gemini-3.8-flash | 1 | True | 14.163 | 0.422 | 6.866 | 6.804 | 2 / 17 | 0.006948078 |
| 3 | wizard-4-new | browser-use / google/gemini-3.8-flash | 1 | True | 15.007 | 2.117 | 8.707 | 0.000 | 5 / 0 | 0.007622250 |
| 4 | wizard-4-new | app-first / google/gemini-3.8-flash | 2 | True | 21.822 | 0.401 | 16.551 | 4.808 | 9 / 10 | 0.032372964 |
| 5 | wizard-4-new | browser-use / google/gemini-3.8-flash | 2 | True | 17.319 | 2.114 | 11.093 | 0.000 | 5 / 0 | 0.008051250 |
| 6 | wizard-4-new | app-auto / google/gemini-3.8-flash | 2 | True | 8.942 | 0.389 | 8.380 | 0.000 | 6 / 0 | 0.017925750 |
| 7 | wizard-4-new | browser-use / google/gemini-3.8-flash | 3 | True | 14.786 | 2.129 | 8.604 | 0.000 | 5 / 0 | 0.007497750 |
| 8 | wizard-4-new | app-auto / google/gemini-3.8-flash | 3 | True | 13.430 | 0.402 | 12.897 | 0.000 | 6 / 0 | 0.017927250 |
| 9 | wizard-4-new | app-first / google/gemini-3.8-flash | 3 | True | 14.765 | 0.399 | 9.138 | 5.105 | 6 / 13 | 0.019153770 |
| 10 | compare-new | app-first / google/gemini-3.8-flash | 1 | True | 8.266 | 0.385 | 6.581 | 1.516 | 5 / 1 | 0.014829810 |
| 11 | compare-new | browser-use / google/gemini-3.8-flash | 1 | True | 13.419 | 2.131 | 11.403 | 0.000 | 3 / 0 | 0.024882750 |
| 12 | compare-new | app-auto / google/gemini-3.8-flash | 1 | True | 6.222 | 0.433 | 6.049 | 0.000 | 4 / 0 | 0.009099750 |
| 13 | compare-new | browser-use / google/gemini-3.8-flash | 2 | True | 12.929 | 2.508 | 11.014 | 0.000 | 3 / 0 | 0.022956750 |
| 14 | compare-new | app-auto / google/gemini-3.8-flash | 2 | True | 3.992 | 0.413 | 3.820 | 0.000 | 3 / 0 | 0.007560750 |
| 15 | compare-new | app-first / google/gemini-3.8-flash | 2 | True | 11.406 | 0.412 | 9.913 | 1.288 | 4 / 3 | 0.010892442 |
| 16 | compare-new | app-auto / google/gemini-3.8-flash | 3 | True | 3.871 | 0.391 | 3.714 | 0.000 | 3 / 0 | 0.007344750 |
| 17 | compare-new | app-first / google/gemini-3.8-flash | 3 | True | 7.968 | 0.397 | 7.143 | 0.645 | 5 / 0 | 0.014286750 |
| 18 | compare-new | browser-use / google/gemini-3.8-flash | 3 | True | 12.498 | 1.979 | 10.578 | 0.000 | 3 / 0 | 0.022687500 |
| 19 | autocomplete-new | browser-use / google/gemini-3.8-flash | 1 | True | 20.149 | 2.098 | 17.439 | 0.000 | 4 / 0 | 0.004816500 |
| 20 | autocomplete-new | app-auto / google/gemini-3.8-flash | 1 | True | 4.759 | 0.379 | 2.259 | 1.854 | 2 / 4 | 0.003954336 |
| 21 | autocomplete-new | app-first / google/gemini-3.8-flash | 1 | True | 4.909 | 0.392 | 2.931 | 1.518 | 2 / 4 | 0.004054686 |
| 22 | autocomplete-new | app-auto / google/gemini-3.8-flash | 2 | True | 8.393 | 0.414 | 5.568 | 2.177 | 2 / 4 | 0.003961590 |
| 23 | autocomplete-new | app-first / google/gemini-3.8-flash | 2 | True | 5.056 | 0.380 | 2.422 | 2.155 | 2 / 4 | 0.004131258 |
| 24 | autocomplete-new | browser-use / google/gemini-3.8-flash | 2 | True | 8.264 | 2.014 | 6.488 | 0.000 | 4 / 0 | 0.005223750 |
| 25 | autocomplete-new | app-first / google/gemini-3.8-flash | 3 | True | 4.623 | 0.386 | 3.472 | 1.004 | 3 / 2 | 0.006284628 |
| 26 | autocomplete-new | browser-use / google/gemini-3.8-flash | 3 | True | 12.845 | 1.993 | 10.068 | 0.000 | 4 / 0 | 0.005011500 |
| 27 | autocomplete-new | app-auto / google/gemini-3.8-flash | 3 | True | 4.693 | 0.382 | 2.389 | 1.669 | 2 / 4 | 0.003951336 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 17:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "passed": true,
    "saved": {
      "hotel": "Doria",
      "total": "392"
    }
  },
  "jevErrors": [
    {
      "reason": "invalid_response",
      "elapsedMs": 645.1430540000147,
      "parentCallId": "call_285116"
    }
  ]
}
```


### final-local.json

[auto/final-file: canonical source](../../docs/benchmarks/jev-auto/final-local.json) · 72 records · 58 recorded successes · known cost $1.798193052.

File SHA-256: `f0ae104efac5a3265d7e642869e869152de6db20d1c208a2893a1bda1da9bd50`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-auto / google/gemini-3.8-flash | 3/3 | 4.638 | 4.164–4.725 |
| search / app-first / google/gemini-3.8-flash | 3/3 | 5.226 | 4.382–5.941 |
| search / browser-use / google/gemini-3.8-flash | 3/3 | 6.683 | 4.852–7.339 |
| filters / app-first / google/gemini-3.8-flash | 3/3 | 3.841 | 3.687–4.965 |
| filters / browser-use / google/gemini-3.8-flash | 3/3 | 6.066 | 5.447–9.350 |
| filters / app-auto / google/gemini-3.8-flash | 3/3 | 4.983 | 4.797–5.508 |
| autocomplete / browser-use / google/gemini-3.8-flash | 3/3 | 9.432 | 8.094–9.523 |
| autocomplete / app-auto / google/gemini-3.8-flash | 3/3 | 8.722 | 4.517–10.606 |
| autocomplete / app-first / google/gemini-3.8-flash | 3/3 | 4.613 | 4.196–6.047 |
| wizard-6 / app-auto / google/gemini-3.8-flash | 3/3 | 13.349 | 11.270–21.559 |
| wizard-6 / app-first / google/gemini-3.8-flash | 3/3 | 30.078 | 24.509–44.818 |
| wizard-6 / browser-use / google/gemini-3.8-flash | 3/3 | 24.283 | 21.408–26.619 |
| wizard-10 / app-first / google/gemini-3.8-flash | 3/3 | 74.486 | 60.363–78.164 |
| wizard-10 / browser-use / google/gemini-3.8-flash | 3/3 | 40.214 | 36.395–47.797 |
| wizard-10 / app-auto / google/gemini-3.8-flash | 3/3 | 26.139 | 24.795–26.787 |
| compare-offers / browser-use / google/gemini-3.8-flash | 3/3 | 8.993 | 8.168–13.533 |
| compare-offers / app-auto / google/gemini-3.8-flash | 3/3 | 4.714 | 4.585–6.086 |
| compare-offers / app-first / google/gemini-3.8-flash | 3/3 | 12.262 | 11.503–14.181 |
| research-offers / app-auto / google/gemini-3.8-flash | 1/3 | 17.090 | 17.090–17.090 |
| research-offers / app-first / google/gemini-3.8-flash | 2/3 | 15.316 | 14.824–15.807 |
| research-offers / browser-use / google/gemini-3.8-flash | 1/3 | 31.159 | 31.159–31.159 |
| tabs / app-first / google/gemini-3.8-flash | 0/3 | — | — |
| tabs / browser-use / google/gemini-3.8-flash | 0/3 | — | — |
| tabs / app-auto / google/gemini-3.8-flash | 0/3 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-auto / google/gemini-3.8-flash | 1 | True | 4.164 | 0.447 | 2.157 | 1.645 | 2 / 3 | 0.003937734 |
| 2 | search | app-first / google/gemini-3.8-flash | 1 | True | 5.941 | 0.413 | 3.914 | 1.850 | 2 / 3 | 0.003989148 |
| 3 | search | browser-use / google/gemini-3.8-flash | 1 | True | 4.852 | 2.114 | 3.077 | 0.000 | 2 / 0 | 0.002577000 |
| 4 | search | app-first / google/gemini-3.8-flash | 2 | True | 4.382 | 0.387 | 2.312 | 1.908 | 2 / 3 | 0.004266666 |
| 5 | search | browser-use / google/gemini-3.8-flash | 2 | True | 7.339 | 1.994 | 5.595 | 0.000 | 3 / 0 | 0.004485000 |
| 6 | search | app-auto / google/gemini-3.8-flash | 2 | True | 4.638 | 0.405 | 2.858 | 1.443 | 2 / 3 | 0.003938484 |
| 7 | search | browser-use / google/gemini-3.8-flash | 3 | True | 6.683 | 2.035 | 4.737 | 0.000 | 2 / 0 | 0.003057750 |
| 8 | search | app-auto / google/gemini-3.8-flash | 3 | True | 4.725 | 0.419 | 2.157 | 2.233 | 2 / 3 | 0.003943734 |
| 9 | search | app-first / google/gemini-3.8-flash | 3 | True | 5.226 | 0.383 | 3.221 | 1.851 | 2 / 3 | 0.004898316 |
| 10 | filters | app-first / google/gemini-3.8-flash | 1 | True | 3.687 | 0.385 | 2.157 | 1.335 | 2 / 4 | 0.004091622 |
| 11 | filters | browser-use / google/gemini-3.8-flash | 1 | True | 6.066 | 2.019 | 3.571 | 0.000 | 2 / 0 | 0.002982750 |
| 12 | filters | app-auto / google/gemini-3.8-flash | 1 | True | 5.508 | 0.391 | 3.223 | 1.755 | 2 / 4 | 0.004055922 |
| 13 | filters | browser-use / google/gemini-3.8-flash | 2 | True | 5.447 | 1.997 | 3.003 | 0.000 | 2 / 0 | 0.002469000 |
| 14 | filters | app-auto / google/gemini-3.8-flash | 2 | True | 4.797 | 0.416 | 2.767 | 1.765 | 2 / 4 | 0.004062672 |
| 15 | filters | app-first / google/gemini-3.8-flash | 2 | True | 4.965 | 0.397 | 3.278 | 1.485 | 2 / 4 | 0.004143372 |
| 16 | filters | app-auto / google/gemini-3.8-flash | 3 | True | 4.983 | 0.398 | 2.846 | 1.871 | 2 / 4 | 0.004152180 |
| 17 | filters | app-first / google/gemini-3.8-flash | 3 | True | 3.841 | 0.404 | 2.303 | 1.335 | 2 / 4 | 0.004093872 |
| 18 | filters | browser-use / google/gemini-3.8-flash | 3 | True | 9.350 | 2.023 | 6.886 | 0.000 | 2 / 0 | 0.002705250 |
| 19 | autocomplete | browser-use / google/gemini-3.8-flash | 1 | True | 9.523 | 2.075 | 7.793 | 0.000 | 4 / 0 | 0.004930500 |
| 20 | autocomplete | app-auto / google/gemini-3.8-flash | 1 | True | 10.606 | 0.405 | 8.168 | 1.794 | 2 / 4 | 0.003946422 |
| 21 | autocomplete | app-first / google/gemini-3.8-flash | 1 | True | 6.047 | 0.408 | 4.645 | 1.219 | 3 / 2 | 0.006302592 |
| 22 | autocomplete | app-auto / google/gemini-3.8-flash | 2 | True | 4.517 | 0.404 | 2.273 | 1.603 | 2 / 4 | 0.003942918 |
| 23 | autocomplete | app-first / google/gemini-3.8-flash | 2 | True | 4.196 | 0.380 | 2.384 | 1.329 | 2 / 4 | 0.004074300 |
| 24 | autocomplete | browser-use / google/gemini-3.8-flash | 2 | True | 8.094 | 2.029 | 6.364 | 0.000 | 4 / 0 | 0.004545000 |
| 25 | autocomplete | app-first / google/gemini-3.8-flash | 3 | True | 4.613 | 0.399 | 2.308 | 1.849 | 2 / 4 | 0.004015002 |
| 26 | autocomplete | browser-use / google/gemini-3.8-flash | 3 | True | 9.432 | 2.034 | 7.616 | 0.000 | 4 / 0 | 0.004641000 |
| 27 | autocomplete | app-auto / google/gemini-3.8-flash | 3 | True | 8.722 | 0.393 | 6.518 | 1.552 | 2 / 4 | 0.003964434 |
| 28 | wizard-6 | app-auto / google/gemini-3.8-flash | 1 | True | 13.349 | 0.401 | 12.552 | 0.000 | 8 / 0 | 0.027759750 |
| 29 | wizard-6 | app-first / google/gemini-3.8-flash | 1 | True | 24.509 | 0.392 | 18.545 | 5.247 | 13 / 14 | 0.054730740 |
| 30 | wizard-6 | browser-use / google/gemini-3.8-flash | 1 | True | 24.283 | 2.112 | 15.350 | 0.000 | 7 / 0 | 0.011786250 |
| 31 | wizard-6 | app-first / google/gemini-3.8-flash | 2 | True | 30.078 | 0.404 | 23.363 | 6.016 | 14 / 13 | 0.061246086 |
| 32 | wizard-6 | browser-use / google/gemini-3.8-flash | 2 | True | 26.619 | 2.103 | 17.723 | 0.000 | 7 / 0 | 0.011757750 |
| 33 | wizard-6 | app-auto / google/gemini-3.8-flash | 2 | True | 21.559 | 0.382 | 20.793 | 0.000 | 8 / 0 | 0.027564000 |
| 34 | wizard-6 | browser-use / google/gemini-3.8-flash | 3 | True | 21.408 | 2.032 | 12.448 | 0.000 | 7 / 0 | 0.011227500 |
| 35 | wizard-6 | app-auto / google/gemini-3.8-flash | 3 | True | 11.270 | 0.404 | 10.488 | 0.000 | 8 / 0 | 0.027576750 |
| 36 | wizard-6 | app-first / google/gemini-3.8-flash | 3 | True | 44.818 | 0.399 | 43.059 | 1.025 | 26 / 1 | 0.172760895 |
| 37 | wizard-10 | app-first / google/gemini-3.8-flash | 1 | True | 60.363 | 0.399 | 58.198 | 1.023 | 42 / 1 | 0.256965999 |
| 38 | wizard-10 | browser-use / google/gemini-3.8-flash | 1 | True | 40.214 | 2.117 | 25.654 | 0.000 | 11 / 0 | 0.020710500 |
| 39 | wizard-10 | app-auto / google/gemini-3.8-flash | 1 | True | 26.139 | 0.395 | 24.895 | 0.000 | 12 / 0 | 0.051791250 |
| 40 | wizard-10 | browser-use / google/gemini-3.8-flash | 2 | True | 47.797 | 2.115 | 33.273 | 0.000 | 11 / 0 | 0.020475750 |
| 41 | wizard-10 | app-auto / google/gemini-3.8-flash | 2 | True | 26.787 | 0.387 | 25.518 | 0.000 | 12 / 0 | 0.052034250 |
| 42 | wizard-10 | app-first / google/gemini-3.8-flash | 2 | True | 74.486 | 0.397 | 72.069 | 1.225 | 42 / 1 | 0.261910956 |
| 43 | wizard-10 | app-auto / google/gemini-3.8-flash | 3 | True | 24.795 | 0.409 | 23.513 | 0.000 | 12 / 0 | 0.049182900 |
| 44 | wizard-10 | app-first / google/gemini-3.8-flash | 3 | True | 78.164 | 0.385 | 76.278 | 0.688 | 44 / 1 | 0.274408401 |
| 45 | wizard-10 | browser-use / google/gemini-3.8-flash | 3 | True | 36.395 | 2.129 | 21.730 | 0.000 | 11 / 0 | 0.022101000 |
| 46 | compare-offers | browser-use / google/gemini-3.8-flash | 1 | True | 13.533 | 2.128 | 11.712 | 0.000 | 2 / 0 | 0.017121000 |
| 47 | compare-offers | app-auto / google/gemini-3.8-flash | 1 | True | 4.714 | 0.405 | 4.555 | 0.000 | 3 / 0 | 0.007446750 |
| 48 | compare-offers | app-first / google/gemini-3.8-flash | 1 | True | 14.181 | 0.399 | 12.241 | 1.715 | 5 / 4 | 0.014436480 |
| 49 | compare-offers | app-auto / google/gemini-3.8-flash | 2 | True | 4.585 | 0.417 | 4.427 | 0.000 | 3 / 0 | 0.007362000 |
| 50 | compare-offers | app-first / google/gemini-3.8-flash | 2 | True | 11.503 | 0.394 | 10.200 | 1.112 | 6 / 2 | 0.016199730 |
| 51 | compare-offers | browser-use / google/gemini-3.8-flash | 2 | True | 8.993 | 2.020 | 7.254 | 0.000 | 2 / 0 | 0.014877000 |
| 52 | compare-offers | app-first / google/gemini-3.8-flash | 3 | True | 12.262 | 0.394 | 11.256 | 0.818 | 6 / 1 | 0.017059134 |
| 53 | compare-offers | browser-use / google/gemini-3.8-flash | 3 | True | 8.168 | 2.034 | 6.361 | 0.000 | 2 / 0 | 0.015078750 |
| 54 | compare-offers | app-auto / google/gemini-3.8-flash | 3 | True | 6.086 | 0.377 | 5.929 | 0.000 | 3 / 0 | 0.007407000 |
| 55 | research-offers | app-auto / google/gemini-3.8-flash | 1 | True | 17.090 | 0.405 | 16.250 | 0.000 | 9 / 0 | 0.033310500 |
| 56 | research-offers | app-first / google/gemini-3.8-flash | 1 | True | 14.824 | 0.395 | 13.086 | 1.197 | 9 / 2 | 0.034102908 |
| 57 | research-offers | browser-use / google/gemini-3.8-flash | 1 | True | 31.159 | 2.004 | 24.236 | 0.000 | 8 / 0 | 0.050450625 |
| 58 | research-offers | app-first / google/gemini-3.8-flash | 2 | True | 15.807 | 0.411 | 13.677 | 1.389 | 10 / 2 | 0.039137808 |
| 59 | research-offers | browser-use / google/gemini-3.8-flash | 2 | False | 1.500 | 1.994 | 0.600 | 0.000 | 4 / 0 | 0.000000000 |
| 60 | research-offers | app-auto / google/gemini-3.8-flash | 2 | False | 0.198 | 0.405 | 0.194 | 0.000 | 1 / 0 | 0.000000000 |
| 61 | research-offers | browser-use / google/gemini-3.8-flash | 3 | False | 1.584 | 1.998 | 0.565 | 0.000 | 4 / 0 | 0.000000000 |
| 62 | research-offers | app-auto / google/gemini-3.8-flash | 3 | False | 0.164 | 0.389 | 0.160 | 0.000 | 1 / 0 | 0.000000000 |
| 63 | research-offers | app-first / google/gemini-3.8-flash | 3 | False | 0.138 | 0.397 | 0.134 | 0.000 | 1 / 0 | 0.000000000 |
| 64 | tabs | app-first / google/gemini-3.8-flash | 1 | False | 0.087 | 0.395 | 0.082 | 0.000 | 1 / 0 | 0.000000000 |
| 65 | tabs | browser-use / google/gemini-3.8-flash | 1 | False | 1.420 | 1.972 | 0.449 | 0.000 | 4 / 0 | 0.000000000 |
| 66 | tabs | app-auto / google/gemini-3.8-flash | 1 | False | 0.166 | 0.393 | 0.160 | 0.000 | 1 / 0 | 0.000000000 |
| 67 | tabs | browser-use / google/gemini-3.8-flash | 2 | False | 1.215 | 1.998 | 0.403 | 0.000 | 4 / 0 | 0.000000000 |
| 68 | tabs | app-auto / google/gemini-3.8-flash | 2 | False | 0.160 | 0.383 | 0.153 | 0.000 | 1 / 0 | 0.000000000 |
| 69 | tabs | app-first / google/gemini-3.8-flash | 2 | False | 0.075 | 0.412 | 0.070 | 0.000 | 1 / 0 | 0.000000000 |
| 70 | tabs | app-auto / google/gemini-3.8-flash | 3 | False | 0.188 | 0.381 | 0.182 | 0.000 | 1 / 0 | 0.000000000 |
| 71 | tabs | app-first / google/gemini-3.8-flash | 3 | False | 0.165 | 0.390 | 0.159 | 0.000 | 1 / 0 | 0.000000000 |
| 72 | tabs | browser-use / google/gemini-3.8-flash | 3 | False | 1.511 | 2.011 | 0.605 | 0.000 | 4 / 0 | 0.000000000 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 59:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "visited": []
  }
}
```

Row 60:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "visited": []
  },
  "jevErrors": []
}
```

Row 61:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "visited": []
  }
}
```

Row 62:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "visited": []
  },
  "jevErrors": []
}
```

Row 63:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "visited": []
  },
  "jevErrors": []
}
```

Row 64:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 65:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```

Row 66:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 67:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```

Row 68:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 69:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 70:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 71:

```json
{
  "state": "failed",
  "endReason": "OpenRouter HTTP 402",
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  },
  "jevErrors": []
}
```

Row 72:

```json
{
  "state": "stopped",
  "error": null,
  "verification": {
    "passed": false,
    "expected": "Reference article: the orbit period is 42 days."
  }
}
```


### final-recovery.json

[auto/final-file: canonical source](../../docs/benchmarks/jev-auto/final-recovery.json) · 18 records · 18 recorded successes · known cost $0.400367172.

File SHA-256: `bfd3a29646d64d950a483fea598c70ec64480aef5853c0259e88a0fd5671b314`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| research-offers / app-auto / google/gemini-3.8-flash | 3/3 | 13.725 | 13.420–14.000 |
| research-offers / app-first / google/gemini-3.8-flash | 3/3 | 18.966 | 14.851–21.495 |
| research-offers / browser-use / google/gemini-3.8-flash | 3/3 | 29.029 | 28.544–33.745 |
| tabs / app-first / google/gemini-3.8-flash | 3/3 | 5.148 | 4.988–7.585 |
| tabs / browser-use / google/gemini-3.8-flash | 3/3 | 7.050 | 4.947–9.158 |
| tabs / app-auto / google/gemini-3.8-flash | 3/3 | 5.988 | 5.427–6.612 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | research-offers | app-auto / google/gemini-3.8-flash | 1 | True | 13.725 | 0.440 | 13.208 | 0.000 | 7 / 0 | 0.022533000 |
| 2 | research-offers | app-first / google/gemini-3.8-flash | 1 | True | 21.495 | 0.440 | 18.878 | 1.743 | 10 / 2 | 0.039080118 |
| 3 | research-offers | browser-use / google/gemini-3.8-flash | 1 | True | 28.544 | 1.992 | 21.384 | 0.000 | 8 / 0 | 0.054545250 |
| 4 | research-offers | app-first / google/gemini-3.8-flash | 2 | True | 14.851 | 0.396 | 13.257 | 1.090 | 8 / 2 | 0.028531128 |
| 5 | research-offers | browser-use / google/gemini-3.8-flash | 2 | True | 33.745 | 2.010 | 26.738 | 0.000 | 8 / 0 | 0.056442750 |
| 6 | research-offers | app-auto / google/gemini-3.8-flash | 2 | True | 14.000 | 0.387 | 13.141 | 0.000 | 9 / 0 | 0.033011250 |
| 7 | research-offers | browser-use / google/gemini-3.8-flash | 3 | True | 29.029 | 2.022 | 22.066 | 0.000 | 8 / 0 | 0.056679000 |
| 8 | research-offers | app-auto / google/gemini-3.8-flash | 3 | True | 13.420 | 0.399 | 12.620 | 0.000 | 9 / 0 | 0.030990000 |
| 9 | research-offers | app-first / google/gemini-3.8-flash | 3 | True | 18.966 | 0.398 | 12.108 | 6.166 | 9 / 2 | 0.033327888 |
| 10 | tabs | app-first / google/gemini-3.8-flash | 1 | True | 4.988 | 0.373 | 3.425 | 1.292 | 3 / 2 | 0.006333858 |
| 11 | tabs | browser-use / google/gemini-3.8-flash | 1 | True | 9.158 | 1.966 | 6.516 | 0.000 | 5 / 0 | 0.002398500 |
| 12 | tabs | app-auto / google/gemini-3.8-flash | 1 | True | 5.988 | 0.406 | 4.124 | 1.628 | 3 / 4 | 0.006007266 |
| 13 | tabs | browser-use / google/gemini-3.8-flash | 2 | True | 4.947 | 2.022 | 3.426 | 0.000 | 2 / 0 | 0.002705250 |
| 14 | tabs | app-auto / google/gemini-3.8-flash | 2 | True | 6.612 | 0.387 | 3.958 | 2.432 | 3 / 4 | 0.006236766 |
| 15 | tabs | app-first / google/gemini-3.8-flash | 2 | True | 5.148 | 0.373 | 4.000 | 0.977 | 3 / 2 | 0.006141768 |
| 16 | tabs | app-auto / google/gemini-3.8-flash | 3 | True | 5.427 | 0.373 | 3.981 | 1.216 | 3 / 4 | 0.006001266 |
| 17 | tabs | app-first / google/gemini-3.8-flash | 3 | True | 7.585 | 0.394 | 5.637 | 1.635 | 3 / 4 | 0.006389364 |
| 18 | tabs | browser-use / google/gemini-3.8-flash | 3 | True | 7.050 | 2.000 | 5.510 | 0.000 | 2 / 0 | 0.003012750 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 9:

```json
{
  "state": "completed",
  "endReason": "final_answer",
  "verification": {
    "passed": true,
    "saved": {
      "provider": "Boreal",
      "total": "744"
    },
    "visited": [
      "atlas",
      "atlas",
      "boreal",
      "cedar"
    ]
  },
  "jevErrors": [
    {
      "reason": "timeout_or_transport",
      "elapsedMs": 5002.658155000012,
      "parentCallId": "call_420533"
    }
  ]
}
```


### headful-auto.json

[auto/headful: canonical source](../../docs/benchmarks/jev-auto/headful-auto.json) · 1 records · 1 recorded successes · known cost $0.003941484.

File SHA-256: `c9cb7ab8df73f80a2efb70cbc6599f2b41fc55adfc1752b73f437d367be16c4f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-auto / google/gemini-3.8-flash | 1/1 | 3.927 | 3.927–3.927 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-auto / google/gemini-3.8-flash | 1 | True | 3.927 | 1.597 | 1.936 | 1.636 | 2 / 3 | 0.003941484 |

### pilot-auto-1.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-auto-1.json) · 5 records · 5 recorded successes · known cost $0.281290023.

File SHA-256: `27db4869b1405201f574c70b80cfc1a2a75dba0703618cb4e4beecd1ff4b19ea`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-auto / google/gemini-3.8-flash | 1/1 | 3.715 | 3.715–3.715 |
| wizard-6 / app-auto / google/gemini-3.8-flash | 1/1 | 9.933 | 9.933–9.933 |
| compare-offers / app-auto / google/gemini-3.8-flash | 1/1 | 7.506 | 7.506–7.506 |
| tabs / app-auto / google/gemini-3.8-flash | 1/1 | 7.549 | 7.549–7.549 |
| google-flights / app-auto / google/gemini-3.8-flash | 1/1 | 41.017 | 41.017–41.017 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-auto / google/gemini-3.8-flash | 1 | True | 3.715 | 0.310 | 2.415 | 1.206 | 2 / 3 | 0.004715598 |
| 2 | wizard-6 | app-auto / google/gemini-3.8-flash | 1 | True | 9.933 | 0.314 | 7.983 | 1.376 | 7 / 5 | 0.024081864 |
| 3 | compare-offers | app-auto / google/gemini-3.8-flash | 1 | True | 7.506 | 0.328 | 7.389 | 0.000 | 4 / 0 | 0.009110250 |
| 4 | tabs | app-auto / google/gemini-3.8-flash | 1 | True | 7.549 | 0.296 | 5.826 | 1.577 | 3 / 4 | 0.005869848 |
| 5 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 41.017 | 1.833 | 34.984 | 0.904 | 24 / 1 | 0.237512463 |

### pilot-confidence-035.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-confidence-035.json) · 1 records · 1 recorded successes · known cost $0.233415282.

File SHA-256: `2e32c4f655c152080d11fab5fd7da74ba237afcb270d1cfc65c04d482a8c7e76`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 1/1 | 50.943 | 50.943–50.943 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 50.943 | 2.666 | 42.503 | 4.757 | 25 / 9 | 0.233415282 |

### pilot-context-v2.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-context-v2.json) · 1 records · 0 recorded successes · known cost $0.005164140.

File SHA-256: `8a48be132cc8a09926987b38e6b34ccf442c8534b50c6a56c2e2faa7dd39a276`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | False | 18.334 | 2.448 | 2.015 | 4.772 | 2 / 11 | 0.005164140 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "failed",
  "endReason": "OpenRouter failed after 2 attempts: transport or response decoding error",
  "verification": {
    "passed": false,
    "checks": {
      "searchPage": false,
      "origin": true,
      "destination": true,
      "oneWay": true,
      "departure": false,
      "year": false,
      "passenger": true,
      "economy": true,
      "results": false
    },
    "url": "https://www.google.com/travel/flights?tfs=CBwQARocagwIAxIIL20vMDg5NjZyDAgDEggvbS8wNGpwbEABSAFwAYIBCwj___________8BmAEC&tfu=KgIIAw&hl=en",
    "controls": [
      {
        "role": "button",
        "label": "Main menu",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "link",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Change appearance",
        "value": ""
      },
      {
        "role": "button",
        "label": "Google apps",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "One way",
        "value": "One way"
      },
      {
        "role": "button",
        "label": "1 passenger",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "Economy",
        "value": "Economy"
      },
      {
        "role": "combobox",
        "label": "Where from?",
        "value": "Z\u00fcrich"
      },
      {
        "role": "button",
        "label": "Swap origin and destination.",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "Where to?",
        "value": "London"
      },
      {
        "role": "input",
        "label": "Departure",
        "value": ""
      },
      {
        "role": "input",
        "label": "Departure",
        "value": ""
      },
      {
        "role": "combobox",
        "label": "One way",
        "value": "One way"
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": "18511"
      },
      {
        "role": "button",
        "label": "",
        "value": "19507"
      },
      {
        "role": "button",
        "label": "",
        "value": "20507"
      },
      {
        "role": "button",
        "label": "",
        "value": "21484"
      },
      {
        "role": "button",
        "label": "",
        "value": "22507"
      },
      {
        "role": "button",
        "label": "",
        "value": "23507"
      },
      {
        "role": "button",
        "label": "",
        "value": "24507"
      },
      {
        "role": "button",
        "label": "",
        "value": "25511"
      },
      {
        "role": "button",
        "label": "",
        "value": "26654"
      },
      {
        "role": "button",
        "label": "",
        "value": "27744"
      },
      {
        "role": "button",
        "label": "",
        "value": "28394"
      },
      {
        "role": "button",
        "label": "",
        "value": "29467"
      },
      {
        "role": "button",
        "label": "",
        "value": "30403"
      },
      {
        "role": "button",
        "label": "",
        "value": "1488"
      },
      {
        "role": "button",
        "label": "",
        "value": "2775"
      },
      {
        "role": "button",
        "label": "",
        "value": "3530"
      },
      {
        "role": "button",
        "label": "",
        "value": "4573"
      },
      {
        "role": "button",
        "label": "",
        "value": "5332"
      },
      {
        "role": "button",
        "label": "",
        "value": "6421"
      },
      {
        "role": "button",
        "label": "",
        "value": "7424"
      },
      {
        "role": "button",
        "label": "",
        "value": "8348"
      },
      {
        "role": "button",
        "label": "",
        "value": "9408"
      },
      {
        "role": "button",
        "label": "",
        "value": "10440"
      },
      {
        "role": "button",
        "label": "",
        "value": "11258"
      },
      {
        "role": "button",
        "label": "",
        "value": "12251"
      },
      {
        "role": "button",
        "label": "",
        "value": "13251"
      },
      {
        "role": "button",
        "label": "",
        "value": "14258"
      },
      {
        "role": "button",
        "label": "",
        "value": "15251"
      },
      {
        "role": "button",
        "label": "",
        "value": "16233"
      },
      {
        "role": "button",
        "label": "",
        "value": "17233"
      },
      {
        "role": "button",
        "label": "",
        "value": "18207"
      },
      {
        "role": "button",
        "label": "",
        "value": "19233"
      },
      {
        "role": "button",
        "label": "",
        "value": "20237"
      },
      {
        "role": "button",
        "label": "",
        "value": "21233"
      },
      {
        "role": "button",
        "label": "",
        "value": "22212"
      },
      {
        "role": "button",
        "label": "",
        "value": "23240"
      },
      {
        "role": "button",
        "label": "",
        "value": "24251"
      },
      {
        "role": "button",
        "label": "",
        "value": "25194"
      },
      {
        "role": "button",
        "label": "",
        "value": "26207"
      },
      {
        "role": "button",
        "label": "",
        "value": "27247"
      },
      {
        "role": "button",
        "label": "",
        "value": "28207"
      },
      {
        "role": "button",
        "label": "",
        "value": "29247"
      },
      {
        "role": "button",
        "label": "",
        "value": "30332"
      },
      {
        "role": "button",
        "label": "",
        "value": "31332"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "31"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "31"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "31"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "31"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "",
        "value": "14"
      },
      {
        "role": "button",
        "label": "",
        "value": "15"
      },
      {
        "role": "button",
        "label": "",
        "value": "16"
      },
      {
        "role": "button",
        "label": "",
        "value": "17"
      },
      {
        "role": "button",
        "label": "",
        "value": "18"
      },
      {
        "role": "button",
        "label": "",
        "value": "19"
      },
      {
        "role": "button",
        "label": "",
        "value": "20"
      },
      {
        "role": "button",
        "label": "",
        "value": "21"
      },
      {
        "role": "button",
        "label": "",
        "value": "22"
      },
      {
        "role": "button",
        "label": "",
        "value": "23"
      },
      {
        "role": "button",
        "label": "",
        "value": "24"
      },
      {
        "role": "button",
        "label": "",
        "value": "25"
      },
      {
        "role": "button",
        "label": "",
        "value": "26"
      },
      {
        "role": "button",
        "label": "",
        "value": "27"
      },
      {
        "role": "button",
        "label": "",
        "value": "28"
      },
      {
        "role": "button",
        "label": "",
        "value": "29"
      },
      {
        "role": "button",
        "label": "",
        "value": "30"
      },
      {
        "role": "button",
        "label": "",
        "value": "31"
      },
      {
        "role": "button",
        "label": "",
        "value": "1"
      },
      {
        "role": "button",
        "label": "",
        "value": "2"
      },
      {
        "role": "button",
        "label": "",
        "value": "3"
      },
      {
        "role": "button",
        "label": "",
        "value": "4"
      },
      {
        "role": "button",
        "label": "",
        "value": "5"
      },
      {
        "role": "button",
        "label": "",
        "value": "6"
      },
      {
        "role": "button",
        "label": "",
        "value": "7"
      },
      {
        "role": "button",
        "label": "",
        "value": "8"
      },
      {
        "role": "button",
        "label": "",
        "value": "9"
      },
      {
        "role": "button",
        "label": "",
        "value": "10"
      },
      {
        "role": "button",
        "label": "",
        "value": "11"
      },
      {
        "role": "button",
        "label": "",
        "value": "12"
      },
      {
        "role": "button",
        "label": "",
        "value": "13"
      },
      {
        "role": "button",
        "label": "Previous",
        "value": ""
      },
      {
        "role": "button",
        "label": "Next",
        "value": ""
      },
      {
        "role": "button",
        "label": "Done.",
        "value": ""
      },
      {
        "role": "button",
        "label": "Search",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Learn more about this section",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Previous",
        "value": ""
      },
      {
        "role": "button",
        "label": "Next",
        "value": ""
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to London (LTN) from PLN\u00a0130.  Operated by Ryanair. Oct 22 to Oct 30. Nonstop",
        "value": "Wroc\u0142awLondonOct 22 \u2014 Oct 30Nonstopfrom PLN\u00a0130"
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to Paris (BVA) from PLN\u00a0209.  Operated by Ryanair. Nov 15 to Nov 22. Nonstop",
        "value": "Wroc\u0142awParisNov 15 \u2014 Nov 22Nonstopfrom PLN\u00a0209"
      },
      {
        "role": "button",
        "label": "Find flights from Wroc\u0142aw (WRO) to Milan (BGY) from PLN\u00a0130.  Operated by Ryanair. Oct 31 to Nov 7. Nonstop",
        "value": "Wroc\u0142awMilanOct 31 \u2014 Nov 7Nonstopfrom PLN\u00a0130"
      },
      {
        "role": "button",
        "label": "Explore more destinations from Wroc\u0142aw",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Previous",
        "value": ""
      },
      {
        "role": "button",
        "label": "Next",
        "value": ""
      },
      {
        "role": "button",
        "label": "What are some good flight destinations from Poland?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find last-minute flight deals?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find cheap flights for a weekend getaway?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find flight deals if my travel plans are flexible?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I find cheap flights to anywhere?",
        "value": ""
      },
      {
        "role": "button",
        "label": "How can I get flight alerts for my trip?",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "tab",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": ""
      },
      {
        "role": "button",
        "label": "Currency PLN",
        "value": ""
      },
      {
        "role": "button",
        "label": "",
        "value": "Report Illegal Content"
      },
      {
        "role": "button",
        "label": "International sites",
        "value": ""
      },
      {
        "role": "button",
        "label": "Explore flights",
        "value": ""
      }
    ],
    "visibleFlights": [],
    "text": "Skip to main content\nAccessibility feedback\nExplore\nFlights\nHotels\nVacation rentals\nChange appearance\nSign in\nFlights\nOne way\n1\nEconomy\nZ\u00fcrich\nLondon\nOne way\nReset\nSeptember\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n511\n19\n507\n20\n507\n21\n484\n22\n507\n23\n507\n24\n507\n25\n511\n26\n654\n27\n744\n28\n394\n29\n467\n30\n403\nOctober\nM\nT\nW\nT\nF\nS\nS\n1\n488\n2\n775\n3\n530\n4\n573\n5\n332\n6\n421\n7\n424\n8\n348\n9\n408\n10\n440\n11\n258\n12\n251\n13\n251\n14\n258\n15\n251\n16\n233\n17\n233\n18\n207\n19\n233\n20\n237\n21\n233\n22\n212\n23\n240\n24\n251\n25\n194\n26\n207\n27\n247\n28\n207\n29\n247\n30\n332\n31\n332\nNovember\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\nDecember\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nJanuary 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nFebruary 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\nMarch 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nApril 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\nMay 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nJune 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\nJuly 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nAugust 2027\nM\nT\nW\nT\nF\nS\nS\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n26\n27\n28\n29\n30\n31\nUnderlined prices indicate cheapest compared with other prices shown\nDone\nSearch\nFlexible? Discover the best flight deals with AI\nDescribe your ideal trip, and let Google Flights find the best deals for you\nExplore deals with AI\nFind and book cheap flights worldwide and track prices\nFind cheap flights from Poland to anywhere\nWroc\u0142aw\nWarsaw\nKrak\u00f3w\nGda\u0144sk\nWroc\u0142aw\nLondon\nOct 22 \u2014 Oct 30\nNonstop\nfrom PLN\u00a0130\nWroc\u0142aw\nParis\nNov 15 \u2014 Nov 22\nNonstop\nfrom PLN\u00a0209\nWroc\u0142aw\nMilan\nOct 31 \u2014 Nov 7\nNonstop\nfrom PLN\u00a0130\nExplore destinations\nUseful tools to help you find the best airline tickets\nFind the cheapest days to fly\nThe Date grid and Price graph make it easy to find the best flight deals\nKnow when to book with price insights\nPrice history and trend data show you the best time to book your airline ticket to get the cheapest price for your flight\nTrack flight prices for a trip\nNot ready to book yet? Observe price changes for a route or flight and get notified when prices drop.\nExplore the best flight deals with AI\nDescribe your ideal trip and let Google Flights find you the best deals\nInsightful tools help you choose your trip dates\nIf your travel plans are flexible, use the form above to start searching for a specific trip. Then, play around with the Date grid and Price graph options on the Search page to find the cheapest days to fly and book your tickets.\nPopular flight destinations from Poland\nLondon\nMilan\nParis\nTokyo\nOslo\nBarcelona\nFrankfurt am Main\nCopenhagen\nRome\nMunich\nFrequently asked questions\nWhat are some good flight destinations from Poland?\nHow can I find last-minute flight deals?\nHow can I find cheap flights for a weekend getaway?\nHow can I find flight deals if my travel plans are flexible?\nHow can I find cheap flights to anywhere?\nHow can I get flight alerts for my trip?\nSearch more flights\nFind cheap flights on popular routes\nFlights from cities in Poland\nInternational flights from Poland\nFlights from Warsaw\nFlights from Krak\u00f3w\nFlights from Gda\u0144sk\nFlights from Wroc\u0142aw\nFlights from Pozna\u0144\nFlights from Rzesz\u00f3w\nLanguage\u200bEnglish (United States)\nLocation\u200bPoland\nCurrencyPLN\n\nCurrent language and currency options applied: English (United States) - Poland - PLN\n\nDisplayed currencies may differ from the currencies used to purchase flights. Learn more\n\nPrices are final prices and include all taxes and fees, including payment fees for the cheapest common payment method (which may differ depending on the provider). Additional charges may apply for other types of payment, luggage, meals, WLAN or other additional services. Prices, availability and travel details are provided based on the latest information received from our partners. This information is reflected in the results within a period of less than 24 hours. Additional conditions may also be applied by our partners. You should then check prices and conditions with the services providers before booking.\n\nAbout\nPrivacy\nTerms\nJoin user studies\nReport Illegal Content\nFeedback\nHelp Center and Consumer Information\nInternational sites\nExplore flights\nThe cheapest price shown is 194 Polish zlotys on Sun, Oct 25."
  }
}
```


### pilot-guard-v5.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-guard-v5.json) · 2 records · 2 recorded successes · known cost $0.036547506.

File SHA-256: `d51b9c24b5196ddcb380825c8ddeff61e028d714a5bc6e484290af909639fed0`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 2/2 | 18.777 | 18.651–18.904 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 18.651 | 2.673 | 3.973 | 10.947 | 2 / 19 | 0.018394752 |
| 2 | google-flights | app-auto / google/gemini-3.8-flash | 2 | True | 18.904 | 2.686 | 3.383 | 11.854 | 2 / 19 | 0.018152754 |

### pilot-occlusion-v3.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-occlusion-v3.json) · 4 records · 4 recorded successes · known cost $0.144827883.

File SHA-256: `7ff3153946fa71daff708e2a9ab85ec40cd950a8e755638ce11b803e5aa1dbac`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| autocomplete / app-auto / google/gemini-3.8-flash | 1/1 | 5.389 | 5.389–5.389 |
| wizard-6 / app-auto / google/gemini-3.8-flash | 1/1 | 10.544 | 10.544–10.544 |
| research-offers / app-auto / google/gemini-3.8-flash | 1/1 | 19.454 | 19.454–19.454 |
| google-flights / app-auto / google/gemini-3.8-flash | 1/1 | 22.850 | 22.850–22.850 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | autocomplete | app-auto / google/gemini-3.8-flash | 1 | True | 5.389 | 0.437 | 2.875 | 1.852 | 2 / 4 | 0.003966684 |
| 2 | wizard-6 | app-auto / google/gemini-3.8-flash | 1 | True | 10.544 | 0.398 | 9.812 | 0.000 | 8 / 0 | 0.027514500 |
| 3 | research-offers | app-auto / google/gemini-3.8-flash | 1 | True | 19.454 | 0.387 | 18.637 | 0.000 | 9 / 0 | 0.030766500 |
| 4 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 22.850 | 3.399 | 11.263 | 5.906 | 9 / 11 | 0.082580199 |

### pilot-runner-validation.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-runner-validation.json) · 4 records · 4 recorded successes · known cost $0.011143578.

File SHA-256: `839715557a0bd3152a710eacafe3affb44e8ea60fa3a85cb6d7022d34dfd824f`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| search / app-auto / google/gemini-3.8-flash | 1/1 | 4.009 | 4.009–4.009 |
| search / app-first / google/gemini-3.8-flash | 1/1 | 3.365 | 3.365–3.365 |
| search / ultrafast / google/gemini-3.8-flash | 1/1 | 2.856 | 2.856–2.856 |
| search / browser-use / google/gemini-3.8-flash | 1/1 | 5.029 | 5.029–5.029 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search | app-auto / google/gemini-3.8-flash | 1 | True | 4.009 | 0.441 | 2.219 | 1.417 | 2 / 3 | 0.003913728 |
| 2 | search | app-first / google/gemini-3.8-flash | 1 | True | 3.365 | 0.449 | 2.186 | 0.984 | 2 / 3 | 0.003997410 |
| 3 | search | ultrafast / google/gemini-3.8-flash | 1 | True | 2.856 | 1.165 | 1.199 | 1.559 | 1 / 3 | 0.000476190 |
| 4 | search | browser-use / google/gemini-3.8-flash | 1 | True | 5.029 | 2.176 | 3.220 | 0.000 | 2 / 0 | 0.002756250 |

### pilot-stale-v4.json

[auto/pilot: canonical source](../../docs/benchmarks/jev-auto/pilot-stale-v4.json) · 2 records · 2 recorded successes · known cost $0.071232648.

File SHA-256: `7cdacb0e2af7b99db9dca64633a45331fb614d891e2933523929e6d9eb2ab33e`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 2/2 | 27.761 | 17.551–37.971 |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | True | 17.551 | 2.947 | 3.627 | 10.649 | 2 / 18 | 0.017520678 |
| 2 | google-flights | app-auto / google/gemini-3.8-flash | 2 | True | 37.971 | 2.266 | 15.512 | 9.687 | 6 / 14 | 0.053711970 |

### stop-auto.json

[auto/stop: canonical source](../../docs/benchmarks/jev-auto/stop-auto.json) · 1 records · 0 recorded successes · known cost $0.001986750.

File SHA-256: `5fa9557fd81a4f8c7f1c3ccad2c2a104449cf1c00fa90fbed052f9fb6bf7f7e0`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.

Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.

| Task / engine / model | Recorded successes | Median s | Min–max s |
| --- | ---: | ---: | ---: |
| google-flights / app-auto / google/gemini-3.8-flash | 0/1 | — | — |

| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | google-flights | app-auto / google/gemini-3.8-flash | 1 | False | 2.505 | 2.794 | 1.468 | 0.000 | 1 / 0 | 0.001986750 |

Recorded failures, deliberate interruptions or Jev service errors:

Row 1:

```json
{
  "state": "stopped",
  "endReason": "benchmark_stop",
  "verification": {
    "passed": false,
    "reason": "interrupted before verification"
  },
  "jevErrors": [],
  "browserStopMs": 129.88763500000005,
  "stopMs": 139.1339939999998
}
```


## Desktop checks

These retain the original report fields. A readiness check is not a browser task; a stopped task is expected in an intentional Stop test. Costs for the ten Auto desktop runs are in the separate usage ledger.

### jev-desktop-2026-09-17.json

[Source](../../docs/benchmarks/jev-desktop-2026-09-17.json) · 4 checks · SHA-256 `04bb1002b8c01ac1aaac1a0be3c661f450521e5555d6bac36accc65761d149ce`.

```json
[
  {
    "provider": "codex",
    "accountState": "ready",
    "podman": true,
    "image": true
  },
  {
    "state": "completed",
    "engine": "jev-hybrid",
    "jev": {
      "decisions": 2,
      "elapsedMs": 1260.1876629999988,
      "costUsd": 0.00024717,
      "fallbacks": 1
    },
    "final": "Page title: **Example Domains**  \nURL: **https://www.iana.org/help/example-domains**",
    "errors": []
  },
  {
    "check": "stop",
    "state": "stopped",
    "elapsedMs": 227
  },
  {
    "check": "classic_after_stop",
    "state": "completed",
    "engine": "classic",
    "final": "The page title is **\u201cExample Domain.\u201d**",
    "errors": []
  }
]
```

### jev-first-desktop-2026-09-17.json

[Source](../../docs/benchmarks/jev-first-desktop-2026-09-17.json) · 3 checks · SHA-256 `79797c2faff6aadd0a0b620db00b18f2425dfab81ce94e34dff5be610fc193eb`.

```json
[
  {
    "check": "first_luna_navigation",
    "passed": true,
    "elapsedMs": 11465,
    "state": "completed",
    "engine": "jev-first",
    "jev": {
      "decisions": 1,
      "elapsedMs": 735.832453,
      "costUsd": 3.7758e-05,
      "fallbacks": 1
    },
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "Title: **Example Domains**  \nURL: **https://www.iana.org/help/example-domains**"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 22
  },
  {
    "check": "classic_after_stop",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://example.com/",
      "title": "Example Domain"
    }
  }
]
```

### jev-first-desktop-final-2026-09-17.json

[Source](../../docs/benchmarks/jev-first-desktop-final-2026-09-17.json) · 3 checks · SHA-256 `c846b1f7101542590163fe674f4958788c910bc06585e6e30932791e19dc340b`.

```json
[
  {
    "check": "first_luna_navigation",
    "passed": true,
    "elapsedMs": 11622,
    "state": "completed",
    "engine": "jev-first",
    "jev": {
      "decisions": 1,
      "elapsedMs": 770.07071,
      "costUsd": 3.7422e-05,
      "fallbacks": 1
    },
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "Title: **Example Domains**  \nURL: **https://www.iana.org/help/example-domains**"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 19
  },
  {
    "check": "classic_after_stop",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://example.com/",
      "title": "Example Domain"
    }
  }
]
```

### jev-openrouter-desktop-2026-09-17.json

[Source](../../docs/benchmarks/jev-openrouter-desktop-2026-09-17.json) · 4 checks · SHA-256 `d126bb25979a7568d560502fdf1115c550761bb5c752c15e4969b056f83fa612`.

```json
[
  {
    "check": "first_navigation",
    "passed": true,
    "elapsedMs": 7658,
    "state": "completed",
    "engine": "jev-first",
    "jev": {
      "decisions": 3,
      "elapsedMs": 1436.4734590000003,
      "costUsd": 0.00029038800000000004,
      "fallbacks": 2
    },
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "The resulting page details from following the link on https://example.com are:\n\n- **Page Title:** Example Domains\n- **URL:** https://www.iana.org/help/example-domains"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 173
  },
  {
    "check": "classic_after_stop",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://example.com/",
      "title": "Example Domain"
    }
  },
  {
    "check": "followup_context",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    }
  }
]
```

### desktop-auto-recheck.json

[Source](../../docs/benchmarks/jev-auto/desktop-auto-recheck.json) · 3 checks · SHA-256 `bd2edcfd0d8735bd59b6b924f0b181b4df216ae15ff7443e4963b94387c12ff4`.

```json
[
  {
    "check": "auto_navigation",
    "passed": true,
    "elapsedMs": 7387,
    "state": "completed",
    "engine": "jev-auto",
    "jev": {
      "decisions": 2,
      "elapsedMs": 1332.4628409999996,
      "costUsd": 6.762e-05,
      "fallbacks": 1
    },
    "browser": {
      "url": "http://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "After opening https://example.com and following the \"More information...\" link:\n\n- **Page Title:** Example Domains\n- **URL:** http://www.iana.org/help/example-domains"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 30
  },
  {
    "check": "classic_after_stop",
    "passed": false,
    "state": "completed",
    "browser": {
      "url": "http://www.iana.org/help/example-domains",
      "title": "Example Domains"
    }
  }
]
```

### desktop-auto-schema.json

[Source](../../docs/benchmarks/jev-auto/desktop-auto-schema.json) · 4 checks · SHA-256 `0c49539f83b4827c70c309dd3440b35ec3b7e79797a27dc0d940809e7bd1e769`.

```json
[
  {
    "check": "auto_navigation",
    "passed": true,
    "elapsedMs": 6394,
    "state": "completed",
    "engine": "jev-auto",
    "jev": {
      "decisions": 2,
      "elapsedMs": 1309.160006,
      "costUsd": 0.00026304600000000007,
      "fallbacks": 1
    },
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "The resulting page details are:\n\n- **Title:** Example Domains\n- **URL:** https://www.iana.org/help/example-domains"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 27
  },
  {
    "check": "classic_after_stop",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://example.com/",
      "title": "Example Domain"
    }
  },
  {
    "check": "followup_context",
    "passed": true,
    "state": "completed",
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    }
  }
]
```

### desktop-auto.json

[Source](../../docs/benchmarks/jev-auto/desktop-auto.json) · 3 checks · SHA-256 `67fb09ef823c7d0e398769f2a9e7cca8b17469030736c67d117cf84fd5b40a14`.

```json
[
  {
    "check": "auto_navigation",
    "passed": true,
    "elapsedMs": 15505,
    "state": "completed",
    "engine": "jev-auto",
    "jev": {
      "decisions": 2,
      "elapsedMs": 1721.8755079999992,
      "costUsd": 0.00027342,
      "fallbacks": 1
    },
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    },
    "final": "After opening https://example.com and navigating via the **More information...** link, the resulting page details are:\n\n- **Title:** `Example Domains`\n- **URL:** `https://www.iana.org/help/example-domains`"
  },
  {
    "check": "stop",
    "passed": true,
    "elapsedMs": 26
  },
  {
    "check": "classic_after_stop",
    "passed": false,
    "state": "completed",
    "browser": {
      "url": "https://www.iana.org/help/example-domains",
      "title": "Example Domains"
    }
  }
]
```

## Software checks, costs and provenance

See the [test catalog](TEST-CATALOG.md#functional-security-and-ui-verification) for successive full-suite results, container checks, fixture negative tests, security boundaries and Stop clocks. Repeated suite sizes are not additive. The final pre-release application suite had 452 passing and 12 skipped tests; subsequent release checks are tracked separately from benchmark measurements.

[Full cost ledger](COSTS.md) · [Source inventory](inventory.json) · [Imported PoC provenance](import-manifest.json) · [Original completion audit](../benchmarks/jev-auto/validation/completion-audit.json). Traces are retained next to their metric files; Auto has its own trace manifest/archive and the native PoC its compressed final/diagnostic archives. No API keys or private account billing totals belong in these reports.
