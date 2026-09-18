#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {repo, paths, BASELINE_COMMIT, sha256, verifyBaseline, verifyNative} from './config.mjs';

const argv = process.argv.slice(2);
if (argv.some(a => !['--app-only','--check'].includes(a))) throw Error('Usage: pnpm bench:setup [--app-only] [--check]');
const p = paths();
const native = !argv.includes('--app-only');
if (argv.includes('--check')) {
  verifyBaseline(p.baseline);
  if (native) verifyNative(p.native);
  console.log('Pinned baseline build and requested native sources verified. No API calls.');
} else {
  const run = (command,args,cwd) => execFileSync(command,args,{cwd,stdio:'inherit'});
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node 24 or newer.');
  fs.mkdirSync(p.cache,{recursive:true,mode:0o700});
  if (!fs.existsSync(p.baseline)) {
    fs.mkdirSync(path.dirname(p.baseline),{recursive:true});
    run('git',['clone','--no-hardlinks','--no-checkout',repo,p.baseline],repo);
    run('git',['checkout','--detach',BASELINE_COMMIT],p.baseline);
  }
  const git = args => execFileSync('git',args,{cwd:p.baseline,encoding:'utf8'}).trim();
  if (git(['rev-parse','HEAD']) !== BASELINE_COMMIT || git(['status','--porcelain','--untracked-files=normal'])) {
    throw Error('Existing baseline is not clean at the pinned revision. Choose a new LAW_BENCH_BASELINE directory; setup never resets your checkout.');
  }
  run('pnpm',['install','--frozen-lockfile'],p.baseline);
  run('pnpm',['build'],p.baseline);
  const files={};
  for (const dir of ['packages/protocol/dist','services/agentd/dist','services/browser-worker/dist']) {
    for (const entry of fs.readdirSync(path.join(p.baseline,dir),{recursive:true,withFileTypes:true})) {
      if (!entry.isFile()) continue;
      const file=path.join(entry.parentPath,entry.name);
      files[path.relative(p.baseline,file)]=sha256(file);
    }
  }
  fs.writeFileSync(path.join(path.resolve(p.baseline,git(['rev-parse','--git-dir'])),'law-benchmark-build.json'),JSON.stringify({commit:BASELINE_COMMIT,files},null,2)+'\n');
  verifyBaseline(p.baseline);
  run('pnpm',['build'],repo);
  run('pnpm',['--filter','@law/browser-worker','exec','playwright','install','chromium'],repo);
  if (native) {
    fs.mkdirSync(p.native,{recursive:true,mode:0o700});
    for (const file of ['driver.py','bootstrap.py','check_upstream.py','requirements.lock','sources.json']) {
      const from=path.join(repo,'docs/benchmarks/browser-poc',file),to=path.join(p.native,file);
      if (fs.existsSync(to) && sha256(to)!==sha256(from)) throw Error(`Existing native file changed: ${file}; choose a new LAW_BENCH_NATIVE directory.`);
      fs.copyFileSync(from,to);
    }
    run('python3',['bootstrap.py'],p.native);
    verifyNative(p.native);
  }
  console.log('Benchmark dependencies prepared. No model API calls were made.');
}
