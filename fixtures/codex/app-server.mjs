#!/usr/bin/env node
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

const mode = process.env.LAW_CODEX_TEST_MODE;
const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const event = (method, params) => send({ method, params: { threadId: "thread-1", turnId: "turn-1", ...params } });
const reply = (id, result) => send({ id, result });
const call = (id, tool) => send({ id, method: "item/tool/call", params: { threadId: "thread-1", turnId: "turn-1", callId: String(id), tool, arguments: {} } });
const usage = (inputTokens, outputTokens, cachedInputTokens) => event("thread/tokenUsage/updated", { tokenUsage: { total: { inputTokens, outputTokens, cachedInputTokens } } });
fs.writeFileSync(path.join(process.env.CODEX_HOME, "process.json"), JSON.stringify({ args: process.argv.slice(2), apiKeyPresent: Boolean(process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY), cwd: process.cwd(), pid: process.pid }));
let results = 0;
for await (const line of readline.createInterface({ input: process.stdin })) {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    if (mode === "crash") process.exit(23);
    if (mode === "malformed") { process.stdout.write("not-json\n"); continue; }
    reply(msg.id, {});
  } else if (msg.method === "account/read") {
    reply(msg.id, { account: mode === "no-auth" ? null : { type: mode === "api-auth" ? "apiKey" : "chatgpt" } });
  } else if (msg.method === "thread/start") {
    fs.writeFileSync(path.join(process.env.CODEX_HOME, "thread.json"), JSON.stringify(msg.params));
    if (mode === "rpc-error") send({ id: msg.id, error: { code: -32602, message: "unsupported model" } });
    else reply(msg.id, { thread: { id: "thread-1" } });
  } else if (msg.method === "thread/resume") {
    fs.writeFileSync(path.join(process.env.CODEX_HOME, "resume.json"), JSON.stringify(msg.params));
    reply(msg.id, { thread: { id: msg.params.threadId } });
  } else if (msg.method === "turn/interrupt") {
    fs.writeFileSync(path.join(process.env.CODEX_HOME, "interrupt.json"), JSON.stringify(msg.params));
    reply(msg.id, {});
    event("turn/completed", { turn: { id: "turn-1", status: "interrupted" } });
  } else if (msg.method === "turn/start") {
    fs.writeFileSync(path.join(process.env.CODEX_HOME, "turn.json"), JSON.stringify(msg.params));
    // Intentionally emit notifications before the RPC response, like a busy real server.
    usage(100, 10, 40);
    event("item/completed", { item: { type: "agentMessage", text: "Inspecting the screen." } });
    reply(msg.id, { turn: { id: "turn-1" } });
    if (mode === "hang") continue;
    if (mode === "host-request") { send({ id: "host", method: "item/commandExecution/requestApproval", params: { threadId: "thread-1" } }); continue; }
    if (mode === "model-failure") { event("turn/completed", { turn: { status: "failed", error: { message: "usage limit reached" } } }); continue; }
    call("tool-1", mode === "unknown-tool" ? "host_exec" : "browser_observe");
    if (mode === "parallel") call("tool-2", "terminal_observe");
  } else if (!msg.method && msg.result) {
    fs.appendFileSync(path.join(process.env.CODEX_HOME, "results.jsonl"), `${JSON.stringify(msg)}\n`);
    results++;
    if (mode === "parallel" && results === 1) continue;
    usage(160, 25, 60);
    event("item/completed", { item: { type: "agentMessage", text: "Done: \u{1f680}." } });
    event("turn/completed", { turn: { id: "turn-1", status: "completed" } });
  }
}
