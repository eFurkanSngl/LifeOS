import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteRepository } from "../packages/database/src/node";
import { LifeService } from "../packages/database/src/index";
it("restores an offline SQLite task graph after closing and reopening, without overwriting later local edits", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lifeos-recovery-"));
  let repo: SqliteRepository | undefined;
  let restored: SqliteRepository | undefined;
  try {
    const path = join(dir, "source.sqlite");
    repo = new SqliteRepository(path, true);
    let service = new LifeService(repo);
    const project = await service.save("project", { title: "Offline project" });
    const task = await service.save("task", {
      title: "Offline lesson",
      projectId: project.id,
      scheduledAt: "2026-12-01T15:00:00.000Z",
      reminderOffsetMinutes: 30,
    });
    await service.save("note", { title: "Offline note", body: "# Preserved" });
    const backup = await service.export();
    repo.close();
    repo = undefined;
    repo = new SqliteRepository(path);
    service = new LifeService(repo);
    expect((await service.list()).every((r) => r.dirty)).toBe(true);
    expect(
      (await service.list()).find((r) => r.kind === "reminder")?.data.fireAt,
    ).toBe("2026-12-01T14:30:00.000Z");
    restored = new SqliteRepository(join(dir, "restored.sqlite"), true);
    const recovery = new LifeService(restored);
    expect((await recovery.import(backup)).added).toBe(4);
    await recovery.save(
      "task",
      { ...task.data, title: "Later edit" },
      task.id,
      1,
    );
    expect((await recovery.import(backup)).skipped).toBe(4);
    expect(
      (await recovery.list()).find((r) => r.id === task.id)?.data.title,
    ).toBe("Later edit");
    await expect(
      recovery.import({ ...backup, schemaVersion: 999 }),
    ).rejects.toThrow();
    expect(await recovery.list()).toHaveLength(4);
  } finally {
    repo?.close();
    restored?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
