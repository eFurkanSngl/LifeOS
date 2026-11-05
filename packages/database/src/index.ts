import { openDB, type IDBPDatabase } from "idb";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  type Entity,
  type Kind,
  recordSchema,
  validateData,
  backupSchema,
  focusSchema,
} from "@lifeos/validation";
import {
  remaining,
  expandRecurrence,
  today,
  type TypedEntity,
} from "@lifeos/core";

export interface Repository {
  list(): Promise<Entity[]>;
  put(record: Entity, expectedVersion: number): Promise<void>;
  close?(): void;
}
export class BrowserRepository implements Repository {
  private db: Promise<IDBPDatabase>;
  constructor(name = "lifeos-v1") {
    this.db = openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("records", { keyPath: "id" });
      },
    });
  }
  async list() {
    return (await (await this.db).getAll("records")).map((r) =>
      recordSchema.parse(r),
    );
  }
  async put(record: Entity, expectedVersion: number) {
    recordSchema.parse(record);
    if (record.version !== expectedVersion + 1)
      throw new Error("Geçersiz kayıt sürümü.");
    const db = await this.db,
      tx = db.transaction("records", "readwrite");
    const old = await tx.store.get(record.id);
    if ((old?.version ?? 0) !== expectedVersion) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error(
        "Kayıt başka bir pencerede değişti. Yenileyip tekrar deneyin.",
      );
    }
    await tx.store.put(record);
    await tx.done;
    // Notify at the persistence boundary so form writes, imports and sync
    // acknowledgements invalidate other tabs as well as ordinary task actions.
    if (
      typeof window !== "undefined" &&
      typeof BroadcastChannel !== "undefined"
    ) {
      const signal = new BroadcastChannel("lifeos-records");
      signal.postMessage("changed");
      signal.close();
    }
  }
}
export class NativeRepository implements Repository {
  async list() {
    return (await invoke<Entity[]>("list_records")).map((r) =>
      recordSchema.parse(r),
    );
  }
  async put(record: Entity, expectedVersion: number) {
    await invoke("put_record", {
      record: recordSchema.parse(record),
      expectedVersion,
    });
  }
}
export function createRepository() {
  return isTauri() ? new NativeRepository() : new BrowserRepository();
}
export class LifeService {
  constructor(public repo: Repository) {}
  async list() {
    return this.repo.list();
  }
  async save(
    kind: Kind,
    data: unknown,
    id = crypto.randomUUID(),
    expectedVersion?: number,
  ) {
    const records = await this.list(),
      old = records.find((r) => r.id === id);
    if (old && old.kind !== kind) throw new Error("Kayıt türü değiştirilemez.");
    if (
      expectedVersion !== undefined &&
      expectedVersion !== (old?.version ?? 0)
    )
      throw new Error(
        "Kayıt başka bir pencerede değişti. Yenileyip tekrar deneyin.",
      );
    const parsed = validateData(kind, data);
    const references: Record<string, Kind> = {
      projectId: "project",
      taskId: "task",
      habitId: "habit",
      contactId: "contact",
      milestoneId: "milestone",
      seriesId: "task",
      focusId: "focus",
    };
    for (const [field, targetKind] of Object.entries(references)) {
      const ref = parsed[field];
      if (
        ref &&
        !records.some(
          (r) => r.id === ref && r.kind === targetKind && !r.deleted,
        )
      )
        throw new Error(`Bağlı kayıt bulunamadı: ${field}`);
    }
    if (kind === "focus" && !parsed.reminderId)
      parsed.reminderId = crypto.randomUUID();
    const record: Entity = {
      id,
      kind,
      data: parsed,
      version: (old?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      deleted: false,
      cloudVersion: old?.cloudVersion ?? 0,
      dirty: true,
    };
    await this.repo.put(record, expectedVersion ?? old?.version ?? 0);
    if (
      kind === "task" &&
      parsed.recurrence &&
      !parsed.seriesId &&
      !["cancelled", "completed"].includes(String(parsed.status))
    ) {
      const template = record as TypedEntity<"task">;
      for (const item of expandRecurrence(
        template,
        today(template.data.recurrence!.timezone),
      )) {
        if (!records.some((r) => r.id === item.id))
          await this.save("task", item.data, item.id, 0);
      }
    }
    if (
      kind === "task" &&
      ["completed", "cancelled", "skipped"].includes(String(parsed.status))
    ) {
      for (const r of records.filter(
        (r) =>
          r.kind === "reminder" &&
          !r.deleted &&
          r.data.taskId === id &&
          ["pending", "delivered"].includes(String(r.data.status)),
      ))
        await this.save(
          "reminder",
          {
            ...r.data,
            status: parsed.status === "completed" ? "completed" : "cancelled",
          },
          r.id,
          r.version,
        );
    }
    if (kind === "focus") {
      const focus = focusSchema.parse(parsed);
      const reminder = records.find((r) => r.id === focus.reminderId);
      await this.save(
        "reminder",
        {
          title: focus.title,
          focusId: id,
          fireAt: new Date(Date.now() + remaining(focus)).toISOString(),
          status: focus.status === "running" ? "pending" : "cancelled",
        },
        focus.reminderId,
        reminder?.version ?? 0,
      );
    }
    return record;
  }
  async remove(record: Entity) {
    await this.repo.put(
      {
        ...record,
        deleted: true,
        dirty: true,
        updatedAt: new Date().toISOString(),
        version: record.version + 1,
      },
      record.version,
    );
  }
  async export() {
    return {
      schemaVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      records: await this.list(),
    };
  }
  async import(input: unknown) {
    const backup = backupSchema.parse(input),
      existing = new Map((await this.list()).map((r) => [r.id, r]));
    let added = 0,
      skipped = 0;
    for (const r of backup.records) {
      if (existing.has(r.id)) {
        skipped++;
        continue;
      }
      await this.repo.put(
        { ...r, version: 1, cloudVersion: 0, dirty: true },
        0,
      );
      existing.set(r.id, r);
      added++;
    }
    return { added, skipped };
  }
}
