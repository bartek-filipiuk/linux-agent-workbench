from pathlib import Path
import json,re,hashlib,sqlite3,subprocess
r=json.loads(Path('evidence/run.json').read_text());assert r['run']['state']=='completed'
report=Path.home()/'linux-agent-tutorial-research-workspace/python-cli-tools.md'
s=report.read_text();urls=['https://docs.astral.sh/uv/guides/tools/','https://pipx.pypa.io/stable/']
assert all(u in s for u in urls);assert 'uvx ruff' in s and 'pipx run ruff' in s
assert len(s.split())<180
start=next(m['atMs'] for m in r['markers'] if m['name']=='start_click')
done=next(e['atMs'] for e in r['events'] if e['event'].get('type')=='run.state' and e['event'].get('state')=='completed')
stages=[{'atMs':start,'label':'Auto chooses a planned approach.'}];nav=[]
for e in r['events']:
 v=e['event']
 if v.get('type')!='run.tool' or v.get('status')!='executing':continue
 p=v.get('preview','')
 if v['name']=='browser_act' and p.startswith('navigate '):
  nav.append(p[9:]);stages.append({'atMs':e['atMs'],'label':'Gemini reads the uv documentation.' if 'astral.sh' in p else 'Gemini reads the pipx documentation.'})
 if v['name']=='terminal_input':stages.append({'atMs':e['atMs'],'label':'Gemini writes the note, then displays the saved file.'})
assert all(u in nav for u in urls)
rows=[[c.strip() for c in l.strip().strip('|').split('|')] for l in s.splitlines() if l.startswith('|')]
data={'startMs':start,'taskSeconds':(done-start)/1000,'stages':stages,'prompt':r['prompt'],'recordedAt':r['captureDate'],'costUsd':r['run']['costUsd'],'jev':r['run']['jev'],'title':s.splitlines()[0].lstrip('# '),'intro':s.split('\n\n')[1],'headers':rows[0],'rows':rows[2:],'sources':urls,'reportSha256':hashlib.sha256(s.encode()).hexdigest(),'wordCount':len(s.split()),'viewSwitchMs':next(m['atMs'] for m in r['markers'] if m['name']=='view_terminal')}
Path('src/run-data.json').write_text(json.dumps(data,indent=2));Path('public/python-cli-tools.md').write_text(s)
Path('output/python-cli-tools.md').write_text(s)
c=sqlite3.connect(Path.home()/'.local/share/linux-agent-workbench-tutorial-research/state.sqlite')
events=c.execute("select ts,type,payload_json from run_events where run_id=? and type in ('browser.route','browser.task')",(r['run']['runId'],)).fetchall()
Path('evidence/route-events.json').write_text(json.dumps([{'ts':t,'type':typ,'payload':json.loads(p)} for t,typ,p in events],indent=2))
for name,t in [('uv',12.1),('pipx',15.3)]:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(t),'-i','public/capture.mp4','-vf','crop=876:548:124:300','-frames:v','1',f'public/{name}.png'],check=True)
print(json.dumps(data,indent=2))
