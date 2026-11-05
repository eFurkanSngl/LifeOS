PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS records (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL CHECK(version > 0), updated_at TEXT NOT NULL,
 deleted INTEGER NOT NULL DEFAULT 0, cloud_version INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS records_kind ON records(kind,deleted);
CREATE INDEX IF NOT EXISTS reminders_due ON records(json_extract(data,'$.fireAt')) WHERE kind='reminder' AND deleted=0;
CREATE TABLE IF NOT EXISTS notification_events (
 reminder_id TEXT NOT NULL, fire_at TEXT NOT NULL, state TEXT NOT NULL,
 created_at TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', PRIMARY KEY(reminder_id,fire_at)
);
CREATE TABLE IF NOT EXISTS mcp_action_logs (id INTEGER PRIMARY KEY, tool TEXT NOT NULL, record_id TEXT, created_at TEXT NOT NULL);
PRAGMA user_version=1;
