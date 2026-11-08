import { describe, it, expect } from "vitest";
import {
  taskSchema,
  taskPatchSchema,
  recurrenceSchema,
  expandRecurrence,
  occurrenceId,
  remaining,
  focusSchema,
  today,
  localInstant,
  streak,
  overlaps,
  isQuiet,
  retryDelay,
  recordSchema,
  type TypedEntity,
} from "../packages/core/src/index";
function template(
  overrides: Record<string, unknown> = {},
): TypedEntity<"task"> {
  return {
    id: "12345678-1234-4000-8000-123456789012",
    kind: "task",
    version: 1,
    cloudVersion: 0,
    dirty: true,
    deleted: false,
    updatedAt: "2026-11-05T09:00:00.000Z",
    data: taskSchema.parse({
      title: "Çalış",
      scheduledAt: "2026-11-05T11:00:00.000Z",
      recurrence: { frequency: "daily", timezone: "Europe/Istanbul" },
      ...overrides,
    }),
  };
}
describe("task validation", () => {
  it("keeps task patches sparse instead of applying create defaults", () =>
    expect(taskPatchSchema.parse({ title: "Rename" })).toEqual({
      title: "Rename",
    }));
  it("normalizes domain defaults when reading imported record envelopes", () => {
    const base = template();
    expect(
      recordSchema.parse({ ...base, data: { title: "Minimal input" } }).data,
    ).toMatchObject({ status: "inbox", tags: [], duration: 30 });
  });

  it("rejects empty titles and impossible due dates", () => {
    expect(taskSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(
      taskSchema.safeParse({ title: "a", dueDate: "2026-02-31" }).success,
    ).toBe(false);
  });
  it("rejects unknown external fields", () =>
    expect(
      taskSchema.safeParse({ title: "a", user_id: "another-user" }).success,
    ).toBe(false));
  it("requires explicit instants", () =>
    expect(
      taskSchema.safeParse({ title: "a", scheduledAt: "tomorrow" }).success,
    ).toBe(false));
  it("applies safe defaults", () =>
    expect(taskSchema.parse({ title: "Test" })).toMatchObject({
      status: "inbox",
      priority: "normal",
      archived: false,
    }));
  it("validates envelope against its entity kind", () =>
    expect(
      recordSchema.safeParse({ ...template(), data: { anything: "yes" } })
        .success,
    ).toBe(false));
});
describe("timezone and bounded recurrence", () => {
  it("keeps date-only daily occurrences independent without inventing an hour", () => {
    const source = template({
      scheduledAt: undefined,
      dueDate: "2026-11-08",
      allDay: true,
    });
    const rows = expandRecurrence(source, "2026-11-08", 3);
    expect(rows.map((r) => r.data.dueDate)).toEqual([
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
    ]);
    expect(rows.every((r) => r.data.allDay && !r.data.scheduledAt)).toBe(true);
    expect(rows[0].id).toBe(occurrenceId(source.id, "2026-11-08"));
    rows[0].data.status = "completed";
    expect(rows[1].data.status).toBe("planned");
  });
  it("applies date-only monthly and until rules across month end", () => {
    const source = template({
      scheduledAt: undefined,
      dueDate: "2026-01-31",
      allDay: true,
      recurrence: {
        frequency: "monthly",
        until: "2026-02-28",
        timezone: "America/New_York",
      },
    });
    const rows = expandRecurrence(source, "2026-02-01", 35);
    expect(rows.map((r) => r.data.dueDate)).toEqual(["2026-02-28"]);
    expect(rows[0].data.scheduledAt).toBeUndefined();
  });
  it("uses Istanbul calendar dates around UTC midnight", () =>
    expect(today("Europe/Istanbul", new Date("2026-11-05T22:00Z"))).toBe(
      "2026-11-06",
    ));
  it("converts a wall clock to UTC", () =>
    expect(localInstant("2026-11-05T14:00", "Europe/Istanbul")).toBe(
      "2026-11-05T11:00:00.000Z",
    ));
  it("creates independently trackable deterministic occurrences", () => {
    const source = template(),
      a = expandRecurrence(source, "2026-11-05", 3),
      b = expandRecurrence(source, "2026-11-05", 3);
    expect(a).toEqual(b);
    expect(new Set(a.map((x) => x.id)).size).toBe(3);
    a[0].data.status = "completed";
    expect(a[1].data.status).toBe("planned");
    expect(a[0].id).toBe(occurrenceId(source.id, "2026-11-05"));
  });
  it("bounds future generation", () =>
    expect(expandRecurrence(template(), "2026-11-05", 10000)).toHaveLength(93));
  it("respects end dates", () =>
    expect(
      expandRecurrence(
        template({ recurrence: { frequency: "daily", until: "2026-11-06" } }),
        "2026-11-05",
        20,
      ),
    ).toHaveLength(2));
  it("supports weekday selection", () => {
    const items = expandRecurrence(
      template({
        recurrence: {
          frequency: "weekly",
          weekdays: [1, 3],
          timezone: "Europe/Istanbul",
        },
      }),
      "2026-11-05",
      7,
    );
    expect(items.map((x) => x.data.occurrenceDate)).toEqual([
      "2026-11-09",
      "2026-11-11",
    ]);
  });
  it("preserves wall-clock time across DST", () => {
    const items = expandRecurrence(
      template({
        scheduledAt: "2026-10-31T13:00:00.000Z",
        recurrence: { frequency: "daily", timezone: "America/New_York" },
      }),
      "2026-10-31",
      3,
    );
    expect(items.map((x) => x.data.scheduledAt)).toEqual([
      "2026-10-31T13:00:00.000Z",
      "2026-11-01T14:00:00.000Z",
      "2026-11-02T14:00:00.000Z",
    ]);
  });
  it("clamps monthly dates to shorter month ends", () => {
    const items = expandRecurrence(
      template({
        scheduledAt: "2026-01-31T11:00:00.000Z",
        recurrence: { frequency: "monthly", timezone: "Europe/Istanbul" },
      }),
      "2026-02-01",
      35,
    );
    expect(items.map((x) => x.data.occurrenceDate)).toEqual(["2026-02-28"]);
  });
  it("supports custom day intervals", () =>
    expect(
      expandRecurrence(
        template({ recurrence: { frequency: "interval", interval: 3 } }),
        "2026-11-05",
        7,
      ).map((x) => x.data.occurrenceDate),
    ).toEqual(["2026-11-05", "2026-11-08", "2026-11-11"]));
  it("rejects invalid timezone", () =>
    expect(
      recurrenceSchema.safeParse({
        frequency: "daily",
        timezone: "Somewhere/Nowhere",
      }).success,
    ).toBe(false));
});
describe("explicit DST policies", () => {
  it("rejects manually selected nonexistent wall times", () =>
    expect(() => localInstant("2026-03-08T02:30", "America/New_York")).toThrow(
      "mevcut değil",
    ));
  it("uses the first instant when a wall time repeats", () =>
    expect(localInstant("2026-11-01T01:30", "America/New_York")).toBe(
      "2026-11-01T05:30:00.000Z",
    ));
  it("skips a recurrence at a nonexistent spring-forward wall time", () => {
    const source = template({
      scheduledAt: "2026-03-07T07:30:00.000Z",
      recurrence: { frequency: "daily", timezone: "America/New_York" },
    });
    expect(
      expandRecurrence(source, "2026-03-07", 3).map(
        (x) => x.data.occurrenceDate,
      ),
    ).toEqual(["2026-03-07", "2026-03-09"]);
  });
});
describe("timers and reminders", () => {
  it("rejects running timers without a resume instant", () =>
    expect(
      focusSchema.safeParse({
        title: "Invalid",
        startedAt: "2026-11-05T10:00:00.000Z",
        duration: 25,
        remainingMs: 1500000,
        status: "running",
      }).success,
    ).toBe(false));
  it("uses timestamps after suspension", () => {
    const f = focusSchema.parse({
      title: "Study",
      startedAt: "2026-11-05T10:00:00.000Z",
      resumedAt: "2026-11-05T10:00:00.000Z",
      duration: 25,
      remainingMs: 1500000,
      status: "running",
    });
    expect(remaining(f, Date.parse("2026-11-05T10:15:00Z"))).toBe(600000);
    expect(remaining(f, Date.parse("2026-11-05T11:15:00Z"))).toBe(0);
  });
  it("does not spend paused time", () => {
    const f = focusSchema.parse({
      title: "Study",
      startedAt: "2026-11-05T10:00:00.000Z",
      duration: 25,
      remainingMs: 50000,
      status: "paused",
    });
    expect(remaining(f, Date.now() + 100000)).toBe(50000);
  });
  it("handles overnight quiet hours", () => {
    expect(
      isQuiet(
        new Date("2026-11-05T22:00Z"),
        "Europe/Istanbul",
        "23:00",
        "08:00",
      ),
    ).toBe(true);
    expect(
      isQuiet(
        new Date("2026-11-05T09:00Z"),
        "Europe/Istanbul",
        "23:00",
        "08:00",
      ),
    ).toBe(false);
  });
  it("detects overlap but permits touching blocks", () => {
    const a = taskSchema.parse({
        title: "a",
        scheduledAt: "2026-11-05T10:00:00.000Z",
        duration: 30,
      }),
      b = taskSchema.parse({
        title: "b",
        scheduledAt: "2026-11-05T10:29:00.000Z",
        duration: 30,
      });
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(a, { ...b, scheduledAt: "2026-11-05T10:30:00.000Z" })).toBe(
      false,
    );
  });
  it("limits exponential retry backoff", () => {
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(100)).toBe(300000);
  });
  it("calculates streak with a grace day", () =>
    expect(streak(["2026-11-03", "2026-11-04"], "2026-11-05")).toBe(2));
});
