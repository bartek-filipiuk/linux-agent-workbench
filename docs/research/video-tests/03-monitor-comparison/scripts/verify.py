"""Independent file checks; these are not the agent's own validator."""
from pathlib import Path
import csv,json,hashlib,re
root=Path.cwd();workspace=Path.home()/'linux-agent-tutorial-long-workspace'
weights={'docker':20,'http':20,'tcp':15,'slack':15,'status_page':10,'config_as_code':20}
required=['docker','http','tcp','slack']
expected=['product',*weights,'license','latest_release','release_date','score','source_urls']
repos={'Uptime Kuma':'uptime-kuma','Gatus':'gatus','Tianji':'tianji'}
with (workspace/'candidates.csv').open(newline='')as f:
 reader=csv.DictReader(f);rows=list(reader);columns=reader.fieldnames
checks={'columns':columns==expected,'threeDistinctProducts':set(r['product']for r in rows)==set(repos)and len(rows)==3}
results=[]
for r in rows:
 name=r['product'];score=sum(v for k,v in weights.items()if r[k]=='yes');ref=json.loads((root/'evidence/independent-sources'/(repos[name]+'.json')).read_text())
 checks[name+'_values']=all(r[k]in ['yes','no','unknown']for k in weights)
 checks[name+'_arithmetic']=int(r['score'])==score
 checks[name+'_release']=r['latest_release']==ref['latestRelease']
 checks[name+'_UTC_date']=r['release_date']==ref['publishedAt'][:10]
 checks[name+'_license']=r['license']==ref['license']
 results.append({'product':name,'score':score,'csvScore':int(r['score']),'eligible':all(r[k]=='yes'for k in required),'features':{k:r[k]for k in weights},'release':r['latest_release'],'releaseDate':r['release_date']})
s=(workspace/'decision.md').read_text();checks['under650Words']=len(s.split())<650;checks['fiveChecklistSteps']=len(re.findall(r'^\d+\.\s',s,re.M))==5
checks['agentValidatorTrue']=json.loads((workspace/'score-check.json').read_text())['validation_passed']is True
checks['decisionLinks']=len(re.findall(r'https?://[^\s)>]+',s))>=3
eligible=[r for r in results if r['eligible']];winner=max(eligible,key=lambda r:r['score'])['product']if eligible else None
report={'checks':checks,'allStructuralChecksPassed':all(checks.values()),'rows':results,'winnerByGivenRules':winner,'wordCount':len(s.split()),'limits':'Schema, arithmetic, latest release/license/UTC-date metadata and report format are checked. Feature evidence and recommendation prose also require human/assistant source review; this is not a deployment or alert-delivery test.'}
(root/'evidence/independent-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
