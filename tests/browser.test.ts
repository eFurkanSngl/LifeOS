import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { BrowserRepository, LifeService } from "../packages/database/src/index";
import { occurrenceId } from "../packages/core/src/index";
it("coalesces simultaneous deterministic occurrence creation without duplicate alarms", async () => {
  const name = "test-" + crypto.randomUUID();
  const a = new LifeService(new BrowserRepository(name));
  const b = new LifeService(new BrowserRepository(name));
  const series = await a.save("task", { title: "Series" });
  const date = "2026-12-01";
  const data = {
    title: "Occurrence",
    seriesId: series.id,
    occurrenceDate: date,
    scheduledAt: date + "T09:00:00.000Z",
    reminderOffsetMinutes: 10,
  };
  const id = occurrenceId(series.id, date);
  const [first, second] = await Promise.all([
    a.save("task", data, id, 0),
    b.save("task", data, id, 0),
  ]);
  expect(first.id).toBe(second.id);
  expect((await a.list()).filter((r) => r.kind === "reminder")).toHaveLength(1);
  const completed = await a.save(
    "task",
    { ...first.data, status: "completed" },
    id,
    first.version,
  );
  await b.save("task", data, id, 0);
  expect((await a.list()).find((r) => r.id === id)).toEqual(completed);
});
it("persists browser records and prevents concurrent tab overwrites", async () => {
  const name = "test-" + crypto.randomUUID(),
    a = new LifeService(new BrowserRepository(name)),
    b = new LifeService(new BrowserRepository(name));
  const record = await a.save("task", { title: "Offline" });
  expect((await b.list())[0].data.title).toBe("Offline");
  await b.save("task", { title: "Other tab" }, record.id, record.version);
  await expect(
    a.save("task", { title: "Stale" }, record.id, record.version),
  ).rejects.toThrow("başka bir pencerede");
  expect((await a.list())[0].data.title).toBe("Other tab");
});
