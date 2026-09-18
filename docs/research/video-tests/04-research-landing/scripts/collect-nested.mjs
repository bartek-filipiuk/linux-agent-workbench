import { _electron } from '/home/bartek/linux-agent/services/browser-worker/node_modules/playwright/index.mjs';
import fs from 'node:fs';import {spawn} from 'node:child_process';
const root='/home/bartek/linux-agent-tutorial-04',workspace='/home/bartek/linux-agent-tutorial-landing-workspace';
const report={startedAt:new Date().toISOString(),reason:'Original app run failed with OpenRouter 429 while nested Claude process continued. Reopen app to restore its egress proxy; no new model task submitted.',events:[]};
const app=await _electron.launch({executablePath:'/home/bartek/linux-agent/apps/desktop/node_modules/electron/dist/electron',args:['/home/bartek/linux-agent/apps/desktop'],env:{...process.env,DISPLAY:':99',LAW_INSTANCE:'tutorial-landing',ELECTRON_RENDERER_URL:''},timeout:60000});
const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds({x:0,y:0,width:1600,height:900});w.setFullScreen(true)});await page.waitForFunction(()=>window.workbench!==undefined);
await page.waitForTimeout(4000);await page.getByRole('tab',{name:'Terminal',exact:true}).click();
await page.screenshot({path:root+'/evidence/resumed-session.png'});
const log=fs.openSync(root+'/evidence/collect-ffmpeg.log','w');const rec=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-video_size','1600x900','-draw_mouse','0','-i',':99.0','-an','-c:v','libx264','-preset','ultrafast','-crf','16','-pix_fmt','yuv420p',root+'/public/collection.mp4'],{stdio:['pipe','ignore',log]});
report.captureStartMs=Date.now();console.log('Reopened app; collecting existing nested Claude invocation.');
const deadline=Date.now()+360000;
while(Date.now()<deadline){if(fs.existsSync(workspace+'/build-timing.json')&&fs.statSync(workspace+'/claude-result.json').size>0)break;await page.waitForTimeout(2000)}
report.finishedAt=new Date().toISOString();report.nestedResultAvailable=fs.existsSync(workspace+'/build-timing.json');
if(report.nestedResultAvailable){report.nestedTiming=JSON.parse(fs.readFileSync(workspace+'/build-timing.json'));const r=JSON.parse(fs.readFileSync(workspace+'/claude-result.json'));report.nestedResult={subtype:r.subtype,is_error:r.is_error,duration_ms:r.duration_ms,duration_api_ms:r.duration_api_ms,num_turns:r.num_turns,total_cost_usd:r.total_cost_usd,modelUsage:r.modelUsage};}
await page.screenshot({path:root+'/evidence/collected-session.png'});await page.waitForTimeout(3000);rec.stdin.write('q');await new Promise(r=>rec.once('exit',r));fs.writeFileSync(root+'/evidence/collection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await app.close();
