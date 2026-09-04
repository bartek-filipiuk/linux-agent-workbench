#!/usr/bin/env node
// Headless benchmark: drives the same Daemon the desktop app uses, without Electron, so runs can be
// repeated and timed unattended. Close the desktop app first (both would fight over the worker socket).
//
//   node scripts/bench.mjs --model gpt-6-astra --runs 3 --goal scripts/bench-goals/search-summary.txt \
//        [--workspace ~/law-demo-ws] [--reset "/workspace/search.txt /workspace/summary.md"]
//
// Handoffs are resumed after 2 s and approvals answered "once" so the run never waits for a human;
// both are counted and printed, because a benchmark run that needed them is a worse run.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentd = await import(path.join(repo, "services/agentd/dist/index.js"));
const { Daemon, Store, PodmanRuntime, TerminalSessionManager, OpenAIResponsesAdapter, BrowserSessionManager, podmanLauncher, dataDir, dbPath, containerName } = agentd;

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const model = flag("--model", "gpt-6-astra");
const runs = Number(flag("--runs", 3));
const goal = fs.readFileSync(flag("--goal", path.join(repo, "scripts/bench-goals/search-summary.txt")), "utf8").trim();
const workspace = flag("--workspace", path.join(os.homedir(), "law-demo-ws"));
const reset = flag("--reset", "/workspace/search.txt /workspace/summary.md /workspace/facts.txt /workspace/bio.md").split(/\s+/).filter(Boolean);

function envFile() {
  for (const p of [path.join(os.homedir(), ".config/@law/desktop/.env"), path.join(repo, ".env"), path.join(os.homedir(), ".config/@law/desktop/.env.bak")]) {
    if (!fs.existsSync(p)) continue;
    const env = Object.fromEntries(fs.readFileSync(p, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)));
    if (env.OPENAI_API_KEY) return env;
  }
  return {};
}
const apiKey = process.env.OPENAI_API_KEY ?? envFile().OPENAI_API_KEY;
if (!apiKey) {
  console.error("bench: OPENAI_API_KEY not found (env or .env / .env.bak)");
  process.exit(2);
}
const readId = (name) => JSON.parse(fs.readFileSync(path.join(repo, "images", name, "image.json"), "utf8")).id;
const runtimeRoot = path.join(process.env.XDG_RUNTIME_DIR ?? path.join(os.tmpdir(), `law-${os.userInfo().uid}`), "linux-agent-workbench");
fs.mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });

const waiters = [];
const watchers = [];
const keepAlive = setInterval(() => undefined, 60_000); // the daemon's own timers are unref'd; stay alive while waiting for it
const verbose = argv.includes("--verbose");
const post = (m) => {
  if (verbose && m.type !== "terminal.data" && m.type !== "browser.frame") console.error("<-", m.type, m.state ?? m.message ?? "");
  if (m.type === "agentd.error") console.error("agentd error:", m.message);
  for (const w of [...watchers]) w(m);
  for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
};
const waitFor = (pred, ms = 600_000) =>
  new Promise((resolve, reject) => {
    const w = { pred, resolve };
    waiters.push(w);
    setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error("timeout waiting for daemon message")); }, ms).unref();
  });

const daemon = new Daemon({
  openStore: (p) => new Store(p),
  makeManager: (imageId, root) => new TerminalSessionManager({ runtime: new PodmanRuntime(), runtimeRoot: root, imageId }),
  makeAdapter: (m, key) => new OpenAIResponsesAdapter({ model: m, apiKey: key }),
  makeBrowser: ({ runtimeRoot: root, sessionId, networkMode, browserImageId }) =>
    new BrowserSessionManager({
      socketDir: path.join(root, sessionId, "browser"),
      launcher: podmanLauncher({ runtime: new PodmanRuntime(), sessionId, imageId: browserImageId, networkMode, downloadsDir: path.join(dataDir(), "downloads", sessionId) }),
    }),
  post,
});
const send = (m) => daemon.handle(m).catch((e) => console.error("handle failed:", e.message));

// Register each waiter before sending: the daemon answers synchronously inside handle() for some messages.
const readyP = waitFor((m) => m.type === "agentd.ready" || m.type === "agentd.error");
send({ type: "config.init", apiKey, model, dbPath: dbPath(), imageId: readId("terminal"), runtimeRoot, browserImageId: readId("browser") });
await readyP;
send({ type: "policy.set", nestedAutonomy: true, domainMode: "open" });
const sessionP = waitFor((m) => m.type === "session.state" && (m.state === "ready" || m.state === "error"));
send({ type: "session.start", workspacePath: workspace, networkMode: "open" });
const ready = await sessionP;
if (ready.state !== "ready") { console.error("session failed:", ready.message); process.exit(1); }
const container = containerName(ready.sessionId);
console.log(`bench: model ${model}, ${runs} runs, sandbox ${container}`);

const expectFile = flag("--expect", "/workspace/summary.md"); // the artefact a valid run must leave behind
const minMarks = Number(flag("--min-marks", 4)); // sentence terminators the artefact must contain (0 = just non-empty)
const inSandbox = (cmd) => execFileSync("podman", ["exec", container, "bash", "-lc", cmd], { encoding: "utf8" }).trim();

const summary = [];
for (let i = 1; i <= runs; i++) {
  execFileSync("podman", ["exec", container, "rm", "-f", ...reset]);
  // A previous run's output must not stay on screen: a model that reads a stale "wc -w" line skips the work.
  // Ctrl-L is readline's clear-screen: no command runs, so the gate is not involved.
  inSandbox("tmux -S /tmp/law-tmux.sock send-keys -t 0 C-u C-l; sleep 0.3; tmux -S /tmp/law-tmux.sock clear-history -t 0");
  let handoffs = 0, approvals = 0;
  // Auto-pilot: the benchmark must never wait for a human; every such event is counted against the run.
  const autopilot = (m) => {
    if (m.type === "run.handoff") { handoffs++; setTimeout(() => send({ type: "run.resume" }), 2000); }
    if (m.type === "approval.request") { approvals++; send({ type: "approval.decide", id: m.id, decision: "once" }); }
  };
  watchers.push(autopilot);
  const t0 = Date.now();
  const endP = waitFor((m) => m.type === "run.state" && ["completed", "failed", "stopped", "budget_exceeded", "interrupted"].includes(m.state), 900_000);
  send({ type: "run.start", goal });
  const end = await endP;
  watchers.splice(watchers.indexOf(autopilot), 1);
  const wall = Date.now() - t0;
  // Validity: the artefact exists and has at least four sentence terminators; a run that only claims a result fails here.
  const check = inSandbox(`if [ -s ${expectFile} ]; then grep -o '[.!?]' ${expectFile} | wc -l; else echo missing; fi`);
  const valid = check !== "missing" && Number(check) >= minMarks;
  const claimed = /(\d+)\s*(?:words?|word count)|word count[^0-9]*(\d+)/i.exec(end.finalText ?? "");
  const actual = check === "missing" ? "-" : inSandbox(`wc -w < ${expectFile}`);
  summary.push({ i, state: end.state, wall, turns: end.turns, toolCalls: end.toolCalls, handoffs, approvals, valid });
  console.log(`run ${i}/${runs}: ${end.state} in ${(wall / 1000).toFixed(1)}s, ${end.turns} turns, ${end.toolCalls} tool calls, handoffs ${handoffs}, approvals ${approvals}, ${valid ? "VALID" : "INVALID"} (artefact ${check === "missing" ? "missing" : `${check} sentences, ${actual} words`}${claimed ? `, claimed ${claimed[1] ?? claimed[2]}` : ""})`);
  await new Promise((r) => setTimeout(r, 3000));
}
await send({ type: "session.stop", destroy: false });
clearInterval(keepAlive);
const ok = summary.filter((s) => s.valid && s.state === "completed");
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] : NaN);
console.log(`\n${model}: ${ok.length}/${runs} valid · median wall ${(median(ok.map((s) => s.wall)) / 1000).toFixed(1)}s · median turns ${median(ok.map((s) => s.turns))}`);
console.log("details: node scripts/bench-report.mjs " + runs);
process.exit(0);
