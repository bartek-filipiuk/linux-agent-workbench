#!/usr/bin/env python3
"""Render the English historical archive from canonical records, without API calls."""
import collections
import gzip
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/research'
inventory = json.loads((OUT / 'inventory.json').read_text())


def records(source):
    file, _, member = source.partition('#')
    data = (ROOT / file).read_bytes()
    result = json.loads(gzip.decompress(data) if file.endswith('.gz') else data)
    return result[member] if member else result


def cell(value):
    return str(value if value is not None else '—').replace('|', '\\|').replace('\n', '<br>')


def seconds(value):
    return '—' if value is None else f'{value / 1000:.3f}'


lines = ['# All retained browser experiments', '',
         'English archive of measurements from September 17–18, 2026. Generated from canonical JSON by `python3 scripts/research-report.py`; no benchmarks are rerun. The original measurements, including non-English test prompts and page text, remain unchanged as evidence.', '',
         '**606 runner records**, **78 routing cases**, **8 direct-driver cases**, and **24 desktop checks**. These categories have different success criteria and clocks. They must not be combined into one benchmark success rate.', '',
         '[Current findings and charts](README.md) · [Task catalog and methodology](TEST-CATALOG.md) · [Costs](COSTS.md) · [CSV](trials.csv) · [Application](../APPLICATION.md)', '',
         f"Known retained usage plus estimated Jev cost: **${inventory['knownTotalUsd']}**. Subscription allocation, missing interrupted usage, earlier desktop usage and development work are not included. The cost ledger explains omissions and prevents double counting.", '',
         '## How to read the archive', '',
         'Each series below preserves source order and lists every record. A row number is a 1-based position in the canonical `results` array. Median/min/max values use successful attempts only; unsuccessful attempts remain in the denominator. Missing measurements are shown as an em dash. Setup is separate from task time; retries, recovery and independent verification belong to task time in the final PoC/Auto series. Full traces and raw observations remain in the linked files and adjacent trace archives.', '',
         'The earlier final app comparisons contain 281 records; their diagnostics contain 40. Native PoC has 102 final, 16 pilot, 7 intentional Stop and 1 visible-window record. Auto has 159 runner records, including a selected 119-trial comparison and an 18-record interrupted block. The remaining Auto records are 19 pilots, one credit check, one visible-window smoke and one intentional Stop. Unit-suite totals are recorded separately in the test catalog.', '',
         '### Historical interpretation', '',
         '- Optional Hybrid did not establish a general speedup: it never used Jev in 28/40 attempts; paired Classic/Hybrid ratio median was about 1.01×. First made delegation explicit. Sol/Luna comparisons also changed the planner, so same-model comparisons are kept separate.',
         '- Earlier First/Luna completed 24/24 versus Classic/Luna 23/24. The faster Gemini primary planner reduced latency further. These historical series are not pooled with the later frozen Auto comparison.',
         '- Native PoC completed 34/34 with First, 34/34 with Browser Use, and 25/34 with Ultrafast. Ultrafast failed all six offer-analysis attempts. It opened the right new tab in three other attempts but ended blocked; these remain autonomous-completion failures. Counting only page state would give it 28/34.',
         '- Earlier Flights PoC medians were First 30.782 s, Ultrafast 11.424 s and Browser Use 34.824 s, each over 10 attempts. Mean primary-model time was 26.382 / 2.086 / 19.452 s; Jev time 1.678 / 7.654 / 0 s; other work 2.153 / 1.589 / 15.425 s. Do not add these means to medians.',
         '- Long forms reverse the earlier native ranking: Browser Use grouped actions while Ultrafast generated field values separately. In the ten-stage form, First used 42–43 Gemini calls, Ultrafast 20 and Browser Use 11 per attempt. Intelligence in a helper does not help if the decision loop never invokes it for reasoning.', '',
         '<a id="auto"></a>', '## Latest Auto comparison', '',
         'The selected sample completed **119/119**. It consists of 54 records from the first six complete groups in `final-local.json`, the entire 18-record restarted research/tabs block, all 27 changed-data records, and all 20 Flights records. The original interrupted research/tabs block contains four successes and 14 credit failures; all 18 stay in this archive, excluded from the comparison as a block. The selection rule was declared before resumption. Raw final files therefore contain 137 records.', '',
         'See [latest matched medians and ranges](../jev-auto-results.md). Auto improved long forms and reasoning tasks but lost some simple interactions to First. Its Flights range was 17.83–64.02 s; native Ultrafast remained fastest there. Three or five repeats are not proof of production reliability. Changed-data fixtures are not unseen websites.', '',
         'Routing pilots progressed 12/16 → 15/16 → 16/16, plus 6/6 held-out categories. Each of three early pilots also contained two malformed JSON-string batch arguments; route-category tests alone missed them. After the shared schema fix, the final category check was 13/16: one valid but unexpected observation route, two HTTP 429 failures with no model response. Held-out was 6/6 and targeted retries of the two unavailable cases were 2/2. All 20 returned calls in these three checks had valid schemas. Actual execution had 193/194 valid task/batch arguments; one malformed wait was rejected and corrected within the measured time.', '',
         'Retained setup/diagnostic failures include Browser Harness socket-path length, blank transport-tab verification, consent redirect races, a 25-second Jev timeout, reasoning cycles, screenshots attempted after Stop, HTTP 402 credit exhaustion, HTTP 429 rate limits and an unrelated terminal idle-detection timing failure under concurrent load. The final full suite passed. No failed attempt is replaced in the raw archive.', '',
         '<a id="referencja"></a>', '## External seven-second reference', '',
         'The author’s Jev Ultrafast result was 7.073 s with Mercury as a text helper: 17 Jev calls totaling 3.720 s, two Mercury calls totaling 0.927 s, and 2.426 s of other work. Its clock starts after the first observation and ends at DONE; setup and the later independent verifier are outside it. This is not a result from the standard Browser Use agent with Gemini or our app. [Pinned author measurement](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/flights-measurement.json).', '',
         'The author’s three paired baseline/candidate measurements were 11.214/6.964, 8.984/7.913 and 9.450/7.092 seconds. All were reported verified; this external data does not increase our counters. A separate prepared-subgoal prototype took 12.884 s; its static setup is a different experiment. [Paired comparison](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/full-speed-measurement.json) · [Prepared prototype](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/performance-prepared.md).', '',
         '## Every source and attempt', '']

for entry in inventory['series']:
    source = entry['source']
    data = records(source)
    rows = data['results']
    target = '../../' + source.split('#')[0]
    title = Path(source.split('#')[0]).name + (': ' + source.split('#')[1] if '#' in source else '')
    lines += [f'### {title}', '', f"[{entry['stage']}/{entry['kind']}: canonical source]({target}) · {len(rows)} records · {entry['successes']} recorded successes · known cost ${float(entry['knownUsd']):.9f}.", '',
              f"File SHA-256: `{entry['sha256']}`. Source revision metadata is retained in the JSON; diagnostic archive members are named above.", '']
    if entry['kind'] == 'routing':
        lines += ['Category check only: no browser actions are executed.', '',
                  '| Row | Case | Expected | Selected | Passed | Decision s | Reported USD | Error |', '| --- | --- | --- | --- | --- | ---: | ---: | --- |']
        for i,row in enumerate(rows,1):
            lines.append('| '+' | '.join(map(cell,[i,row['id'],row['expected'],row.get('mode'),row['passed'],seconds(row.get('elapsedMs')),row.get('costUsd'),row.get('error','')]))+' |')
    elif entry['kind'] == 'driver':
        lines += ['Functional page-state result and driver-only clock; not an end-to-end planner task.', '',
                  '| Row | Task | Functional success | Driver status | Driver s | Jev s | Jev calls | Jev USD |', '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |']
        for i,row in enumerate(rows,1):
            result=row.get('result',[{}])[0];jev=row.get('jev',{})
            lines.append('| '+' | '.join(map(cell,[i,row['scenario'],row['success'],result.get('status'),seconds(result.get('elapsedMs')),seconds(jev.get('elapsedMs')),jev.get('decisions'),jev.get('costUsd')]))+' |')
    else:
        groups=collections.defaultdict(list)
        for row in rows:groups[(row.get('task',row.get('scenario')),row['engine'],row.get('model',data.get('model','')))].append(row)
        lines += ['Per-task summaries for this source only. Interrupted blocks and pilot files are descriptive, not additional final rankings.', '',
                  '| Task / engine / model | Recorded successes | Median s | Min–max s |', '| --- | ---: | ---: | ---: |']
        for key,values in groups.items():
            times=[v['taskMs'] for v in values if v.get('success') and 'taskMs' in v]
            lines.append('| '+' | '.join([cell(' / '.join(str(k) for k in key)),f"{sum(bool(v.get('success')) for v in values)}/{len(values)}",seconds(statistics.median(times) if times else None),f'{seconds(min(times))}–{seconds(max(times))}' if times else '—'])+' |')
        lines += ['', '| Row | Task | Engine / model | Repeat | Success | Task s | Setup s | Model s | Jev s | Model / Jev calls | Known USD |', '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |']
        for i,row in enumerate(rows,1):
            cost=row.get('costUsd',(row.get('primaryCostUsd') or 0)+(row.get('jevCostUsd') or 0))
            lines.append('| '+' | '.join(map(cell,[i,row.get('task',row.get('scenario')),row['engine']+' / '+row.get('model',data.get('model','')),row.get('repeat'),row.get('success'),seconds(row.get('taskMs')),seconds(row.get('setupMs')),seconds(row.get('primaryMs')),seconds(row.get('jevMs')),str(row.get('primaryCalls','—'))+' / '+str(row.get('jevCalls','—')),f'{cost:.9f}' if cost is not None else '—']))+' |')
        failures=[(i,v) for i,v in enumerate(rows,1) if not v.get('success') or v.get('jevErrors')]
        if failures:
            lines += ['', 'Recorded failures, deliberate interruptions or Jev service errors:', '']
            for i,row in failures:
                detail={k:row[k] for k in ['state','endReason','error','verification','jevErrors','browserStopMs','stopMs'] if k in row}
                lines += [f'Row {i}:', '', '```json', json.dumps(detail,indent=2,ensure_ascii=True), '```', '']
    lines.append('')

lines += ['## Desktop checks', '', 'These retain the original report fields. A readiness check is not a browser task; a stopped task is expected in an intentional Stop test. Costs for the ten Auto desktop runs are in the separate usage ledger.', '']
for entry in inventory['desktopSources']:
    data=records(entry['source']);checks=data if isinstance(data,list) else data['checks']
    lines += [f"### {Path(entry['source']).name}", '', f"[Source]({'../../'+entry['source']}) · {len(checks)} checks · SHA-256 `{entry['sha256']}`.", '', '```json',json.dumps(checks,indent=2,ensure_ascii=True),'```','']
lines += ['## Software checks, costs and provenance', '',
          'See the [test catalog](TEST-CATALOG.md#functional-security-and-ui-verification) for successive full-suite results, container checks, fixture negative tests, security boundaries and Stop clocks. Repeated suite sizes are not additive. The final pre-release application suite had 452 passing and 12 skipped tests; subsequent release checks are tracked separately from benchmark measurements.', '',
          '[Full cost ledger](COSTS.md) · [Source inventory](inventory.json) · [Imported PoC provenance](import-manifest.json) · [Original completion audit](../benchmarks/jev-auto/validation/completion-audit.json). Traces are retained next to their metric files; Auto has its own trace manifest/archive and the native PoC its compressed final/diagnostic archives. No API keys or private account billing totals belong in these reports.', '']
(OUT/'ALL-RESULTS.md').write_text('\n'.join(lines))
print(f'Wrote English archive: {len(inventory["series"])} series, {inventory["runnerRecords"]} runner records.')
