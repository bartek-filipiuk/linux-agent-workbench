import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const readJevKey = (configFile, env) => readProviderKey(configFile, env, "jev");
export const readOpenRouterKey = (configFile, env) => readProviderKey(configFile, env, "openrouter");
async function readProviderKey(configFile, env, provider) {
  const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY" : "TYPESAFE_API_KEY";
  if (process.env[keyName] || env[keyName]) return process.env[keyName] || env[keyName];
  const settingsFile = path.join(path.dirname(path.resolve(configFile)), "settings.json");
  if (!fs.existsSync(settingsFile)) throw new Error(`Configure ${keyName} before benchmarking`);
  const desktop = fileURLToPath(new URL("../apps/desktop/", import.meta.url));
  const childEnv = { ...process.env }; delete childEnv.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(desktop, "node_modules/electron/dist/electron"), [path.join(desktop, "scripts/read-jev-key.cjs"), settingsFile, provider], { env: childEnv, stdio: ["ignore", "ignore", "ignore", "pipe"] });
    let key = "";
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdio[3].on("data", chunk => { key += chunk.toString(); if (key.length > 512) child.kill(); });
    child.once("error", () => { clearTimeout(timer); reject(new Error(`Cannot access the OS keyring; set ${keyName} for this benchmark`)); });
    child.once("exit", code => { clearTimeout(timer); if (code === 0 && key && key.length <= 512) resolve(key); else reject(new Error(`Unlock the OS keyring or set ${keyName} for this benchmark`)); });
  });
}
