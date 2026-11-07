import { isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Check,
  Clock3,
  CalendarDays,
  BookOpen,
  Flame,
  CheckCheck,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { entities, today, formatTime, type TypedEntity } from "@lifeos/core";
import { tr } from "./i18n";
import {
  Section,
  Empty,
  TaskRow,
  EditButton,
  DeleteButton,
} from "./components";
import { FocusPanel } from "./features/focus";
import { ProjectCard } from "./features/projects";
import type { Edit } from "./features/types";
import type { LifeStore } from "./store";
import { LearningOverview } from "./features/learning-overview";
export function Reminders({
  store,
  edit,
  history = false,
  full = false,
}: {
  store: LifeStore;
  edit: Edit;
  history?: boolean;
  full?: boolean;
}) {
  const reminders = entities(store.records, "reminder")
    .filter((r) =>
      history ? r.data.status !== "pending" : r.data.status === "pending",
    )
    .sort((a, b) => a.data.fireAt.localeCompare(b.data.fireAt));
  const action = async (r: TypedEntity<"reminder">, complete = false) => {
    await store.run(async () => {
      await store.service().save(
        "reminder",
        {
          ...r.data,
          status: complete ? "completed" : "pending",
          deliveredAt: undefined,
          fireAt: complete
            ? r.data.fireAt
            : new Date(
                Date.now() + store.settings.snoozeMinutes * 60000,
              ).toISOString(),
        },
        r.id,
        r.version,
      );
      if (complete && r.data.taskId) {
        const task = store.records.find(
          (t) => t.id === r.data.taskId && !t.deleted,
        );
        if (task)
          await store.service().save(
            "task",
            {
              ...task.data,
              status: "completed",
              completedAt: new Date().toISOString(),
            },
            task.id,
            task.version,
          );
      }
    });
  };
  return (
    <div className="reminders-list">
      {reminders.length ? (
        (full ? reminders : reminders.slice(0, history ? 100 : 8)).map((r) => {
          const diff = Math.ceil(
            (Date.parse(r.data.fireAt) - Date.now()) / 60000,
          );
          return (
            <div className="reminder-row" key={r.id}>
              <span className="reminder-time">
                {formatTime(r.data.fireAt, store.settings.timezone)}
                <small>
                  {today(store.settings.timezone, new Date(r.data.fireAt))}
                </small>
              </span>
              <div>
                <strong>{r.data.title}</strong>
                <small>
                  {history
                    ? tr.notificationHistory
                    : diff <= 0
                      ? tr.overdue
                      : `${diff} dk`}
                </small>
              </div>
              <div className="row-actions">
                {!history && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={tr.snooze}
                      title={tr.snooze}
                      onClick={() => void action(r)}
                    >
                      <Clock3 size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={tr.complete}
                      title={tr.complete}
                      onClick={() => void action(r, true)}
                    >
                      <Check size={16} />
                    </button>
                  </>
                )}
                <EditButton onClick={() => edit("reminder", r)} />
                <DeleteButton record={r} store={store} />
              </div>
            </div>
          );
        })
      ) : (
        <p className="empty-inline">{tr.noReminders}</p>
      )}
    </div>
  );
}
export function Dashboard({
  store,
  edit,
  navigate,
}: {
  store: LifeStore;
  edit: Edit;
  navigate: (page: string) => void;
}) {
  const zone = store.settings.timezone,
    day = today(zone),
    tasks = entities(store.records, "task").filter(
      (t) => !t.data.recurrence && !t.data.archived,
    ),
    daily = tasks.filter(
      (t) =>
        t.data.dueDate === day ||
        (t.data.scheduledAt &&
          today(zone, new Date(t.data.scheduledAt)) === day),
    ),
    done = daily.filter((t) => t.data.status === "completed").length,
    habits = entities(store.records, "habit"),
    logs = entities(store.records, "habitLog"),
    habitDone = habits.filter((h) =>
      logs.some(
        (l) =>
          l.data.habitId === h.id &&
          l.data.date === day &&
          l.data.count >= h.data.target,
      ),
    ).length;
  const focusMinutes = entities(store.records, "focus")
      .filter(
        (s) => s.data.endedAt && today(zone, new Date(s.data.endedAt)) === day,
      )
      .reduce(
        (sum, s) =>
          sum +
          Math.round((s.data.duration * 60000 - s.data.remainingMs) / 60000),
        0,
      ),
    studyMinutes = daily
      .filter((t) =>
        ["Çalışma", "Öğrenme", "C#", "Unity", "Üniversite"].includes(
          t.data.category,
        ),
      )
      .reduce((sum, t) => sum + t.data.duration, 0);
  const hour = Number(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: zone,
      }).format(new Date()),
    ),
    greeting = hour < 12 ? tr.morning : hour < 18 ? tr.afternoon : tr.evening;
  const timeline = daily
      .filter((t) => t.data.scheduledAt)
      .sort((a, b) => a.data.scheduledAt!.localeCompare(b.data.scheduledAt!)),
    projects = entities(store.records, "project").filter(
      (p) => p.data.status === "active",
    );
  const review = entities(store.records, "review").find(
      (r) => r.data.date === day,
    ),
    [reviewText, setReviewText] = useState<string | null>(null);
  return (
    <>
      <div className="greeting">
        <div>
          <div className="date-line">
            <span className="live-dot" />
            {new Date().toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: zone,
            })}
          </div>
          <h1>{tr.todayWorkspace}</h1>
          <p>
            {greeting} {tr.todayWorkspaceHint}
          </p>
        </div>
        <div className="day-orbit" aria-hidden="true">
          <div />
          <span>
            {String(
              new Date().toLocaleDateString("tr-TR", {
                day: "2-digit",
                timeZone: zone,
              }),
            )}
          </span>
        </div>
      </div>
      <div className="quick-actions" role="group" aria-label={tr.quickActions}>
        <button onClick={() => edit("task")}>
          <Plus size={17} />
          {tr.quickAdd}
        </button>
        <button onClick={() => edit("note")}>
          <StickyNote size={17} />
          {tr.captureNote}
        </button>
        <button onClick={() => navigate("planner")}>
          <CalendarDays size={17} />
          {tr.planner}
        </button>
        <button onClick={() => navigate("chats")}>
          <MessageSquare size={17} />
          {tr.openChats}
        </button>
      </div>
      <div className="daily-progress">
        <div className="progress-intro">
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(var(--blue) ${daily.length ? (done / daily.length) * 360 : 0}deg, var(--border) 0deg)`,
            }}
          >
            <span>
              {daily.length ? Math.round((done / daily.length) * 100) : 0}
              <small>%</small>
            </span>
          </div>
          <div>
            <h3>{tr.progress}</h3>
            <p>
              {daily.length - done} {tr.remaining}
            </p>
          </div>
        </div>
        <div className="progress-stat">
          <CheckCheck size={17} />
          <strong>
            {done}
            <small> / {daily.length}</small>
          </strong>
          <span>{tr.finished}</span>
        </div>
        <div className="progress-stat">
          <BookOpen size={17} />
          <strong>{studyMinutes}</strong>
          <span>{tr.study}</span>
        </div>
        <div className="progress-stat">
          <Flame size={17} />
          <strong>{focusMinutes}</strong>
          <span>{tr.focusTime}</span>
        </div>
        <div className="progress-stat">
          <Check size={17} />
          <strong>
            {habitDone}
            <small> / {habits.length}</small>
          </strong>
          <span>{tr.habitProgress}</span>
        </div>
      </div>
      <LearningOverview store={store} edit={edit} navigate={navigate} />
      {!tasks.length && !projects.length && (
        <div className="welcome-strip">
          <div>
            <h3>{tr.welcome}</h3>
            <p>{tr.welcomeHint}</p>
          </div>
          <button className="button primary" onClick={() => edit("task")}>
            <Plus size={16} />
            {tr.startTask}
          </button>
        </div>
      )}
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <Section
            title={tr.schedule}
            sub={tr.scheduleHint}
            action={
              <button
                className="text-button"
                onClick={() => navigate("planner")}
              >
                {tr.planner}
                <ArrowUpRight size={15} />
              </button>
            }
          >
            {timeline.length ? (
              <div className="timeline">
                {timeline.map((t) => (
                  <div className="timeline-entry" key={t.id}>
                    <time>{formatTime(t.data.scheduledAt!, zone)}</time>
                    <div
                      className={`timeline-node ${t.data.status === "completed" ? "done" : ""}`}
                    />
                    <div>
                      <TaskRow
                        task={t}
                        store={store}
                        onEdit={() => edit("task", t)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title={tr.unscheduled}
                hint={tr.scheduleHint}
                action={() =>
                  edit("task", undefined, {
                    scheduledAt: new Date().toISOString(),
                    status: "planned",
                  })
                }
              />
            )}
          </Section>
          {projects.length > 0 && (
            <Section
              title={tr.activeProjects}
              action={
                <button
                  className="text-button"
                  onClick={() => navigate("projects")}
                >
                  {tr.viewAll}
                  <ArrowUpRight size={15} />
                </button>
              }
            >
              <div className="project-grid">
                {projects.slice(0, 4).map((p) => (
                  <ProjectCard
                    project={p}
                    records={store.records}
                    key={p.id}
                    onClick={() => navigate("projects")}
                  />
                ))}
                {!projects.length && <Empty action={() => edit("project")} />}
              </div>
            </Section>
          )}
          <Section title={tr.dailyReview} sub={tr.reviewHint}>
            <textarea
              className="review-input"
              aria-label={tr.dailyReview}
              placeholder={tr.reviewPlaceholder}
              value={reviewText ?? review?.data.body ?? ""}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
            />
            <div className="review-footer">
              <span>
                <CalendarDays size={14} />
                {day}
              </span>
              <button
                className="button secondary"
                onClick={() =>
                  void store.save(
                    "review",
                    {
                      title: tr.dailyReview,
                      date: day,
                      body: reviewText ?? review?.data.body ?? "",
                    },
                    review?.id,
                    review?.version,
                  )
                }
              >
                {tr.save}
              </button>
            </div>
          </Section>
        </div>
        <div className="dashboard-side">
          <FocusPanel store={store} compact />
          <Section
            title={tr.reminders}
            action={
              <button
                className="icon-button"
                aria-label={tr.new}
                onClick={() => edit("reminder")}
              >
                <Plus size={17} />
              </button>
            }
          >
            <Reminders store={store} edit={edit} />
            <p className="delivery-hint">
              {isTauri() ? tr.nativeHint : tr.inAppOnly}
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
