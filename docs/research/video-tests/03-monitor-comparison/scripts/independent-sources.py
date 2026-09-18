import urllib.request,json,base64,pathlib,concurrent.futures,datetime
root=pathlib.Path('evidence/independent-sources');root.mkdir(exist_ok=True)
repos=['louislam/uptime-kuma','TwiN/gatus','msgbyte/tianji']
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Workbench-Demo-Verification','Accept':'application/vnd.github+json'})
 return json.load(urllib.request.urlopen(req,timeout=30))
def fetch(repo):
 name=repo.split('/')[-1];base='https://api.github.com/repos/'+repo
 meta=get(base);rel=get(base+'/releases/latest');readme=get(base+'/readme')
 text=base64.b64decode(readme['content']).decode();(root/(name+'-README.md')).write_text(text)
 data={'repo':repo,'license':(meta.get('license')or{}).get('spdx_id'),'defaultBranch':meta['default_branch'],'latestRelease':rel['tag_name'],'publishedAt':rel['published_at'],'releaseUrl':rel['html_url'],'readmeUrl':readme['html_url'],'readmeSha':readme['sha'],'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (root/(name+'.json')).write_text(json.dumps(data,indent=2));return data
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for x in pool.map(fetch,repos):print(json.dumps(x))
