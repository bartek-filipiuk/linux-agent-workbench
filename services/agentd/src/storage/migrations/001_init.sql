CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  goal TEXT NOT NULL,
  model TEXT NOT NULL,
  state TEXT NOT NULL,
  network_mode TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  end_reason TEXT,
  snapshot_json TEXT,
  cost_usd REAL NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX runs_state ON runs(state);

CREATE TABLE run_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sensitivity TEXT NOT NULL DEFAULT 'normal'
);
CREATE INDEX run_events_run ON run_events(run_id, seq);

CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  call_id TEXT NOT NULL,
  name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  status TEXT NOT NULL,
  output_json TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  error_code TEXT
);
CREATE INDEX tool_calls_run ON tool_calls(run_id, started_at);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  command_hash TEXT NOT NULL,
  command TEXT NOT NULL,
  category TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  decision TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  expires_at INTEGER NOT NULL
);
CREATE INDEX approvals_run ON approvals(run_id, created_at);

CREATE TABLE provider_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id),
  response_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  ts INTEGER NOT NULL
);
