#!/usr/bin/env node
// Policy gate client for the bash DEBUG trap. Fail-closed: any error or timeout denies the command.
"use strict";
const net = require("net");
const sock = process.env.LAW_GATE_SOCKET || "/run/law/gate.sock";
const command = process.argv.slice(2).join(" ");
if (!command.trim()) process.exit(0);
const req = JSON.stringify({ command, cwd: process.cwd(), pid: process.ppid }) + "\n";
const deny = (reason) => {
  process.stderr.write(`law: command blocked: ${reason}\n`);
  process.exit(1);
};
const timer = setTimeout(() => deny("approval timed out"), 180_000);
const s = net.createConnection(sock);
let buf = "";
s.on("connect", () => s.write(req));
s.on("error", (e) => deny(`gate unavailable (${e.code || e.message})`));
s.on("data", (d) => {
  buf += d.toString();
  const nl = buf.indexOf("\n");
  if (nl < 0) return;
  clearTimeout(timer);
  let r;
  try { r = JSON.parse(buf.slice(0, nl)); } catch { return deny("bad gate reply"); }
  if (r.decision === "allow") process.exit(0);
  deny(r.reason || "denied by policy");
});
s.on("end", () => { if (!buf.includes("\n")) deny("gate closed"); });
