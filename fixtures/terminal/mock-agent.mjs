#!/usr/bin/env node
// Mock nested-agent TUI for tests: input box -> spinner -> question menu (arrows + Enter) -> permission prompt -> done.
import fs from "node:fs";
import path from "node:path";

const out = (s) => process.stdout.write(s);
const clear = () => out("\x1b[2J\x1b[H");
let state = "input";
let menuIndex = 0;
let permIndex = 0;
let buffer = "";
const OPTIONS = ["Fast path", "Careful path"];

function drawInput(keepScreen = false) {
  if (!keepScreen) clear();
  out("╭──────────────────────────────────────────╮\n");
  out(`│ > ${buffer.padEnd(38)}│\n`);
  out("╰──────────────────────────────────────────╯\n");
  out("  ? for shortcuts · q to quit\n");
}
function drawBusy() {
  clear();
  out("⠋ Working… (esc to interrupt)\n");
}
function drawMenu() {
  clear();
  out("? Which approach should I take?\n");
  OPTIONS.forEach((o, i) => out(`${i === menuIndex ? "❯" : " "} ${i + 1}. ${o}\n`));
  out("Enter to select · ↑/↓ to move\n");
}
function drawPermission() {
  clear();
  out("Mock wants to run `touch hello.txt`\n\nDo you want to proceed?\n");
  ["Yes", "No, and tell Mock what to do differently (esc)"].forEach((o, i) => out(`${i === permIndex ? "❯" : " "} ${i + 1}. ${o}\n`));
}
function finish(approved) {
  clear();
  if (approved) {
    fs.writeFileSync(path.join(process.cwd(), "hello.txt"), "hello\n");
    out(`Done: created hello.txt (${OPTIONS[menuIndex]})\n\n`);
  } else {
    out("Cancelled.\n\n");
  }
  state = "input";
  buffer = "";
  // Like a real agent, keep the result visible above the input box.
  setTimeout(() => drawInput(true), 300);
}

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
drawInput();
// Several keys can arrive in one chunk (e.g. "\x1b[B\r"); handle them one by one.
function splitKeys(chunk) {
  const keys = [];
  for (let i = 0; i < chunk.length; ) {
    if (chunk[i] === "\x1b" && chunk[i + 1] === "[") {
      keys.push(chunk.slice(i, i + 3));
      i += 3;
    } else {
      keys.push(chunk[i]);
      i += 1;
    }
  }
  return keys;
}
process.stdin.on("data", (chunk) => splitKeys(chunk).forEach(handleKey));
function handleKey(key) {
  if (key === "\u0003") process.exit(0); // Ctrl-C
  if (state === "input") {
    if (key === "\r") {
      if (buffer.trim() === "q") process.exit(0);
      if (!buffer.trim()) return;
      state = "busy";
      drawBusy();
      setTimeout(() => {
        state = "menu";
        drawMenu();
      }, 1200);
    } else if (key === "\u007f") {
      buffer = buffer.slice(0, -1);
      drawInput();
    } else if (key >= " " && !key.startsWith("\x1b")) {
      buffer += key;
      drawInput();
    }
    return;
  }
  if (state === "menu") {
    if (key === "\x1b[A") menuIndex = Math.max(0, menuIndex - 1);
    else if (key === "\x1b[B") menuIndex = Math.min(OPTIONS.length - 1, menuIndex + 1);
    else if (key === "\r") {
      state = "permission";
      permIndex = 0;
      drawPermission();
      return;
    }
    drawMenu();
    return;
  }
  if (state === "permission") {
    if (key === "\x1b[A") permIndex = 0;
    else if (key === "\x1b[B") permIndex = 1;
    else if (key === "1") permIndex = 0;
    else if (key === "2") permIndex = 1;
    else if (key === "\x1b") {
      finish(false);
      return;
    } else if (key === "\r") {
      finish(permIndex === 0);
      return;
    }
    drawPermission();
  }
}
