import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
export const BASELINE_COMMIT = '77846cb0d97af218dd8a2832dab9f488c703b210';
export const paths = (env = process.env) => {
  const cache = path.resolve(env.LAW_BENCH_CACHE || path.join(repo, '.cache/browser-bench'));
  return {cache, baseline: path.resolve(env.LAW_BENCH_BASELINE || path.join(cache, 'baseline')),
    native: path.resolve(env.LAW_BENCH_NATIVE || path.join(cache, 'native')),
    config: path.resolve(env.LAW_BENCH_CONFIG || path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'linux-agent-workbench-jev-auto/.env'))};
};
export const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function privateConfig(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .filter(line => /^[A-Z_]+=/.test(line)).map(line => line.split(/=(.*)/s).slice(0, 2)));
}
export function verifyBaseline(root) {
  const git = args => execFileSync('git', args, {cwd: root, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
  if (git(['rev-parse','HEAD']) !== BASELINE_COMMIT || git(['status','--porcelain','--untracked-files=normal'])) {
    throw Error('Benchmark baseline must be clean at the pinned commit; run pnpm bench:setup.');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(path.resolve(root, git(['rev-parse','--git-dir'])), 'law-benchmark-build.json'), 'utf8'));
  if (manifest.commit !== BASELINE_COMMIT || !Object.keys(manifest.files).length) throw Error('Invalid baseline build manifest');
  for (const [file, hash] of Object.entries(manifest.files)) {
    if (sha256(path.join(root,file)) !== hash) throw Error(`Baseline compiled file changed: ${file}; rebuild with pnpm bench:setup.`);
  }
  return manifest;
}
export function verifyNative(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'docs/benchmarks/browser-poc/sources.json'), 'utf8'));
  for (const [name, entry] of Object.entries(manifest)) {
    for (const [file, hash] of Object.entries(entry.files)) {
      if (sha256(path.join(root,'vendor',name,file)) !== hash) throw Error(`Native source mismatch: ${name}/${file}`);
    }
  }
  for (const file of ['driver.py','requirements.lock','sources.json']) {
    if (sha256(path.join(root,file)) !== sha256(path.join(repo,'docs/benchmarks/browser-poc',file))) throw Error(`Native harness mismatch: ${file}`);
  }
  if (!fs.existsSync(path.join(root,'.venv/bin/python'))) throw Error('Native Python environment missing; run pnpm bench:setup.');
  return manifest;
}
