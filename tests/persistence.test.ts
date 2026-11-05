import { describe, it, expect, afterEach } from "vitest";
import { SqliteRepository } from "../packages/database/src/node";
import { LifeService } from "../packages/database/src/index";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const cleanup: (() => void)[] = [];
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "lifeos-test-")),
    path = join(dir, "lifeos.sqlite"),
    repo = new SqliteRepository(path, true);
  cleanup.push(() => {
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { repo, service: new LifeService(repo), path };
}
afterEach(() => {
  for (const c of cleanup.splice(0)) c();
});
describe("SQLite application service", () => {
  it("persists tasks across separate connections", async () => {
    const { service, path } = setup();
    const task = await service.save("task", { title: "Persistent study" });
    const second = new SqliteRepository(path);
    try {
      expect((await second.list())[0].id).toBe(task.id);
    } finally {
      second.close();
    }
  });
  it("completes and undoes a task without changing other records", async () => {
    const { service } = setup();
    const a = await service.save("task", { title: "Today" }),
      b = await service.save("task", { title: "Tomorrow" });
    const complete = await service.save(
      "task",
      { ...a.data, status: "completed" },
      a.id,
      a.version,
    );
    await service.save(
      "task",
      { ...complete.data, status: "planned" },
      a.id,
      complete.version,
    );
    expect((await service.list()).find((r) => r.id === b.id)?.version).toBe(1);
  });
  it("rejects stale concurrent edits", async () => {
    const { service } = setup();
    const a = await service.save("task", { title: "Original" });
    await service.save("task", { title: "New" }, a.id, a.version);
    await expect(
      service.save("task", { title: "Stale" }, a.id, a.version),
    ).rejects.toThrow("değişti");
    expect((await service.list())[0].data.title).toBe("New");
  });
  it("preserves tombstones", async () => {
    const { service } = setup();
    const a = await service.save("task", { title: "Delete" });
    await service.remove(a);
    expect((await service.list())[0]).toMatchObject({
      deleted: true,
      dirty: true,
      version: 2,
    });
  });
  it("imports valid backups and skips existing IDs", async () => {
    const { service } = setup();
    await service.save("note", { title: "Idea", body: "Keep this" });
    const backup = await service.export();
    expect(await service.import(backup)).toEqual({ added: 0, skipped: 1 });
    await expect(
      service.import({ ...backup, schemaVersion: 2 }),
    ).rejects.toThrow();
  });
  it("validates the entire backup before writing any record", async () => {
    const { service } = setup();
    const a = await service.save("task", { title: "Original" });
    const copy = { ...a, id: crypto.randomUUID() };
    await expect(
      service.import({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        records: [copy, { ...copy, id: "bad" }],
      }),
    ).rejects.toThrow();
    expect(await service.list()).toHaveLength(1);
  });
  it("keeps pending reminders after restart and deduplicates dispatch claims", async () => {
    const { service, repo, path } = setup();
    const reminder = await service.save("reminder", {
      title: "Due",
      fireAt: new Date().toISOString(),
    });
    const other = new SqliteRepository(path);
    try {
      expect((await other.list())[0].data.status).toBe("pending");
      const statement = repo.db.prepare(
        "INSERT OR IGNORE INTO notification_events(reminder_id,fire_at,state,created_at) VALUES(?,?,'dispatching',?)",
      );
      expect(
        statement.run(
          reminder.id,
          String(reminder.data.fireAt),
          new Date().toISOString(),
        ).changes,
      ).toBe(1);
      expect(
        statement.run(
          reminder.id,
          String(reminder.data.fireAt),
          new Date().toISOString(),
        ).changes,
      ).toBe(0);
    } finally {
      other.close();
    }
  });
  it("creates reminder scheduling records for focus and cancels them when paused", async () => {
    const { service } = setup();
    const focus = await service.save("focus", {
      title: "Deep work",
      startedAt: new Date().toISOString(),
      resumedAt: new Date().toISOString(),
      duration: 25,
      remainingMs: 1500000,
      status: "running",
    });
    const reminder = (await service.list()).find((r) => r.kind === "reminder")!;
    expect(reminder.data.focusId).toBe(focus.id);
    expect(reminder.data.status).toBe("pending");
    await service.save(
      "focus",
      { ...focus.data, status: "paused", resumedAt: undefined },
      focus.id,
      focus.version,
    );
    expect(
      (await service.list()).find((r) => r.id === reminder.id)?.data.status,
    ).toBe("cancelled");
  });
  it("suppresses task reminders after completion", async () => {
    const { service } = setup();
    const task = await service.save("task", { title: "Study" });
    const reminder = await service.save("reminder", {
      title: "Study",
      taskId: task.id,
      fireAt: new Date().toISOString(),
    });
    await service.save(
      "task",
      { ...task.data, status: "completed" },
      task.id,
      task.version,
    );
    expect(
      (await service.list()).find((r) => r.id === reminder.id)?.data.status,
    ).toBe("completed");
  });
  it("materializes bounded recurring occurrences through the same service used by MCP", async () => {
    const { service } = setup();
    const task = await service.save("task", {
      title: "Daily",
      scheduledAt: new Date().toISOString(),
      recurrence: { frequency: "daily", timezone: "Europe/Istanbul" },
    });
    const occurrences = (await service.list()).filter(
      (r) => r.data.seriesId === task.id,
    );
    expect(occurrences).toHaveLength(35);
    await service.save(
      "task",
      { ...task.data, notes: "Edited" },
      task.id,
      task.version,
    );
    expect(
      (await service.list()).filter((r) => r.data.seriesId === task.id),
    ).toHaveLength(35);
  });
  it("rejects dangling references without saving a partial record", async () => {
    const { service } = setup();
    await expect(
      service.save("task", {
        title: "Missing project",
        projectId: crypto.randomUUID(),
      }),
    ).rejects.toThrow("bulunamadı");
    expect(await service.list()).toHaveLength(0);
  });
});
