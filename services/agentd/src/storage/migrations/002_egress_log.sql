CREATE TABLE egress_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  allowed INTEGER NOT NULL,
  reason TEXT
);
CREATE INDEX egress_log_session ON egress_log(session_id, ts);
