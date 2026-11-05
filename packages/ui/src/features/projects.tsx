import { useState } from "react";
import { Plus, ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { entities, type Entity, type TypedEntity } from "@lifeos/core";
import { tr, label } from "../i18n";
import { Section, Empty, EditButton, DeleteButton } from "../components";
import { TaskList } from "./tasks";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
export function Projects({
  store,
  edit,
  search,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
}) {
  const [selected, setSelected] = useState(""),
    [view, setView] = useState("list");
  const projects = entities(store.records, "project"),
    project = projects.find((p) => p.id === selected);
  const tasks = entities(store.records, "task").filter(
    (t) =>
      t.data.projectId === selected && !t.data.recurrence && !t.data.archived,
  );
  if (project)
    return (
      <>
        <div className="toolbar">
          <button className="button secondary" onClick={() => setSelected("")}>
            <ArrowLeft size={15} />
            {tr.back}
          </button>
          <h2>{project.data.title}</h2>
          <EditButton onClick={() => edit("project", project)} />
          <DeleteButton record={project} store={store} />
        </div>
        <p className="muted">{project.data.description}</p>
        <div className="filter-tabs">
          {["list", "kanban", "milestones"].map((v) => (
            <button
              key={v}
              className={view === v ? "selected" : ""}
              onClick={() => setView(v)}
            >
              {label(v)}
            </button>
          ))}
        </div>
        {view === "list" ? (
          <TaskList
            store={store}
            edit={edit}
            search={search}
            projectId={selected}
          />
        ) : view === "kanban" ? (
          <div className="kanban">
            {["inbox", "planned", "in_progress", "completed"].map((status) => (
              <div
                className="kanban-column"
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const task = tasks.find(
                    (t) => t.id === e.dataTransfer.getData("text/plain"),
                  );
                  if (task)
                    void store.save(
                      "task",
                      {
                        ...task.data,
                        status,
                        completedAt:
                          status === "completed"
                            ? new Date().toISOString()
                            : undefined,
                      },
                      task.id,
                      task.version,
                    );
                }}
              >
                <h3>
                  {label(status)}{" "}
                  <small>
                    {tasks.filter((t) => t.data.status === status).length}
                  </small>
                </h3>
                {tasks
                  .filter((t) => t.data.status === status)
                  .map((t) => (
                    <button
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", t.id)
                      }
                      key={t.id}
                      className="kanban-card"
                      onClick={() => edit("task", t)}
                    >
                      <span className="badge">{label(t.data.type)}</span>
                      <strong>{t.data.title}</strong>
                      <small>{label(t.data.priority)}</small>
                    </button>
                  ))}
                <button
                  className="text-button"
                  onClick={() =>
                    edit("task", undefined, { projectId: selected, status })
                  }
                >
                  <Plus size={14} />
                  {tr.new}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Section
            title={tr.milestones}
            action={
              <button
                className="button secondary"
                onClick={() =>
                  edit("milestone", undefined, { projectId: selected })
                }
              >
                <Plus size={15} />
                {tr.new}
              </button>
            }
          >
            {entities(store.records, "milestone")
              .filter((m) => m.data.projectId === selected)
              .map((m) => (
                <div className="simple-row" key={m.id}>
                  <button
                    className={`check-button ${m.data.completed ? "checked" : ""}`}
                    aria-label={tr.complete}
                    onClick={() =>
                      void store.save(
                        "milestone",
                        { ...m.data, completed: !m.data.completed },
                        m.id,
                        m.version,
                      )
                    }
                  >
                    {m.data.completed && <Check size={13} />}
                  </button>
                  <span>
                    {m.data.title}
                    <small>{m.data.targetDate}</small>
                  </span>
                  <EditButton onClick={() => edit("milestone", m)} />
                  <DeleteButton record={m} store={store} />
                </div>
              ))}
          </Section>
        )}
        <button
          className="button primary"
          onClick={() => edit("task", undefined, { projectId: selected })}
        >
          <Plus size={16} />
          {tr.new}
        </button>
        <Section title={tr.notes}>
          <p className="prewrap">{project.data.notes || tr.empty}</p>
        </Section>
      </>
    );
  return (
    <div className="project-grid">
      {projects
        .filter((p) =>
          p.data.title
            .toLocaleLowerCase("tr")
            .includes(search.toLocaleLowerCase("tr")),
        )
        .map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            records={store.records}
            onClick={() => setSelected(p.id)}
          />
        ))}
      {!projects.length && <Empty action={() => edit("project")} />}
    </div>
  );
}
export function ProjectCard({
  project,
  records,
  onClick,
}: {
  project: TypedEntity<"project">;
  records: Entity[];
  onClick: () => void;
}) {
  const tasks = entities(records, "task").filter(
      (t) =>
        t.data.projectId === project.id &&
        !t.data.recurrence &&
        !t.data.archived,
    ),
    done = tasks.filter((t) => t.data.status === "completed").length,
    next = entities(records, "milestone")
      .filter((m) => m.data.projectId === project.id && !m.data.completed)
      .sort((a, b) =>
        String(a.data.targetDate).localeCompare(String(b.data.targetDate)),
      )[0];
  return (
    <button className="project-card" onClick={onClick}>
      <div>
        <span className="project-mark">{project.data.title.slice(0, 1)}</span>
        <span
          className={`badge ${project.data.status === "active" ? "blue" : ""}`}
        >
          {label(project.data.status)}
        </span>
        <ArrowUpRight size={16} />
      </div>
      <h3>{project.data.title}</h3>
      <p>{project.data.description || project.data.type}</p>
      <div className="progress-track">
        <i
          style={{
            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
          }}
        />
      </div>
      <footer>
        <span>
          {done} / {tasks.length} {tr.taskCount}
        </span>
        {next && <span>{next.data.title}</span>}
      </footer>
    </button>
  );
}
