import json,math,pathlib
r=json.load(open('src/run-data.json'));fps=30
prompt=math.ceil((r['startMs']/1000-1.1)*fps)/fps
start=4.5+prompt;rate=2 if r['taskSeconds']>38 else 1
result=start+(math.ceil(r['taskSeconds']/rate*fps)+45)/fps
cues=[(0,4.5,'Read. Compare. Save something useful.\nTwo official sources → one Markdown file.'),(4.5,start,'Compare uv and pipx using their official guides.\nAsk for a short table saved to python-cli-tools.md.')]
for i,s in enumerate(r['stages']):
 a=start+(s['atMs']-r['startMs'])/1000/rate
 b=start+(r['stages'][i+1]['atMs']-r['startMs'])/1000/rate if i+1<len(r['stages']) else start+r['taskSeconds']/rate
 cues.append((a,b,s['label']))
cues.extend([(start+r['taskSeconds']/rate,result,'The comparison is saved in the workspace.'),(result,result+6,'The actual saved Markdown: isolation, one-off commands, and both source links.'),(result+6,result+13,f"{r['wordCount']} words. Completed in {r['taskSeconds']:.1f} seconds.\nAuto chose Gemini directly: zero Jev calls."),(result+13,result+17,'From browser tabs to work you can keep.\ngithub.com/bartek-filipiuk/linux-agent-workbench')])
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
pathlib.Path('output/english.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}' for i,(a,b,text) in enumerate(cues))+'\n')
print('Subtitle cues:',len(cues))
