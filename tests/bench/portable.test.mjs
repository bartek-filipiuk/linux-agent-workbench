import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {flightDateSpec,createFlights} from '../../scripts/jev-flights.mjs';
import {paths,privateConfig,repo} from '../../experiments/browser-auto/config.mjs';

test('Flight date rejects malformed, normalized and expired calendar dates',()=>{
  for(const date of ['2027-02-29','2026-13-01','2026-2-01','not-a-date'])assert.throws(()=>flightDateSpec(date));
  assert.equal(flightDateSpec('2028-02-29').iso,'2028-02-29');
  assert.throws(()=>flightDateSpec('2027-01-01',{requireFuture:true,now:new Date('2027-01-01T01:00Z')}));
  assert.equal(flightDateSpec('2027-01-02',{requireFuture:true,now:new Date('2027-01-01T23:59Z')}).short,'Sat, Jan 2');
});

test('Flights verifier uses the requested date and year, rejects a different result day and empty results',async()=>{
  const task=createFlights('2027-01-02');
  assert.match(task.goal,/January 2, 2027/);
  const snapshot={url:'https://www.google.com/travel/flights/search?tfs='+Buffer.from('2027-01-02').toString('base64url'),
    controls:[{label:'Where from?',value:'Zurich'},{label:'Where to?',value:'London'},
      {role:'combobox',label:'',value:'One way'},{label:'Departure',value:'Sat, Jan 2'},
      {label:'1 passenger'},{role:'combobox',label:'',value:'Economy'}],text:'',flights:['Select flight, Saturday, January 2, 2027']};
  const page={url:()=>snapshot.url,evaluate:async()=>snapshot};
  const browser={context:{pages:()=>[page]}};
  assert.equal((await task.verify(browser)).passed,true);
  snapshot.flights=['Select flight, Saturday, January 20'];
  assert.equal((await task.verify(browser)).checks.results,false);
  snapshot.flights=[];
  assert.equal((await task.verify(browser)).passed,false);
  snapshot.flights=['Select flight, Saturday, January 2, 2027'];
  snapshot.url='https://www.google.com/travel/flights/search?tfs='+Buffer.from('2026-01-02').toString('base64url');
  assert.equal((await task.verify(browser)).checks.year,false);
});

test('Portable paths respect explicit directories and an absent config does not require maintainer settings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'law paths '));
  try{
    const p=paths({LAW_BENCH_CACHE:root,XDG_CONFIG_HOME:path.join(root,'config')});
    assert.equal(p.baseline,path.join(root,'baseline'));
    assert.equal(p.native,path.join(root,'native'));
    assert.deepEqual(privateConfig(p.config),{});
    assert.equal(paths({LAW_BENCH_BASELINE:root}).baseline,root);
    assert.equal(paths({LAW_BENCH_NATIVE:root}).native,root);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Bootstrap refuses a different existing checkout without changing it or installing dependencies',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'law-baseline-'));
  try{
    const git=args=>execFileSync('git',args,{cwd:root,stdio:'pipe',encoding:'utf8'}).trim();
    git(['init']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture']);
    const before=git(['rev-parse','HEAD']);
    const result=spawnSync(process.execPath,['experiments/browser-auto/setup.mjs','--app-only'],{
      cwd:repo,env:{...process.env,LAW_BENCH_BASELINE:root,LAW_BENCH_CACHE:path.join(root,'cache')},encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Existing baseline is not clean at the pinned revision/);
    assert.equal(git(['rev-parse','HEAD']),before);
    assert.equal(fs.existsSync(path.join(root,'node_modules')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Runner rejects invalid budgets and options before requesting credentials',()=>{
  for(const args of [['--timeout','NaN'],['--max-cost','0'],['--runs','2','--runs','3'],['--tasks','search,typo'],['--config']]){
    const result=spawnSync(process.execPath,['experiments/browser-auto/run.mjs',...args],{
      cwd:repo,env:{...process.env,LAW_BENCH_CONFIG:'/nonexistent/benchmark.env'},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/positive and finite|Unknown or duplicate option|Unknown task|Missing value/);
    assert.doesNotMatch(result.stderr,/Configure .*API_KEY/);
  }
});
