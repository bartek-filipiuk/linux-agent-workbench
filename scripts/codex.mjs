import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { CODEX_AUTH_ARGS, codexBinary, codexEnvironment, prepareCodexHome } from "../services/agentd/dist/provider/codex-process.js";
import { CodexAppServerAdapter } from "../services/agentd/dist/provider/codex.js";
import { parseEnvFile } from "../apps/desktop/src/main/env-file.ts";

const repo = fileURLToPath(new URL("../", import.meta.url));
const envPath = [path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "@law/desktop/.env"), path.join(repo, ".env")].find((p) => fs.existsSync(p));
const env = envPath ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};
const options = {
  ...(env.LAW_CODEX_BIN ? { binary: env.LAW_CODEX_BIN } : {}),
  ...(env.LAW_CODEX_HOME ? { home: env.LAW_CODEX_HOME } : {}),
};
const action = process.argv[2] ?? "status";
if (!["login", "status", "smoke"].includes(action)) throw new Error("Usage: pnpm codex [login [--device-auth] | status | smoke]");
const home = prepareCodexHome(options);
console.log(`Workbench Codex home: ${home}`);

if (action === "smoke") {
  // One harmless client-executed tool, then a final answer. Consumes subscription quota.
  const smokeArgs = process.argv.slice(3);
  const flag = (name) => {
    const index = smokeArgs.indexOf(name);
    if (index < 0) return undefined;
    const value = smokeArgs[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    return value;
  };
  const model = flag("--model") ?? env.LAW_CODEX_MODEL;
  const effort = flag("--effort");
  const adapter = new CodexAppServerAdapter({ ...options, ...(model ? { model } : {}), ...(effort ? { effort } : {}) });
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  const ctx = { signal: abort.signal, system: "Integration test. Use only law_ping, exactly once, then repeat its returned text in your final answer.", tools: [{ name: "law_ping", description: "Read the integration test response", parameters: { type: "object", properties: {}, additionalProperties: false } }] };
  try {
    const first = await adapter.turn({ goal: "Call law_ping, then report the result." }, ctx);
    if (first.toolCalls.length !== 1 || first.toolCalls[0].name !== "law_ping") throw new Error(`Codex did not call the test tool. Model response: ${first.text.slice(0, 500)}`);
    const challenge = `LAW_CODEX_OK_${randomUUID()}`;
    const last = await adapter.turn({ toolResults: [{ callId: first.toolCalls[0].callId, output: challenge }] }, { ...ctx, previousResponseId: first.responseId });
    if (last.toolCalls.length || !last.text.includes(challenge)) throw new Error("Codex did not return the unpredictable test result");
    console.log(`PASS: ChatGPT login, model ${model ?? "configured"}, effort ${effort ?? "configured"}, LAW tool round trip and verified final response.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally { adapter.close(); }
} else {
  const args = [...CODEX_AUTH_ARGS, "login", ...(action === "status" ? ["status"] : process.argv.slice(3))];
  const child = spawn(codexBinary(options), args, { cwd: home, env: codexEnvironment(options), stdio: "inherit" });
  child.on("error", (error) => { console.error(`Cannot start Codex: ${error.message}. Install Codex CLI or set LAW_CODEX_BIN in .env.`); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
