import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));

export function migrate(db: DatabaseSync): number {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)`);
  const applied = new Set(
    (db.prepare(`SELECT version FROM schema_migrations`).all() as { version: number }[]).map((r) => r.version),
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
  let current = Math.max(0, ...applied);
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`).run(version, Date.now());
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    current = version;
  }
  return current;
}
