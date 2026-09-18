import json,math,pathlib
r=json.load(open('src/run-data.json'));fps=30
prompt=math.ceil((r['startMs']/1000-1.1)*fps)/fps
start=5+prompt;rate=2 if r['taskSeconds']>38 else 1
result=start+(math.ceil(r['taskSeconds']/rate*fps)+45)/fps
cues=[(0,5,'Give it a task. Watch it work.\nLinux Agent Workbench'),(5,start,'Select Browser → Jev Auto.\nEnter your task and press Start task.')]
for i,s in enumerate(r['stages']):
 a=start+(s['atMs']-r['startMs'])/1000/rate
 b=start+(r['stages'][i+1]['atMs']-r['startMs'])/1000/rate if i+1<len(r['stages']) else start+r['taskSeconds']/rate
 cues.append((a,b,s['label']))
cues.extend([(start+r['taskSeconds']/rate,result,f"Completed in {r['taskSeconds']:.1f} seconds.\nReal task execution shown at {rate}× speed."),(result,result+8,f"Playwright {r['version']} — {r['releaseDate']}\n{r['source']}"),(result+8,result+12,'Linux Agent Workbench · Jev Auto\ngithub.com/bartek-filipiuk/linux-agent-workbench')])
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
pathlib.Path('output/english.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}' for i,(a,b,text) in enumerate(cues))+'\n')
print('Subtitle cues:',len(cues))
