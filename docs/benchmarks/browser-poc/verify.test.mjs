import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startSite,tasks,verify} from './tasks.mjs';
import {BrowserSession} from '/home/bartek/linux-agent-jev/services/browser-worker/dist/browser-session.js';

test('Independent verifiers reject incomplete, misleading and incorrect UI outcomes',async()=>{
  const site=await startSite();const profile=fs.mkdtempSync(path.join(os.tmpdir(),'poc-verifier-'));
  const browser=new BrowserSession({profileDir:profile,channel:'chromium'});
  try{
    await browser.start();
    for(const id of ['wizard-6','wizard-10']){
      const task=tasks.find(t=>t.id===id);await browser.navigate(`${site.url}/${id}`);
      assert.equal((await verify(task,browser)).passed,false,'unfinished wizard');
      const page=browser.context.pages()[0];
      const cities=['Basel','Bern','Lucerne','Lausanne','Lugano','Chur','St Gallen','Winterthur','Baden','Thun'].slice(0,Number(id.split('-')[1]));
      for(const city of cities){await page.getByLabel('Destination').fill(city);await page.getByLabel('Traveler').fill('Ada');await page.getByLabel('Transport').selectOption({label:'Train'});await page.getByRole('button').click();}
      assert.equal((await verify(task,browser)).passed,true,'complete correct wizard');
      await page.evaluate(()=>{window.records[2].person='Wrong';});
      assert.equal((await verify(task,browser)).passed,false,'success heading cannot hide a wrong segment');
    }
    const task=tasks.find(t=>t.id==='compare-offers');await browser.navigate(`${site.url}/${task.id}`);
    const page=browser.context.pages()[0];
    await page.getByLabel('Selected hotel').selectOption({label:'Bello'});await page.getByLabel('Total EUR').fill('327');
    assert.equal((await verify(task,browser)).passed,false,'unsaved inputs');
    await page.getByRole('button').click();assert.equal((await verify(task,browser)).passed,true);
    await page.getByLabel('Total EUR').fill('109');await page.getByRole('button').click();
    assert.equal((await verify(task,browser)).passed,false,'nightly price is not three-night total');
    const research=tasks.find(t=>t.id==='research-offers');await browser.navigate(`${site.url}/${research.id}`);
    await page.getByLabel('Selected provider').selectOption({label:'Boreal'});await page.getByLabel('First-year total EUR').fill('744');await page.getByRole('button').click();
    assert.equal((await verify(research,browser)).passed,false,'correct guess without reading all required pages');
    for(const name of ['Atlas','Boreal','Cedar']){await page.getByRole('link',{name:`${name} offer`}).click();await page.getByRole('link',{name:'Comparison',exact:true}).click();}
    await page.getByLabel('Selected provider').selectOption({label:'Boreal'});await page.getByLabel('First-year total EUR').fill('744');await page.getByRole('button').click();
    assert.equal((await verify(research,browser)).passed,true);
  }finally{await browser.close();await site.close();fs.rmSync(profile,{recursive:true,force:true});}
});
