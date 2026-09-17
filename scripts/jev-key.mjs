import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export async function readJevKey(configFile, env) {
  if (process.env.TYPESAFE_API_KEY || env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY || env.TYPESAFE_API_KEY;
  const settingsFile = path.join(path.dirname(path.resolve(configFile)), "settings.json");
  if (!fs.existsSync(settingsFile)) throw new Error("Configure TYPESAFE_API_KEY before benchmarking");
  const desktop = fileURLToPath(new URL("../apps/desktop/", import.meta.url));
  const childEnv = { ...process.env }; delete childEnv.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(desktop, "node_modules/electron/dist/electron"), [path.join(desktop, "scripts/read-jev-key.cjs"), settingsFile], { env: childEnv, stdio: ["ignore", "ignore", "ignore", "pipe"] });
    let key = "";
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdio[3].on("data", chunk => { key += chunk.toString(); if (key.length > 512) child.kill(); });
    child.once("error", () => { clearTimeout(timer); reject(new Error("Cannot access the OS keyring; set TYPESAFE_API_KEY for this benchmark")); });
    child.once("exit", code => { clearTimeout(timer); if (code === 0 && key && key.length <= 512) resolve(key); else reject(new Error("Unlock the OS keyring or set TYPESAFE_API_KEY for this benchmark")); });
  });
}
