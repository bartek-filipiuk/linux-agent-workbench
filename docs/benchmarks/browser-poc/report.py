"""Summarize retained attempts; failures remain in denominators."""
import argparse
import json
from pathlib import Path
import statistics

def quantile(xs, q):
    if not xs:
        return None
    xs = sorted(xs)
    pos = (len(xs) - 1) * q
    low = int(pos)
    return xs[low] + (xs[min(low + 1, len(xs) - 1)] - xs[low]) * (pos - low)


def summarize(rows):
    timed = [r for r in rows if r.get('taskMs') is not None]
    good = [r for r in rows if r.get('success')]
    times = [r['taskMs'] / 1000 for r in good]
    return {'attempts': len(rows), 'successes': len(good), 'setupFailures': len(rows)-len(timed),
            'medianSeconds': statistics.median(times) if times else None,
            'p90Seconds': quantile(times, .9), 'minSeconds': min(times) if times else None,
            'maxSeconds': max(times) if times else None,
            'meanAllTimedSeconds': statistics.mean(r['taskMs']/1000 for r in timed) if timed else None,
            'meanSetupSeconds': statistics.mean(r['setupMs']/1000 for r in rows) if rows else None,
            'meanPrimarySeconds': statistics.mean(r.get('primaryMs',0)/1000 for r in timed) if timed else None,
            'meanJevSeconds': statistics.mean(r.get('jevMs',0)/1000 for r in timed) if timed else None,
            'primaryCalls': sum(r.get('primaryCalls',0) for r in rows),
            'jevCalls': sum(r.get('jevCalls',0) for r in rows),
            'costUsd': sum(r.get('costUsd',0) for r in rows),
            'failures': [{'task':r['task'],'repeat':r['repeat'],'error':r.get('error'),
                          'state':r.get('state'),'verification':r.get('verification')} for r in rows if not r.get('success')]}


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('reports',nargs='+')
    parser.add_argument('--output')
    args=parser.parse_args()
    data=[json.loads(Path(p).read_text()) for p in args.reports]
    rows=[r for d in data for r in d['results']]
    out={'sources':[{'file':p,'source':d['source']} for p,d in zip(args.reports,data)],'byTask':{},'byCategory':{}}
    for group,key in [('byTask','task'),('byCategory','category')]:
        for name in sorted({r[key] for r in rows}):
            out[group][name]={engine:summarize([r for r in rows if r[key]==name and r['engine']==engine]) for engine in sorted({r['engine'] for r in rows})}
    out['flightsByProfile']={f'{engine}-{profile}':summarize([r for r in rows if r['task']=='google-flights' and r['engine']==engine and bool(r['warm'])==warm]) for engine in sorted({r['engine'] for r in rows}) for profile,warm in [('fresh',False),('warm',True)]}
    out['totalReportedCostUsd']=sum(r.get('costUsd',0) for r in rows)
    if args.output:Path(args.output).write_text(json.dumps(out,indent=2))
    for task,groups in out['byTask'].items():
        for engine,s in groups.items():
            med='—' if s['medianSeconds'] is None else f"{s['medianSeconds']:.2f}s"
            p90='—' if s['p90Seconds'] is None else f"{s['p90Seconds']:.2f}s"
            print(f"{task:20s} {engine:12s} {s['successes']}/{s['attempts']} median={med} p90={p90} LLM={s['primaryCalls']} Jev={s['jevCalls']} ${s['costUsd']:.4f}")
    print(f"Total reported cost ${out['totalReportedCostUsd']:.4f}")
