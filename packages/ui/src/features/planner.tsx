import { useState } from "react";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import {
  entities,
  today,
  formatTime,
  localInstant,
  overlaps,
} from "@lifeos/core";
import { tr, label } from "../i18n";
import { Section, TaskRow } from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
export function Planner({ store, edit }: { store: LifeStore; edit: Edit }) {
  const [date, setDate] = useState(today(store.settings.timezone)),
    [view, setView] = useState("week");
  const base = new Date(date + "T12:00:00Z"),
    count =
      view === "day"
        ? 1
        : view === "week"
          ? 7
          : new Date(
              base.getUTCFullYear(),
              base.getUTCMonth() + 1,
              0,
            ).getUTCDate();
  const start =
    view === "month"
      ? new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12))
      : base;
  const days = Array.from({ length: count }, (_, i) =>
    new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10),
  );
  const tasks = entities(store.records, "task").filter(
    (t) =>
      !t.data.recurrence &&
      !t.data.archived &&
      !["cancelled", "skipped"].includes(t.data.status),
  );
  const move = async (id: string, day: string) => {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    const hour = t.data.scheduledAt
      ? formatTime(t.data.scheduledAt, store.settings.timezone)
      : "09:00";
    await store.save(
      "task",
      {
        ...t.data,
        status: "planned",
        scheduledAt: localInstant(`${day}T${hour}`, store.settings.timezone),
      },
      t.id,
      t.version,
    );
  };
  return (
    <>
      <div className="toolbar">
        <div className="filter-tabs">
          {["day", "week", "month"].map((v) => (
            <button
              key={v}
              className={view === v ? "selected" : ""}
              onClick={() => setView(v)}
            >
              {label(v)}
            </button>
          ))}
        </div>
        <div className="date-nav">
          <button
            className="icon-button"
            aria-label={tr.previous}
            onClick={() =>
              setDate(
                new Date(
                  base.getTime() -
                    (view === "month" ? count : count) * 86400000,
                )
                  .toISOString()
                  .slice(0, 10),
              )
            }
          >
            <ArrowLeft size={17} />
          </button>
          <input
            type="date"
            aria-label={tr.date}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button
            className="icon-button"
            aria-label={tr.next}
            onClick={() =>
              setDate(
                new Date(base.getTime() + count * 86400000)
                  .toISOString()
                  .slice(0, 10),
              )
            }
          >
            <ArrowRight size={17} />
          </button>
          <button
            className="text-button"
            onClick={() => setDate(today(store.settings.timezone))}
          >
            {tr.today}
          </button>
        </div>
      </div>
      <div className={`planner ${view}`}>
        {days.map((day) => {
          const entries = tasks
            .filter(
              (t) =>
                t.data.scheduledAt &&
                today(store.settings.timezone, new Date(t.data.scheduledAt)) ===
                  day,
            )
            .sort((a, b) =>
              String(a.data.scheduledAt).localeCompare(
                String(b.data.scheduledAt),
              ),
            );
          return (
            <div
              className={`planner-day ${day === today(store.settings.timezone) ? "is-today" : ""}`}
              key={day}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void move(e.dataTransfer.getData("text/plain"), day);
              }}
            >
              <header>
                <span>
                  {new Date(day + "T12:00Z").toLocaleDateString("tr-TR", {
                    weekday: "short",
                    day: "numeric",
                    month: view === "day" ? "long" : undefined,
                    timeZone: "UTC",
                  })}
                </span>
                <button
                  className="icon-button"
                  aria-label={tr.new}
                  onClick={() =>
                    edit("task", undefined, {
                      scheduledAt: localInstant(
                        day + "T09:00",
                        store.settings.timezone,
                      ),
                      status: "planned",
                    })
                  }
                >
                  <Plus size={14} />
                </button>
              </header>
              {day === today(store.settings.timezone) && (
                <div className="now-indicator">
                  {formatTime(
                    new Date().toISOString(),
                    store.settings.timezone,
                  )}
                </div>
              )}
              {entries.map((t) => (
                <button
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", t.id)
                  }
                  onClick={() => edit("task", t)}
                  key={t.id}
                  className={`schedule-block ${t.data.status === "completed" ? "is-done" : ""}`}
                >
                  <small>
                    {formatTime(t.data.scheduledAt!, store.settings.timezone)} ·{" "}
                    {t.data.duration} dk
                  </small>
                  <strong>{t.data.title}</strong>
                  <span>{t.data.category}</span>
                  {entries.some(
                    (x) => x.id !== t.id && overlaps(x.data, t.data),
                  ) && <em>{tr.overlap}</em>}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <Section title={tr.unscheduled}>
        {tasks.filter((t) => !t.data.scheduledAt).length ? (
          tasks
            .filter((t) => !t.data.scheduledAt)
            .map((t) => (
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                key={t.id}
              >
                <TaskRow
                  task={t}
                  store={store}
                  onEdit={() => edit("task", t)}
                />
              </div>
            ))
        ) : (
          <p className="muted">{tr.empty}</p>
        )}
      </Section>
    </>
  );
}
