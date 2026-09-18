import json,math,pathlib
r=json.load(open('src/run-data.json'));fps=30
orig=(math.ceil(r['original']['taskSeconds']/2*fps)+30)/fps
rec=(math.ceil(r['recovery']['taskSeconds']/2*fps)+30)/fps
audit=13+orig;follow=audit+11;recovery=follow+6;result=recovery+rec;end=result+15
cues=[(0,5,'A bigger task. A real test.\nThree uptime monitors: Uptime Kuma, Gatus, Tianji.'),(5,13,'Research six capabilities, compute weighted scores,\nand save CSV, a decision report and a Python score check.')]
for start,key in [(13,'original'),(recovery,'recovery')]:
 clip=r[key]
 for i,s in enumerate(clip['stages']):
  a=start+(s['atMs']-clip['startMs'])/2000
  b=start+(clip['stages'][i+1]['atMs']-clip['startMs'])/2000 if i+1<len(clip['stages'])else start+clip['taskSeconds']/2
  if b-a>.5:cues.append((a,b,s['label']+'\nRecorded footage at 2× speed.'))
cues.extend([(audit,follow,'First attempt failed: the report said 70; the validator computed 80.\nThe model finished despite validation_passed: false.'),(follow,recovery,'A reviewer explicitly requests corrections.\nThis is prompted recovery, not an autonomous first-pass success.'),(result,result+7,'Corrected scores: Gatus 100, Uptime Kuma 80, Tianji 80.\nThe independent artifact checks now pass.'),(result+7,end,'Unknown feature evidence remains labeled unknown.\nOriginal task 179.1 s; follow-up 93.2 s. No deployment tested.'),(end,end+5,'A useful result. A visible failure to learn from.\nLinux Agent Workbench · Jev Auto')]);cues.sort()
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
pathlib.Path('output/english.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}'for i,(a,b,text)in enumerate(cues))+'\n')
print(len(cues),'cues')
