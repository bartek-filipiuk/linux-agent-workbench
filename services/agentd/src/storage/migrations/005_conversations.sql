ALTER TABLE runs ADD COLUMN parent_run_id TEXT;
ALTER TABLE runs ADD COLUMN conversation_id TEXT;
ALTER TABLE runs ADD COLUMN continuation_json TEXT;
ALTER TABLE runs ADD COLUMN settings_json TEXT;
UPDATE runs SET conversation_id = id;
CREATE INDEX runs_conversation ON runs(conversation_id, started_at);
