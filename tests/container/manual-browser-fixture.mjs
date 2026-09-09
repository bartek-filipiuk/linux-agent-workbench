// Runs inside the browser image with a disposable profile, never the user's profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { BrowserSession } from '/opt/law/worker/browser-session.js';
const profile = fs.mkdtempSync('/tmp/law-manual-fixture-');
let signedIn = false;
const server = http.createServer((req,res) => {
  if (req.url === '/signed-in') { signedIn = true; res.setHeader('Set-Cookie', 'fixture_session=persisted; Max-Age=3600; SameSite=Lax'); }
  res.setHeader('Content-Type','text/html');
  res.end(`<title>${req.headers.cookie?.includes('fixture_session=persisted') ? 'Session restored' : 'Login fixture'}</title><h1>Manual browser test</h1><p>Full browser window, including the address bar.</p><input placeholder="Type here" autofocus>`);
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const url = `http://127.0.0.1:${server.address().port}`;
const s = new BrowserSession({profileDir:profile, manualAvailable:true});
let frames = 0; let lastFrame;
s.onFrame(f => { frames++; lastFrame = f.jpeg; });
async function until(check) { for(let i=0;i<100;i++) { if(check()) return; await sleep(100); } throw new Error('fixture timed out'); }
try {
  await s.start(); await s.navigate(url); await s.setFramesEnabled(true);
  assert.equal((await s.control({kind:'manual',enabled:true})).manual,true);
  await assert.rejects(s.observe({screenshot:true}), /Manual login/);
  const base = frames; await until(()=>frames>base+2);
  await s.input({kind:'keydown',key:'Control'}); await s.input({kind:'keydown',key:'l'});
  await s.input({kind:'keyup',key:'l'}); await s.input({kind:'keyup',key:'Control'});
  await s.input({kind:'insert',text:url+'/signed-in'});
  await s.input({kind:'keydown',key:'Enter'}); await s.input({kind:'keyup',key:'Enter'});
  await until(()=>signedIn); await sleep(500);
  fs.writeFileSync('/downloads/manual-window.jpg',lastFrame);
  await s.setFramesEnabled(false); const hidden=frames; await sleep(400); assert.equal(frames,hidden);
  await s.setFramesEnabled(true); await until(()=>frames>hidden);
  assert.equal((await s.control({kind:'manual',enabled:false})).manual,false);
  assert.equal((await s.observe()).title,'Session restored');
  await s.close();
  const childScript = `import {BrowserSession} from '/opt/law/worker/browser-session.js'; const s=new BrowserSession({profileDir:${JSON.stringify(profile)},manualAvailable:true}); await s.start(); await s.control({kind:'manual',enabled:true}); console.log('ready'); setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['--input-type=module','-e',childScript], {stdio:['ignore','pipe','inherit']});
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('crash fixture startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(t);resolve();});child.once('error',reject);});
  child.kill('SIGKILL'); await new Promise(r=>child.once('exit',r));
  // Parent death closes the watchdog pipes; reopening waits for the old Chromium to release its profile.
  const recovered = new BrowserSession({profileDir:profile,manualAvailable:true});
  try { await recovered.start(); assert.equal((await recovered.info()).manual,true); await assert.rejects(recovered.observe(), /Manual login/); await recovered.control({kind:'manual',enabled:false}); }
  finally { await recovered.close(); }
  console.log(JSON.stringify({manualWindow:true,input:true,hiddenFramesPaused:true,cookiesPersisted:true,automationBlocked:true,crashRecovery:true}));
} finally { await s.close(); server.closeAllConnections(); await new Promise(r=>server.close(r)); fs.rmSync(profile,{recursive:true,force:true}); }
