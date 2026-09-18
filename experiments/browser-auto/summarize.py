import json, statistics as S, pathlib, collections, argparse
root=pathlib.Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description='Summarize retained Auto benchmark records without changing originals.')
parser.add_argument('--input',type=pathlib.Path,default=root/'experiments/browser-auto/artifacts')
parser.add_argument('--output',type=pathlib.Path)
args=parser.parse_args()
a=args.input
output=args.output or a/'tables.md'
files=sorted(a.glob('*.json'))
docs={p.name:json.loads(p.read_text()) for p in files}
# Predeclared resumed sample: completed first six groups, entire restarted research/tabs block,
# then heldout and Flights. The interrupted 18 records (including their four successes) stay in the archive.
raw_final=[dict(r,series=name) for name,d in docs.items() if name.startswith('final-') for r in d.get('results',[])]
final=[r for r in raw_final if (r['series']=='final-local.json' and r['task'] not in ['research-offers','tabs']) or r['series'] in ['final-recovery.json','final-holdout.json','final-flights.json']]

engines=['app-auto','app-first','browser-use','ultrafast']
tasks=[t for t in ['search','filters','autocomplete','wizard-6','wizard-10','compare-offers','research-offers','tabs','wizard-4-new','compare-new','autocomplete-new','google-flights'] if any(r['task']==t for r in final)]
def median(rs,key='taskMs'):
 v=[r[key] for r in rs if r.get('success') and key in r]
 return S.median(v) if v else None
def fmt(n):return '—' if n is None else f'{n/1000:.2f}'
def summary(rs):return f'{fmt(median(rs))} s · {sum(bool(r.get("success")) for r in rs)}/{len(rs)}' if rs else '—'
lines=['| Task | Auto | First | Browser Use | Ultrafast | Auto vs First median change |','|---|---:|---:|---:|---:|---:|']
for task in tasks:
 groups={e:[r for r in final if r['task']==task and r['engine']==e] for e in engines}
 m=[median(groups[e]) for e in engines[:2]]
 delta=f'{(m[0]/m[1]-1)*100:+.1f}%' if all(m) else '—'
 lines+=['| '+' | '.join([task]+[summary(groups[e]) for e in engines]+[delta])+' |']
lines+=['','Mean components across every attempt in each group (not only successes):','','| Task / engine | n | Setup s | Task s | Model s | Jev s | Other s | Model / Jev calls | Cost USD |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for task in tasks:
 for engine in engines:
  rs=[r for r in final if r['task']==task and r['engine']==engine]
  if not rs:continue
  def avg(k):return S.mean([r[k] for r in rs if k in r]) if any(k in r for r in rs) else None
  other=[r['taskMs']-r.get('primaryMs',0)-r.get('jevMs',0) for r in rs if 'taskMs' in r and 'primaryMs' in r and 'jevMs' in r]
  lines+=['| '+' | '.join([task+' / '+engine,str(len(rs))]+[fmt(avg(k)) for k in ['setupMs','taskMs','primaryMs','jevMs']]+[fmt(S.mean(other) if other else None),f'{avg("primaryCalls"):.1f} / {avg("jevCalls"):.1f}' if avg('primaryCalls') is not None else '—',f'{sum(r.get("costUsd",0) for r in rs):.6f}'])+' |']
lines+=['','All series (routing and desktop use separate criteria):','','| File | Kind | Result | Reported USD |','|---|---|---:|---:|']
for name,d in docs.items():
 if 'results' not in d and 'checks' not in d:continue
 rs=d.get('results',d.get('checks',[]));kind='desktop' if 'checks' in d else 'routing' if name.startswith('decisions-') else 'execution'
 passed=sum(bool(r.get('passed',r.get('success',False))) for r in rs)
 lines+=['| '+ ' | '.join([name,kind,f'{passed}/{len(rs)}',f'{sum(r.get("costUsd",0) for r in rs):.6f}' if kind!='desktop' else 'not measured here'])+' |']
lines+=['','Every execution attempt, including failures (task time in seconds):','','| Series | Task | Engine | Repeat | Result | Time s | Model / Jev | USD |','|---|---|---|---:|---|---:|---:|---:|']
for name,d in docs.items():
 if name.startswith('decisions-') or 'checks' in d:continue
 for r in d.get('results',[]):
  lines+=['| '+' | '.join([name,r['task'],r['engine'],str(r['repeat']),'PASS' if r.get('success') else 'STOP (intentional)' if name.startswith('stop-') else 'FAIL',fmt(r.get('taskMs')),f'{r.get("primaryCalls","—")} / {r.get("jevCalls","—")}',f'{r.get("costUsd",0):.6f}'])+' |']
output.write_text('\n'.join(lines)+'\n')
stats={'selectedComparisonTrials':len(final),'rawFinalTrials':len(raw_final),'interruptedTrials':len(raw_final)-len(final),'successes':sum(r.get('success',False) for r in final),'finalCost':sum(r.get('costUsd',0) for r in final),'allReportedCost':sum(r.get('costUsd',0) for d in docs.values() for r in d.get('results',[])),'failures':[{k:r.get(k) for k in ['series','task','engine','repeat','taskMs','error','endReason','verification']} for r in final if not r.get('success')]}
output.with_suffix('.summary.json').write_text(json.dumps(stats,indent=2)+'\n')
print(json.dumps(stats,indent=2))
print('\n'.join(lines[:len(tasks)+2]))
with output.open('a') as f:
 f.write('\nEvery routing decision (tools are not executed):\n\n| Series | Case | Expected | Selected | Result | Time s | USD |\n|---|---|---|---|---|---:|---:|\n')
 for name,d in docs.items():
  if not name.startswith('decisions-'):continue
  for r in d['results']:
   f.write('| '+' | '.join([name,r['id'],r['expected'],r.get('mode','—'),'PASS' if r['passed'] else 'FAIL',fmt(r['elapsedMs']),f'{r.get("costUsd",0):.6f}'])+' |\n')
 f.write('\nEvery desktop check:\n\n| Series | Check | Result | Time s (when measured) |\n|---|---|---|---:|\n')
 for name,d in docs.items():
  for r in d.get('checks',[]):
   f.write('| '+' | '.join([name,r['check'],'PASS' if r['passed'] else 'FAIL',fmt(r.get('elapsedMs'))])+' |\n')
