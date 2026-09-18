import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=fileURLToPath(new URL('../',import.meta.url));
const appRoot=process.env.LAW_APP_ROOT ?? path.resolve(dir,'../linux-agent');
const display=process.env.LAW_CAPTURE_DISPLAY ?? ':99';
const instance=process.env.LAW_CAPTURE_INSTANCE ?? 'tutorial-landing';
const {_electron}=await import(pathToFileURL(path.join(appRoot,'services/browser-worker/node_modules/playwright/index.mjs')).href);
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
if(fs.existsSync(dir+'/public/final.mp4'))throw Error('Preserve the existing capture and evidence before making another take.');
const app=await _electron.launch({executablePath:path.join(appRoot,'apps/desktop/node_modules/electron/dist/electron'),args:[path.join(appRoot,'apps/desktop')],env:{...process.env,DISPLAY:display,LAW_INSTANCE:instance,ELECTRON_RENDERER_URL:''},timeout:60000});
let recorder;
const report={captureDate:new Date().toISOString(),prompt:fs.readFileSync(dir+'/evidence/final-task.txt','utf8'),events:[],markers:[]};
async function wait(fn,ms=120000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(250);}throw Error('Wait timed out');}
try{
 const page=await app.firstWindow();
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds({x:0,y:0,width:1600,height:900});w.setFullScreen(true);});
 await page.waitForFunction(()=>window.workbench!==undefined);
 await wait(()=>page.evaluate(async()=>(await window.workbench.getSession()).state==='ready'));
 await page.getByRole('tab',{name:'Browser',exact:true}).click();
 await page.evaluate(()=>window.workbench.startBrowser());
 await wait(()=>page.evaluate(async()=>(await window.workbench.getBrowser()).state==='ready'));
 const previousId=(await page.evaluate(()=>window.workbench.getRun())).run.runId;
 console.log('Follow-up UI ready');
 
 await page.screenshot({path:dir+'/evidence/final-ready.png'});
 console.log('READY_FOR_CAPTURE');
 await delay(1000);
 let visibleSurface='Browser';
 await page.exposeFunction('recordEvent',async e=>{
  const item={atMs:Date.now()-report.captureStartMs,event:e};report.events.push(item);
  fs.appendFileSync(dir+'/evidence/final-events-live.jsonl',JSON.stringify(item)+'\n',{mode:0o600});
  if(e.type==='run.tool'&&e.status==='executing'){
   const surface=e.name.startsWith('terminal_')?'Terminal':e.name.startsWith('browser_')?'Browser':null;
   if(surface&&surface!==visibleSurface){visibleSurface=surface;report.markers.push({name:'view_'+surface.toLowerCase(),atMs:Date.now()-report.captureStartMs});await page.getByRole('tab',{name:surface,exact:true}).click();}
  }
 });
 await page.evaluate(()=>{window.workbench.onRun(e=>window.recordEvent(e));});
 const log=fs.openSync(dir+'/evidence/final-ffmpeg.log','w');
 recorder=spawn('ffmpeg',['-hide_banner','-y','-f','x11grab','-framerate','30','-video_size','1600x900','-draw_mouse','0','-i',display+'.0','-an','-c:v','libx264','-preset','ultrafast','-crf','16','-pix_fmt','yuv420p',dir+'/public/final.mp4'],{stdio:['pipe','ignore',log]});
 report.captureStartMs=Date.now();
 const mark=name=>report.markers.push({name,atMs:Date.now()-report.captureStartMs});
 await delay(1500);mark('typing_start');
 const input=page.getByLabel('Continue this conversation',{exact:true});await input.click();await input.fill(report.prompt);mark('typing_end');
 await delay(4200);
 mark('start_click');report.taskStartMs=Date.now();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await wait(()=>page.evaluate(async id=>(await window.workbench.getRun()).run.runId!==id,previousId),30000);
 await wait(()=>page.evaluate(async()=>['completed','failed','stopped','handoff'].includes((await window.workbench.getRun()).run.state)),600000);
 report.taskEndMs=Date.now();mark('task_end');report.run=(await page.evaluate(()=>window.workbench.getRun())).run;
 const b=await page.evaluate(()=>window.workbench.getBrowser());report.browser={url:b.url,title:b.title};
 await page.screenshot({path:dir+'/evidence/final-result.png'});
 console.log('RESULT',JSON.stringify({state:report.run.state,final:report.run.finalText,elapsedMs:report.taskEndMs-report.taskStartMs,jev:report.run.jev,browser:report.browser}));
 await delay(8000);mark('capture_end');
 recorder.stdin.write('q');await new Promise(r=>recorder.once('exit',r));recorder=null;
 fs.writeFileSync(dir+'/evidence/final.json',JSON.stringify(report,null,2),{mode:0o600});
 console.log('CAPTURE_COMPLETE');
}catch(e){console.error(e);try{await app.firstWindow().then(p=>p.evaluate(()=>window.workbench.stopRun()));}catch{}fs.writeFileSync(dir+'/evidence/capture-error.txt',String(e));fs.writeFileSync(dir+'/evidence/run-error.json',JSON.stringify(report,null,2),{mode:0o600});process.exitCode=1;}
finally{if(recorder){recorder.stdin.write('q');await new Promise(r=>recorder.once('exit',r));}await app.close();}
