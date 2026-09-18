import {createRequire} from 'node:module';
import {tasks,startSite,verify} from './tasks.mjs';
import {BrowserSession} from '../../services/browser-worker/dist/browser-session.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const site=await startSite(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'auto-fixtures-'));
const browser=new BrowserSession({profileDir:dir,viewport:{width:1120,height:780}});
const results=[];
try{
  await browser.start();
  for(const task of tasks.filter(t=>t.holdout)){
    await browser.navigate(`${site.url}/${task.id}`);const page=browser.context.pages()[0];
    if((await verify(task,browser)).passed)throw Error('Empty fixture accepted');
    if(task.id==='autocomplete-new'){
      await page.getByLabel('Destination').fill('Rome');await page.getByRole('button',{name:'Rome, Italy'}).click();
    }else if(task.id==='compare-new'){
      await page.getByLabel('Selected hotel').selectOption('Doria');await page.getByLabel('Total EUR').fill('392');
      if((await verify(task,browser)).passed)throw Error('Unsaved comparison accepted');
      await page.getByRole('button',{name:'Save comparison'}).click();
    }else{
      for(const city of ['Oslo','Riga','Tallinn','Helsinki']){
        await page.getByLabel('Destination').fill(city);await page.getByLabel('Traveler').fill('Lea');await page.getByLabel('Transport').selectOption('Train');
        await page.getByRole('button',{name:city==='Helsinki'?'Review':'Next segment',exact:true}).click();
      }
    }
    const result=await verify(task,browser);if(!result.passed)throw Error(`Fixture ${task.id} failed`);
    results.push({task:task.id,passed:true,verification:result});
  }
  console.log(JSON.stringify({kind:'deterministic fixture check; no model calls',results},null,2));
}finally{await browser.close();await site.close();fs.rmSync(dir,{recursive:true,force:true});}
