CREATE TABLE host_allowlist (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  host TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, host)
);
