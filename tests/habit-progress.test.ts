import { expect, it } from "vitest";
import { habitProgress } from "../packages/core/src/index";
it("aggregates weekly units and preserves streak through an unfinished current week", () => {
  const logs = [
    { date: "2026-10-26", count: 3 },
    { date: "2026-11-02", count: 1 },
    { date: "2026-11-05", count: 2 },
    { date: "2026-11-09", count: 1 },
  ];
  expect(habitProgress(logs, "2026-11-10", "weekly", 3)).toEqual({
    current: 1,
    target: 3,
    streak: 2,
    scheduled: true,
    done: false,
  });
});
it("skips weekends but breaks weekday streaks on missed workdays", () => {
  const logs = [
    { date: "2026-11-05", count: 1 },
    { date: "2026-11-06", count: 1 },
  ];
  expect(habitProgress(logs, "2026-11-09", "weekdays", 1).streak).toBe(2);
  expect(habitProgress(logs, "2026-11-08", "weekdays", 1).scheduled).toBe(
    false,
  );
  expect(habitProgress(logs, "2026-11-10", "weekdays", 1).streak).toBe(0);
});
it("ignores future logs and keeps a new weekly period separate", () => {
  expect(
    habitProgress(
      [{ date: "2026-11-09", count: 100 }],
      "2026-11-08",
      "weekly",
      3,
    ).current,
  ).toBe(0);
});
