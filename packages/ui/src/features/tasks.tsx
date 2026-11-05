import { useState } from "react";
import { entities, today, type TypedEntity } from "@lifeos/core";
import { tr, label } from "../i18n";
import {
  Section,
  Empty,
  TaskRow,
  EditButton,
  DeleteButton,
} from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
export function TaskList({
  store,
  edit,
  search,
  projectId,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
  projectId?: string;
}) {
  const [status, setStatus] = useState("all"),
    [group, setGroup] = useState("none"),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [archived, setArchived] = useState(false);
  const all = entities(store.records, "task").filter(
    (t) =>
      (!projectId || t.data.projectId === projectId) &&
      !t.data.recurrence &&
      t.data.archived === archived &&
      t.data.title
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")) &&
      (status === "all" || t.data.status === status),
  );
  const grouped = new Map<string, TypedEntity<"task">[]>();
  for (const t of all) {
    const key =
      group === "groupDate"
        ? (t.data.dueDate ??
          (t.data.scheduledAt
            ? today(store.settings.timezone, new Date(t.data.scheduledAt))
            : tr.unscheduled))
        : group === "groupCategory"
          ? t.data.category
          : group === "groupProject"
            ? (entities(store.records, "project").find(
                (p) => p.id === t.data.projectId,
              )?.data.title ?? tr.unscheduled)
            : "";
    const items = grouped.get(key) ?? [];
    items.push(t);
    grouped.set(key, items);
  }
  const bulk = async (archive = false) => {
    await store.run(async () => {
      for (const t of all.filter((t) =>
        archive ? t.data.status === "completed" : selected.has(t.id),
      ))
        await store
          .service()
          .save(
            "task",
            {
              ...t.data,
              archived: archive || t.data.archived,
              status: archive ? t.data.status : "completed",
              completedAt: t.data.completedAt ?? new Date().toISOString(),
            },
            t.id,
            t.version,
          );
    });
    setSelected(new Set());
  };
  return (
    <>
      <div className="toolbar">
        <div className="filter-tabs">
          {["all", "inbox", "planned", "in_progress", "completed"].map((s) => (
            <button
              key={s}
              className={s === status ? "selected" : ""}
              onClick={() => setStatus(s)}
            >
              {label(s)}
            </button>
          ))}
        </div>
        <select
          aria-label={tr.group}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {["none", "groupDate", "groupProject", "groupCategory"].map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <button
          className={`button secondary ${archived ? "selected" : ""}`}
          onClick={() => setArchived(!archived)}
        >
          {tr.archived}
        </button>
      </div>
      <div className="toolbar">
        <button className="text-button" onClick={() => void bulk(true)}>
          {tr.archiveDone}
        </button>
        {selected.size > 0 && (
          <button className="button secondary" onClick={() => void bulk()}>
            {tr.bulkComplete} ({selected.size})
          </button>
        )}
      </div>
      <section className="panel task-list">
        {!all.length ? (
          <Empty action={() => edit("task", undefined, { projectId })} />
        ) : (
          Array.from(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, tasks]) => (
              <div key={name}>
                {name && <h3 className="group-heading">{name}</h3>}
                {tasks.map((t) => (
                  <div key={t.id} className="task-with-delete">
                    <TaskRow
                      task={t}
                      store={store}
                      onEdit={() => edit("task", t)}
                      checked={selected.has(t.id)}
                      select={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(t.id)) next.delete(t.id);
                          else next.add(t.id);
                          return next;
                        })
                      }
                    />
                    {archived && (
                      <button
                        className="text-button"
                        onClick={() =>
                          void store.save(
                            "task",
                            { ...t.data, archived: false },
                            t.id,
                            t.version,
                          )
                        }
                      >
                        {tr.restore}
                      </button>
                    )}
                    <DeleteButton record={t} store={store} />
                  </div>
                ))}
              </div>
            ))
        )}
      </section>
      {entities(store.records, "task").some((t) => t.data.recurrence) && (
        <Section title={tr.series} sub={tr.deleteSeries}>
          {entities(store.records, "task")
            .filter((t) => t.data.recurrence)
            .map((t) => (
              <div className="simple-row" key={t.id}>
                <span>
                  {t.data.title}
                  <small>{label(t.data.status)}</small>
                </span>
                <EditButton onClick={() => edit("task", t)} />
              </div>
            ))}
        </Section>
      )}
    </>
  );
}
