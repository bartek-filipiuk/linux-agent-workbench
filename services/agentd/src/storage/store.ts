import { DatabaseSync, type StatementSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TERMINAL_STATES, type ErrorCode, type NetworkMode, type RunEvent, type RunState, type Sensitivity } from "@law/protocol";
import { migrate } from "./migrate.js";

export type RunRow = {
  id: string;
  workspace_id: string;
  goal: string;
  model: string;
  state: RunState;
  network_mode: NetworkMode;
  started_at: number;
  ended_at: number | null;
  end_reason: string | null;
  snapshot_json: string | null;
  cost_usd: number;
  turns: number;
  tool_calls: number;
};

export type ToolCallStatus = "executing" | "done" | "denied" | "error" | "unknown";
export type ToolCallRow = {
  id: string;
  run_id: string;
  call_id: string;
  name: string;
  input_json: string;
  status: ToolCallStatus;
  output_json: string | null;
  started_at: number;
  ended_at: number | null;
  error_code: string | null;
};

const NON_TERMINAL: RunState[] = ["idle", "running", "awaiting_approval", "handoff"];

export class Store {
  private readonly db: DatabaseSync;
  readonly schemaVersion: number;

  constructor(file: string) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL");
    // WAL + NORMAL: durable against an app crash, may lose the last transactions on power loss. The audit
    // log is not a ledger, and FULL would fsync on the single thread that also forwards terminal output.
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.schemaVersion = migrate(this.db);
    // Hot-path statements are prepared once; node:sqlite has no statement cache.
    this.stmts = {
      event: this.db.prepare(`INSERT INTO run_events (run_id, ts, type, payload_json, sensitivity) VALUES (?, ?, ?, ?, ?)`),
      egress: this.db.prepare(`INSERT INTO egress_log (ts, session_id, host, port, allowed, reason) VALUES (?, ?, ?, ?, ?, ?)`),
      beginTool: this.db.prepare(`INSERT INTO tool_calls (id, run_id, call_id, name, input_json, status, started_at) VALUES (?, ?, ?, ?, ?, 'executing', ?)`),
      finishTool: this.db.prepare(`UPDATE tool_calls SET status = ?, output_json = ?, ended_at = ?, error_code = ? WHERE id = ?`),
      usage: this.db.prepare(`INSERT INTO provider_usage (run_id, response_id, input_tokens, output_tokens, cached_tokens, cost_usd, ts) VALUES (?, ?, ?, ?, ?, ?, ?)`),
      totals: this.db.prepare(`UPDATE runs SET turns = turns + ?, tool_calls = tool_calls + ?, cost_usd = cost_usd + ? WHERE id = ?`),
    };
  }

  private readonly stmts: Record<"event" | "egress" | "beginTool" | "finishTool" | "usage" | "totals", StatementSync>;

  createWorkspace(wsPath: string): string {
    const now = Date.now();
    const existing = this.db.prepare(`SELECT id FROM workspaces WHERE path = ?`).get(wsPath) as { id: string } | undefined;
    if (existing) {
      this.db.prepare(`UPDATE workspaces SET last_used_at = ? WHERE id = ?`).run(now, existing.id);
      return existing.id;
    }
    const id = randomUUID();
    this.db.prepare(`INSERT INTO workspaces (id, path, created_at, last_used_at) VALUES (?, ?, ?, ?)`).run(id, wsPath, now, now);
    return id;
  }

  createRun(input: { workspaceId: string; goal: string; model: string; networkMode: NetworkMode; snapshot?: unknown }): string {
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO runs (id, workspace_id, goal, model, state, network_mode, started_at, snapshot_json)
         VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`,
      )
      .run(id, input.workspaceId, input.goal, input.model, input.networkMode, now, input.snapshot === undefined ? null : JSON.stringify(input.snapshot));
    this.appendEvent(id, "run.created", { goal: input.goal, model: input.model, networkMode: input.networkMode });
    return id;
  }

  setRunState(runId: string, state: RunState, endReason?: string): void {
    const terminal = TERMINAL_STATES.has(state);
    this.db
      .prepare(`UPDATE runs SET state = ?, ended_at = COALESCE(?, ended_at), end_reason = COALESCE(?, end_reason) WHERE id = ?`)
      .run(state, terminal ? Date.now() : null, endReason ?? null, runId);
    this.appendEvent(runId, "run.state", { state, ...(endReason ? { endReason } : {}) });
  }

  getRun(runId: string): RunRow | undefined {
    return this.db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId) as RunRow | undefined;
  }

  listAllowedHosts(workspaceId: string): string[] {
    return (this.db.prepare(`SELECT host FROM host_allowlist WHERE workspace_id = ? ORDER BY host`).all(workspaceId) as { host: string }[]).map((r) => r.host);
  }

  addAllowedHost(workspaceId: string, host: string): void {
    this.db.prepare(`INSERT OR IGNORE INTO host_allowlist (workspace_id, host, added_at) VALUES (?, ?, ?)`).run(workspaceId, host, Date.now());
  }

  logEgress(sessionId: string, e: { host: string; port: number; allowed: boolean; reason?: string }): void {
    this.stmts.egress.run(Date.now(), sessionId, e.host, e.port, e.allowed ? 1 : 0, e.reason ?? null);
  }

  appendEvent(runId: string, type: string, payload: Record<string, unknown>, sensitivity: Sensitivity = "normal"): number {
    const r = this.stmts.event.run(runId, Date.now(), type, JSON.stringify(payload), sensitivity);
    return Number(r.lastInsertRowid);
  }

  listEvents(runId: string): RunEvent[] {
    const rows = this.db.prepare(`SELECT * FROM run_events WHERE run_id = ? ORDER BY seq`).all(runId) as {
      seq: number; run_id: string; ts: number; type: string; payload_json: string; sensitivity: Sensitivity;
    }[];
    return rows.map((r) => ({ seq: r.seq, runId: r.run_id, ts: r.ts, type: r.type, payload: JSON.parse(r.payload_json), sensitivity: r.sensitivity }));
  }

  beginToolCall(runId: string, call: { callId: string; name: string; args: unknown }): string {
    const id = randomUUID();
    this.stmts.beginTool.run(id, runId, call.callId, call.name, JSON.stringify(call.args ?? null), Date.now());
    return id;
  }

  finishToolCall(id: string, status: "done" | "denied" | "error", output: unknown, errorCode?: ErrorCode): void {
    this.stmts.finishTool.run(status, JSON.stringify(output ?? null), Date.now(), errorCode ?? null, id);
  }

  listToolCalls(runId: string): ToolCallRow[] {
    return this.db.prepare(`SELECT * FROM tool_calls WHERE run_id = ? ORDER BY started_at, rowid`).all(runId) as ToolCallRow[];
  }

  recordUsage(runId: string, u: { responseId: string; inputTokens: number; outputTokens: number; cachedInputTokens?: number; costUsd: number }): void {
    this.stmts.usage.run(runId, u.responseId, u.inputTokens, u.outputTokens, u.cachedInputTokens ?? 0, u.costUsd, Date.now());
  }

  addRunTotals(runId: string, d: { turns?: number; toolCalls?: number; costUsd?: number }): void {
    this.stmts.totals.run(d.turns ?? 0, d.toolCalls ?? 0, d.costUsd ?? 0, runId);
  }

  createApproval(a: { id: string; runId: string; commandHash: string; command: string; category: string; ruleId: string; expiresAt: number }): void {
    this.db
      .prepare(`INSERT INTO approvals (id, run_id, command_hash, command, category, rule_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.runId, a.commandHash, a.command, a.category, a.ruleId, Date.now(), a.expiresAt);
  }

  decideApproval(id: string, decision: string): void {
    this.db.prepare(`UPDATE approvals SET decision = ?, decided_at = ? WHERE id = ?`).run(decision, Date.now(), id);
  }

  markInterruptedRuns(reason: string): number {
    const placeholders = NON_TERMINAL.map(() => "?").join(",");
    const rows = this.db.prepare(`SELECT id FROM runs WHERE state IN (${placeholders})`).all(...NON_TERMINAL) as { id: string }[];
    const now = Date.now();
    this.db.exec("BEGIN");
    try {
      for (const { id } of rows) {
        this.db.prepare(`UPDATE tool_calls SET status = 'unknown', ended_at = ? WHERE run_id = ? AND status = 'executing'`).run(now, id);
        this.db.prepare(`UPDATE runs SET state = 'interrupted', ended_at = ?, end_reason = ? WHERE id = ?`).run(now, reason, id);
        this.appendEvent(id, "run.interrupted", { reason });
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return rows.length;
  }

  /** Deletes runs that ended before `cutoff` with everything that hangs off them, and egress rows older than it. */
  pruneOlderThan(cutoff: number): { runs: number; egress: number } {
    const runs = this.db.prepare(`SELECT id FROM runs WHERE ended_at IS NOT NULL AND ended_at < ?`).all(cutoff) as { id: string }[];
    this.db.exec("BEGIN");
    try {
      for (const { id } of runs) {
        for (const table of ["run_events", "tool_calls", "approvals", "provider_usage"]) {
          this.db.prepare(`DELETE FROM ${table} WHERE run_id = ?`).run(id);
        }
        this.db.prepare(`DELETE FROM runs WHERE id = ?`).run(id);
      }
      const egress = this.db.prepare(`DELETE FROM egress_log WHERE ts < ?`).run(cutoff).changes;
      this.db.exec("COMMIT");
      return { runs: runs.length, egress: Number(egress) };
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  close(): void {
    this.db.close();
  }
}
