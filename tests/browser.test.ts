import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { BrowserRepository, LifeService } from "../packages/database/src/index";
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
