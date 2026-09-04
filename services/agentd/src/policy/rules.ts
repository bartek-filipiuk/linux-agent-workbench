import type { ApprovalCategory, NetworkMode } from "@law/protocol";

export type Bucket = "auto" | "log" | "approval" | "deny";
export type Rule = { id: string; category: ApprovalCategory; pattern: RegExp; summary: string; network?: boolean; noSession?: boolean };
export type Classification = { bucket: Bucket; ruleId?: string; category?: ApprovalCategory; summary?: string };

// Prefixes matched against every simple command in the line (after env assignments).
export const AUTO_PREFIXES = [
  "ls", "cat", "head", "tail", "less", "grep", "rg", "find", "pwd", "echo", "which", "type", "wc", "stat", "file", "tree", "env", "printenv",
  "git status", "git diff", "git log", "git show", "git branch", "git remote -v",
  "npm test", "pnpm test", "npm run test", "pnpm run test", "node --version", "node -v", "npm --version", "pnpm --version",
  "claude", "codex", "cd", "clear", "history", "true", "man", "help", "exit", "logout",
];

export const DENY_RULES: Rule[] = [
  {
    id: "nested-bypass",
    category: "permission_change",
    pattern: /--dangerously-skip-permissions|--dangerously-bypass-approvals-and-sandbox|(^|\s)--yolo(\s|$)/,
    summary: "nested agent started with a permission bypass flag",
  },
];

export const RULES: Rule[] = [
  { id: "git-push", category: "publish", pattern: /^git\s+push\b/, summary: "push commits to a remote", network: true },
  { id: "npm-publish", category: "publish", pattern: /^(npm|pnpm|yarn)\s+publish\b/, summary: "publish a package", network: true },
  { id: "pipe-to-shell", category: "external_exec", pattern: /^(curl|wget)\b.*\|\s*(sudo\s+)?(sh|bash|zsh)\b/, summary: "download and execute a remote script", network: true },
  { id: "sudo", category: "permission_change", pattern: /^(sudo|su)\b/, summary: "run as another user" },
  { id: "chmod-recursive", category: "permission_change", pattern: /^(chmod|chown|chgrp)\b.*\s-[a-zA-Z]*R/, summary: "recursive permission or ownership change" },
  { id: "rm-recursive", category: "destructive_workspace", pattern: /^rm\b.*\s-[a-zA-Z]*[rR]/, summary: "recursive delete" },
  { id: "git-reset-hard", category: "destructive_workspace", pattern: /^git\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|checkout\s+--\s+\.)/, summary: "discard working tree changes" },
  { id: "dd-mkfs", category: "destructive_workspace", pattern: /^(dd|mkfs(\.\w+)?|shred|wipefs)\b/, summary: "raw disk write" },
  { id: "remote-shell", category: "external_side_effect", pattern: /^(ssh|scp|sftp|rsync)\b/, summary: "connect to a remote host", network: true },
];

// Split a bash line into simple commands on ; && || | and newlines. Quotes are not parsed:
// a quoted separator only makes us look at more fragments, never fewer.
// The pipe-to-shell rule needs the whole pipeline, so pipelines are also checked unsplit.
function fragments(line: string): { simple: string[]; pipelines: string[] } {
  const clean = (s: string) => s.trim().replace(/^(\w+=\S*\s+)+/, "").trim();
  const pipelines = line.split(/\n|;|&&|\|\|/).map(clean).filter(Boolean);
  const simple = pipelines.flatMap((p) => p.split("|").map(clean).filter(Boolean));
  return { simple, pipelines };
}

export function classify(command: string, ctx: { networkMode: NetworkMode }): Classification {
  const { simple, pipelines } = fragments(command);
  if (simple.length === 0) return { bucket: "auto" };
  const candidates = [...simple, ...pipelines];
  for (const rule of DENY_RULES) {
    if (candidates.some((p) => rule.pattern.test(p))) return { bucket: "deny", ruleId: rule.id, category: rule.category, summary: rule.summary };
  }
  for (const rule of RULES) {
    if (rule.network && ctx.networkMode === "none") continue;
    if (candidates.some((p) => rule.pattern.test(p))) return { bucket: "approval", ruleId: rule.id, category: rule.category, summary: rule.summary };
  }
  // A redirection turns a read-only command into a write; keep those in the log bucket.
  const allAuto = simple.every((p) => !p.includes(">") && AUTO_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + " ")));
  return { bucket: allAuto ? "auto" : "log" };
}
