import { Flame, Check } from "lucide-react";
import { entities, today, streak, type TypedEntity } from "@lifeos/core";
import { tr, label } from "../i18n";
import { Empty, EditButton, DeleteButton } from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
export function Habits({
  store,
  edit,
  search,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
}) {
  const day = today(store.settings.timezone),
    habits = entities(store.records, "habit"),
    logs = entities(store.records, "habitLog");
  const toggle = async (h: TypedEntity<"habit">) => {
    const log = logs.find(
      (l) => l.data.habitId === h.id && l.data.date === day,
    );
    await store.save(
      "habitLog",
      { habitId: h.id, date: day, count: log?.data.count ? 0 : h.data.target },
      log?.id ?? `${h.id.slice(0, 24)}${day.replaceAll("-", "")}0000`,
      log?.version ?? 0,
    );
  };
  return (
    <div className="habit-grid">
      {habits
        .filter((h) =>
          h.data.title
            .toLocaleLowerCase("tr")
            .includes(search.toLocaleLowerCase("tr")),
        )
        .map((h) => {
          const done = logs.some(
              (l) =>
                l.data.habitId === h.id &&
                l.data.date === day &&
                l.data.count >= h.data.target,
            ),
            dates = logs
              .filter(
                (l) => l.data.habitId === h.id && l.data.count >= h.data.target,
              )
              .map((l) => l.data.date);
          return (
            <article className="panel habit-card" key={h.id}>
              <div className="section-heading">
                <span className="badge orange">{h.data.category}</span>
                <div className="row-actions">
                  <EditButton onClick={() => edit("habit", h)} />
                  <DeleteButton record={h} store={store} />
                </div>
              </div>
              <h3>{h.data.title}</h3>
              <p className="muted">
                {label(h.data.frequency)} · {h.data.target} {h.data.unit}
                {h.data.preferredTime && ` · ${h.data.preferredTime}`}
              </p>
              <div className="habit-days">
                {Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(day + "T12:00Z");
                  d.setUTCDate(d.getUTCDate() - 13 + i);
                  const value = d.toISOString().slice(0, 10);
                  return (
                    <span
                      title={value}
                      key={value}
                      className={dates.includes(value) ? "complete" : ""}
                    >
                      {d.getUTCDate()}
                    </span>
                  );
                })}
              </div>
              <div className="section-heading">
                <span className="streak">
                  <Flame size={16} />
                  {streak(dates, day)} {tr.streak}
                </span>
                <button
                  className={`button ${done ? "secondary" : "primary"}`}
                  onClick={() => void toggle(h)}
                >
                  <Check size={14} />
                  {done ? tr.doneToday : tr.checkHabit}
                </button>
              </div>
              {h.data.notes && <p className="muted">{h.data.notes}</p>}
            </article>
          );
        })}
      {!habits.length && <Empty action={() => edit("habit")} />}
    </div>
  );
}
