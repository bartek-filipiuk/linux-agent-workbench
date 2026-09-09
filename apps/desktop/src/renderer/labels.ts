// Product language for enum values that would otherwise leak into the UI.
export const CATEGORY_LABEL: Record<string, string> = {
  destructive_workspace: "destructive change in the workspace",
  publish: "publishing to a remote",
  send: "sending a message",
  purchase: "payment",
  delete: "deleting data",
  deploy: "deployment",
  permission_change: "permission change",
  external_side_effect: "connection to another machine",
  external_exec: "running code from the internet",
  credential_transmission: "sending credentials",
};

export const END_REASON_LABEL: Record<string, string> = {
  final_answer: "finished",
  user_stop: "stopped by you",
  maxTurns: "turn budget reached",
  maxToolCalls: "tool budget reached",
  maxDurationMs: "time budget reached",
  maxCostUsd: "cost budget reached",
  agentd_restart: "interrupted by a restart",
};

export const STATE_LABEL: Record<string, string> = {
  idle: "idle",
  running: "running",
  awaiting_approval: "waiting for your approval",
  handoff: "waiting for you",
  completed: "completed",
  stopped: "stopped",
  failed: "failed",
  budget_paused: "paused at limit",
  budget_exceeded: "budget exceeded",
  interrupted: "interrupted",
};

export const label = (map: Record<string, string>, key: string | undefined): string => (key ? (map[key] ?? key.replace(/_/g, " ")) : "");

// Minimal inline markdown: **bold** and `code`. Anything else stays literal.
export function renderInline(text: string): Array<string | { bold?: string; code?: string }> {
  const out: Array<string | { bold?: string; code?: string }> = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push({ bold: m[1] });
    else out.push({ code: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
