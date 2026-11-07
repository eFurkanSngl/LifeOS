import { BookOpen, CalendarDays, ArrowUpRight, Video } from "lucide-react";
import { entities, formatTime, today } from "@lifeos/core";
import { tr } from "../i18n";
import type { LifeStore } from "../store";
import type { Edit } from "./types";

export function LearningOverview({
  store,
  edit,
  navigate,
}: {
  store: LifeStore;
  edit: Edit;
  navigate: (page: string) => void;
}) {
  const tasks = entities(store.records, "task").filter(
    (t) => !t.data.archived && !t.data.recurrence,
  );
  const pdfs = tasks.filter((t) => t.data.taskKind === "pdf");
  const nextLesson = tasks
    .filter(
      (t) =>
        t.data.taskKind === "lesson" &&
        t.data.scheduledAt &&
        Date.parse(t.data.scheduledAt) > Date.now() &&
        !["completed", "cancelled", "skipped"].includes(t.data.status),
    )
    .sort((a, b) => a.data.scheduledAt!.localeCompare(b.data.scheduledAt!))[0];
  const nextExam = tasks
    .filter(
      (t) =>
        t.data.taskKind === "exam" &&
        t.data.dueDate &&
        (t.data.endDate ?? t.data.dueDate) >= today(store.settings.timezone) &&
        !["completed", "cancelled", "skipped"].includes(t.data.status),
    )
    .sort((a, b) => a.data.dueDate!.localeCompare(b.data.dueDate!))[0];
  if (!pdfs.length && !nextLesson && !nextExam) return null;
  return (
    <section className="learning-overview panel">
      <div className="learning-header">
        <span className="learning-symbol">
          <BookOpen size={22} />
        </span>
        <div>
          <h2>{tr.learning}</h2>
          <p>{tr.learningHint}</p>
        </div>
        <button className="text-button" onClick={() => navigate("tasks")}>
          {tr.viewAll}
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="learning-columns">
        <div className="course-progress-list">
          {pdfs.slice(0, 8).map((p) => (
            <button
              key={p.id}
              className="course-progress-row"
              onClick={() => edit("task", p)}
            >
              <span className="course-code">
                {p.data.courseCode ?? <BookOpen size={15} />}
              </span>
              <span className="course-progress-detail">
                <strong>{p.data.title.replace(/ · PDF$/, "")}</strong>
                <progress
                  value={p.data.completedUnits ?? 0}
                  max={p.data.totalUnits ?? 1}
                />
              </span>
              <span className="course-progress-count">
                {p.data.completedUnits ?? 0}
                <small>/{p.data.totalUnits}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="upcoming-learning">
          <div className="learning-appointment">
            <Video size={17} />
            <div>
              <span>{tr.nextLesson}</span>
              {nextLesson ? (
                <button onClick={() => edit("task", nextLesson)}>
                  <strong>{nextLesson.data.title}</strong>
                  <small>
                    {new Date(nextLesson.data.scheduledAt!).toLocaleDateString(
                      "tr-TR",
                      {
                        day: "numeric",
                        month: "short",
                        timeZone: store.settings.timezone,
                      },
                    )}{" "}
                    ·{" "}
                    {formatTime(
                      nextLesson.data.scheduledAt!,
                      store.settings.timezone,
                    )}
                  </small>
                </button>
              ) : (
                <p>{tr.noUpcomingLesson}</p>
              )}
            </div>
          </div>
          <div className="learning-appointment">
            <CalendarDays size={17} />
            <div>
              <span>{tr.nextExam}</span>
              {nextExam ? (
                <button onClick={() => edit("task", nextExam)}>
                  <strong>{nextExam.data.title}</strong>
                  <small>
                    {nextExam.data.dueDate}
                    {nextExam.data.endDate &&
                    nextExam.data.endDate !== nextExam.data.dueDate
                      ? ` – ${nextExam.data.endDate}`
                      : ""}
                  </small>
                </button>
              ) : (
                <p>{tr.noUpcomingExam}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
