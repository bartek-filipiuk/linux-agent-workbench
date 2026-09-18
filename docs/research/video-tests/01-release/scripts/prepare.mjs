import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const r=JSON.parse(fs.readFileSync('evidence/run.json','utf8'));
const v=JSON.parse(fs.readFileSync('evidence/github-verification.json','utf8'));
if(r.run.state!=='completed'||!r.run.finalText.includes(v.tag_name))throw Error('Run did not independently match GitHub release');
if(r.browser.url!==v.html_url)throw Error('Release page was not left visible');
const startMs=r.markers.find(m=>m.name==='start_click').atMs;
const done=r.events.find(e=>e.event.type==='run.state'&&e.event.state==='completed');
const taskSeconds=(done.atMs-startMs)/1000;
let active=false;const stages=[{atMs:startMs,label:'Gemini plans the next step.'}];
for(const {atMs,event:e}of r.events){
 if(e.type!=='run.tool')continue;
 if(e.name==='browser_task'&&e.status==='executing'){active=true;stages.push({atMs,label:'Gemini delegates the browser subtask to Jev.'});}
 if(e.name==='browser_task'&&e.status==='done'){active=false;stages.push({atMs,label:r.run.jev?.fallbacks?'Jev asks for help. Gemini takes over.':'Gemini reads the evidence and plans what comes next.'});}
 if(!active&&e.name==='browser_batch'&&e.status==='executing')stages.push({atMs,label:'Gemini uses a planned browser action.'});
 if(!active&&e.name==='browser_read'&&e.status==='executing')stages.push({atMs,label:'Gemini reads the page to check the answer.'});
}
const data={version:v.tag_name,releaseDate:new Date(v.published_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}),source:v.html_url,startMs,taskSeconds,stages:stages.filter((s,i)=>!stages[i+1]||stages[i+1].atMs-s.atMs>=700),prompt:r.prompt,recordedAt:r.captureDate,model:r.run.model??'google/gemini-3.8-flash',jev:r.run.jev,costUsd:r.run.costUsd};
fs.writeFileSync('src/run-data.json',JSON.stringify(data,null,2));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String((r.markers.find(m=>m.name==='capture_end').atMs-1800)/1000),'-i','public/capture.mp4','-vf','crop=876:548:124:300','-frames:v','1','public/release.png']);
console.log(JSON.stringify(data,null,2));
