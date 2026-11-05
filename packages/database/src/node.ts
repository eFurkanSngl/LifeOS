import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { type Entity, recordSchema } from "@lifeos/validation";
import type { Repository } from "./index";
export class SqliteRepository implements Repository {
  readonly db: DatabaseSync;
  constructor(path: string, create = false) {
    if (!isAbsolute(path)) throw new Error("LIFEOS_DB_PATH must be absolute.");
    if (!create && !existsSync(path))
      throw new Error(
        "Start LifeOS desktop first, then use its existing database path.",
      );
    this.db = new DatabaseSync(path);
    const version = this.db.prepare("PRAGMA user_version").get()?.user_version;
    if (Number(version) > 1) {
      this.db.close();
      throw new Error("Database schema is newer than this LifeOS version.");
    }
    this.db.exec(
      readFileSync(new URL("../schema.sql", import.meta.url), "utf8"),
    );
  }
  async list() {
    const rows = this.db.prepare("SELECT * FROM records").all();
    return rows.map((r) =>
      recordSchema.parse({
        id: r.id,
        kind: r.kind,
        data: JSON.parse(String(r.data)),
        version: r.version,
        updatedAt: r.updated_at,
        deleted: !!r.deleted,
        cloudVersion: r.cloud_version,
        dirty: !!r.dirty,
      }),
    );
  }
  async put(record: Entity, expectedVersion: number) {
    recordSchema.parse(record);
    if (record.version !== expectedVersion + 1)
      throw new Error("Invalid local version");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db
        .prepare("SELECT version,kind FROM records WHERE id=?")
        .get(record.id);
      if (Number(old?.version ?? 0) !== expectedVersion)
        throw new Error("Record changed; retry after reading current version.");
      if (old && old.kind !== record.kind)
        throw new Error("Cannot change record kind.");
      this.db
        .prepare(
          "INSERT INTO records(id,kind,data,version,updated_at,deleted,cloud_version,dirty) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,deleted=excluded.deleted,cloud_version=excluded.cloud_version,dirty=excluded.dirty",
        )
        .run(
          record.id,
          record.kind,
          JSON.stringify(record.data),
          record.version,
          record.updatedAt,
          Number(record.deleted),
          record.cloudVersion,
          Number(record.dirty),
        );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  audit(tool: string, id?: string) {
    this.db
      .prepare(
        "INSERT INTO mcp_action_logs(tool,record_id,created_at) VALUES(?,?,?)",
      )
      .run(tool, id ?? null, new Date().toISOString());
  }
  close() {
    this.db.close();
  }
}
