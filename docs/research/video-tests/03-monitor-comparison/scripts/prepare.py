from pathlib import Path
import json,csv,shutil,hashlib,sqlite3
root=Path.cwd();workspace=Path.home()/'linux-agent-tutorial-long-workspace'
verification=json.loads((root/'evidence/independent-check.json').read_text());assert verification['allStructuralChecksPassed']
for name in ['candidates.csv','decision.md','score-check.json','validate_scores.py','generate_candidates.py']:
 shutil.copyfile(workspace/name,root/'output'/name)
 shutil.copyfile(workspace/name,root/'public'/name)
def clip(name,file):
 r=json.loads((root/'evidence'/file).read_text());start=next(m['atMs']for m in r['markers']if m['name']=='start_click');end=next(e['atMs']for e in r['events']if e['event'].get('type')=='run.state'and e['event'].get('state')=='completed')
 stages=[{'atMs':start,'label':'Gemini plans the research.'}];nav=[]
 for e in r['events']:
  v=e['event'];p=v.get('preview','')
  if v.get('type')!='run.tool'or v.get('status')!='executing':continue
  if v['name']=='browser_act'and p.startswith('navigate '):
   nav.append(p)
   product='Uptime Kuma'if'uptime-kuma'in p else 'Gatus'if'gatus'in p.lower()else'Tianji'if'tianji'in p else'the official source'
   label='Check official release information.'if'releases'in p else 'Research '+product+'.'
   if 'apprise'in p:label='Check the supported notification integration.'
   stages.append({'atMs':e['atMs'],'label':label})
  elif v['name']=='terminal_input':
   label='Write and inspect the local deliverables.'
   if 'validate_scores' in p or 'score-check' in p:label='Run the Python score check and inspect its output.'
   elif 'decision.md'in p:label='Write and review the decision report.'
   stages.append({'atMs':e['atMs'],'label':label})
 stable=[]
 for s in stages:
  if not stable or stable[-1]['label']!=s['label']:stable.append(s)
 return {'name':name,'startMs':start,'taskSeconds':(end-start)/1000,'stages':stable,'costUsd':r['run']['costUsd'],'turns':r['run']['turns'],'toolCalls':r['run']['toolCalls'],'navigationActions':len(nav),'jevDecisions':r['run']['jev']['decisions'],'runId':r['run']['runId']}
original=clip('Original run','run.json');recovery=clip('Follow-up','recovery.json')
data={'original':original,'recovery':recovery,'rows':verification['rows'],'winner':verification['winnerByGivenRules'],'wordCount':verification['wordCount'],'checksPassed':sum(verification['checks'].values()),'firstPassFailed':True,'recoveryRequiredExternalFeedback':True}
(root/'src/run-data.json').write_text(json.dumps(data,indent=2));print(json.dumps(data,indent=2))
