import { expect, it } from "vitest";
import { taskSchema, studyProgress } from "../packages/core/src/index";
it("keeps legacy tasks readable as general timed work", () => {
  const task = taskSchema.parse({ title: "Existing task" });
  expect(task.taskKind).toBe("general");
  expect(task.allDay).toBe(false);
});
it("validates real date-only exam ranges without inventing a session time", () => {
  const exam = {
    title: "Exam period",
    taskKind: "exam",
    allDay: true,
    dueDate: "2026-12-05",
    endDate: "2026-12-06",
  };
  expect(taskSchema.parse(exam).scheduledAt).toBeUndefined();
  expect(taskSchema.safeParse({ ...exam, endDate: "2026-12-04" }).success).toBe(
    false,
  );
  expect(
    taskSchema.safeParse({ ...exam, scheduledAt: "2026-12-05T06:00:00.000Z" })
      .success,
  ).toBe(false);
});
it("bounds unit progress, persists completion semantics and reverses completion when a unit is undone", () => {
  const pdf = taskSchema.parse({
    title: "PDF",
    taskKind: "pdf",
    totalUnits: 8,
    completedUnits: 7,
  });
  const done = studyProgress(pdf, 1, "2026-11-06T12:00:00.000Z");
  expect(done.completedUnits).toBe(8);
  expect(done.status).toBe("completed");
  expect(studyProgress(done, 1).completedUnits).toBe(8);
  const undone = studyProgress(done, -1);
  expect(undone.completedUnits).toBe(7);
  expect(undone.completedAt).toBeUndefined();
  expect(undone.status).toBe("in_progress");
  expect(taskSchema.safeParse({ ...pdf, completedUnits: 9 }).success).toBe(
    false,
  );
});
