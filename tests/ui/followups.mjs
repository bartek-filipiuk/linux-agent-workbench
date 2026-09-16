import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../../services/browser-worker/node_modules/playwright/index.mjs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'law-followup-ui-'));
const repo=fileURLToPath(new URL('../../',import.meta.url));
const root=path.join(repo,'apps/desktop/out/renderer');
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://localhost').pathname);const file=p.endsWith('/')?p+'index.html':p;res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');try{res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const handlers={};const emit=(name,data)=>(handlers[name]||[]).forEach(f=>f(data));
 let state='completed', runId='r1';let messages=[{id:'r1:user',role:'user',text:'Compare graphics card prices and save a report.'},{id:'r1:assistant',role:'assistant',text:'Saved the comparison and source links to /workspace/research.md. The report contains the observed prices and recommendations.'}];
 const common={activityVersion:1,turns:16,toolCalls:24,costUsd:null,snapshot:false,approvals:[],log:[],runId,state,finalText:messages[1].text};
 const browserState={state:'ready',title:'Switching browser mode',generation:1,transitioning:true,manual:false,manualAvailable:true};
 window.fixture={emit,calls:[]};
 const api={
 getStatus:async()=>({type:'agentd.ready',model:'Codex subscription',schemaVersion:5}),getSession:async()=>({state:'ready',workspacePath:'/workspace/research',networkMode:'open'}),getNetwork:async()=>'open',getPolicy:async()=>({nestedAutonomy:true,domainMode:'open'}),getLease:async()=>({terminal:{owner:'human'},browser:{owner:'human'}}),getBrowser:async()=>browserState,
 getRun:async()=>({run:common,goal:messages[0].text,handoff:null,sequence:0}),getHistory:async()=>[],getConversation:async()=>({runId,conversationId:'c1',state,messages}),getTerminalStalled:async()=>false,
 checkSetup:async()=>({provider:'codex',account:{state:'ready'},podman:true,image:true,providerReady:true,workspace:'/workspace/research'}),getModels:async()=>({provider:'codex',configuredModel:'codex-default',models:[]}),getDiagnostics:async()=>({running:false,step:''}),
 sendFollowup:async(id,message)=>{window.fixture.calls.push({kind:'followup',id,message});runId='r2';state='running';messages.push({id:'r2:user',role:'user',text:message});emit('onRun',{type:'run.state',runId,state,goal:message,turns:16,toolCalls:24,costUsd:null,snapshot:false});return {runId};},
 pauseRun:async(id)=>{window.fixture.calls.push({kind:'pause',id});state='stopped';emit('onRun',{type:'run.state',runId,state,endReason:'user_pause',turns:16,toolCalls:24,costUsd:null,snapshot:false});},
 restartBrowser:async()=>{window.fixture.calls.push({kind:'restart'});browserState.transitioning=false;emit('onBrowserState',{...browserState,title:'Browser restarted'});},
 };
 window.workbench=new Proxy(api,{get:(o,key)=>key in o?o[key]:String(key).startsWith('on')?(fn)=>{(handlers[key]??=[]).push(fn);return()=>{handlers[key]=handlers[key].filter(x=>x!==fn);};}:()=>Promise.resolve()});
});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('tab',{name:'Browser',exact:true}).click();
 await page.getByLabel('Continue this conversation',{exact:true}).waitFor();
 if(!await page.getByRole('button',{name:'Restart browser',exact:true}).isEnabled())throw Error('Reset disabled during stalled transition');
 if(await page.getByRole('button',{name:'Continue',exact:true}).isEnabled())throw Error('Followup enabled during manual transition');
 await page.screenshot({path:path.join(artifacts,'stalled.png')});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart browser',exact:true}).click();
 await page.getByLabel('Continue this conversation',{exact:true}).fill('Make /workspace/research.md shorter.');
 await page.getByLabel('Continue this conversation',{exact:true}).press('Control+Enter');
 await page.getByRole('button',{name:'Interrupt & send',exact:true}).waitFor();
 await page.getByLabel('Guide the agent',{exact:true}).fill('Focus on the conclusion.');
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
 if(await page.getByLabel('Continue this conversation',{exact:true}).inputValue()!=='Focus on the conclusion.')throw Error('Pause lost draft');
 await page.screenshot({path:path.join(artifacts,'desktop.png')});
 await page.setViewportSize({width:1024,height:768});
 await page.screenshot({path:path.join(artifacts,'compact.png')});
 const calls=await page.evaluate(()=>window.fixture.calls);
 if(calls.filter(c=>c.kind==='followup').length!==1)throw Error('Duplicate followup');
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({passed:true,calls,artifacts}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
