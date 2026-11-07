import { useState } from "react";
import {
  Pin,
  NotebookPen,
  LayoutGrid,
  Columns2,
  ChevronRight,
} from "lucide-react";
import { entities } from "@lifeos/core";
import { tr } from "../i18n";
import { Empty } from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
import { NoteCard } from "./note-card";
export function Ideas({
  store,
  edit,
  search,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
}) {
  const [archive, setArchive] = useState(false);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [layout, setLayout] = useState<"desk" | "cards">(() => {
    try {
      return localStorage.getItem("lifeos-notes-layout") === "cards"
        ? "cards"
        : "desk";
    } catch {
      return "desk";
    }
  });
  const matching = entities(store.records, "note")
    .filter(
      (n) =>
        n.data.archived === archive &&
        `${n.data.title} ${n.data.body} ${n.data.tags.join(" ")}`
          .toLocaleLowerCase("tr")
          .includes(search.toLocaleLowerCase("tr")),
    )
    .sort(
      (a, b) =>
        Number(b.data.pinned) - Number(a.data.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  const categories = [...new Set(matching.map((n) => n.data.category))].sort(
    (a, b) => a.localeCompare(b, "tr"),
  );
  const notes = matching.filter(
    (n) => !category || n.data.category === category,
  );
  const active = notes.find((n) => n.id === selected) ?? notes[0];
  const changeLayout = (value: "desk" | "cards") => {
    setLayout(value);
    try {
      localStorage.setItem("lifeos-notes-layout", value);
    } catch {
      /* Optional view preference. */
    }
  };
  return (
    <>
      <div className="notes-studio-intro">
        <span className="notes-studio-mark">
          <NotebookPen size={28} />
        </span>
        <div>
          <h2>{tr.notesDesk}</h2>
          <p>{tr.notesDeskHint}</p>
        </div>
        <div className="view-switch" role="group" aria-label={tr.notesLayout}>
          <button
            aria-pressed={layout === "desk"}
            onClick={() => changeLayout("desk")}
          >
            <Columns2 size={16} />
            {tr.notesDeskView}
          </button>
          <button
            aria-pressed={layout === "cards"}
            onClick={() => changeLayout("cards")}
          >
            <LayoutGrid size={16} />
            {tr.notesCardsView}
          </button>
        </div>
      </div>
      <div className="toolbar notes-filter-bar">
        <div
          className="category-filters"
          role="group"
          aria-label={tr.noteCategoryFilter}
        >
          <button
            className={!category ? "selected" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            {tr.all} <small>{matching.length}</small>
          </button>
          {categories.map((value) => (
            <button
              key={value}
              className={category === value ? "selected" : ""}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          className={`button secondary ${archive ? "selected" : ""}`}
          aria-pressed={archive}
          onClick={() => {
            setArchive(!archive);
            setCategory("");
          }}
        >
          {tr.archived}
        </button>
      </div>
      {layout === "desk" && active ? (
        <div className="notes-workbench">
          <nav className="notes-index" aria-label={tr.noteSelection}>
            {notes.map((n) => (
              <button
                key={n.id}
                className={`note-index-item ${active.id === n.id ? "active" : ""}`}
                aria-current={active.id === n.id ? "true" : undefined}
                onClick={() => setSelected(n.id)}
              >
                <span className="note-index-meta">
                  {n.data.category}
                  {n.data.pinned && <Pin size={12} />}
                </span>
                <strong>{n.data.title}</strong>
                <span className="note-index-excerpt">
                  {n.data.body.replace(/[#*`>]/g, "").slice(0, 110) ||
                    tr.noteEmptyBody}
                </span>
                <small>
                  {new Date(n.updatedAt).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    timeZone: store.settings.timezone,
                  })}
                  <ChevronRight size={14} />
                </small>
              </button>
            ))}
          </nav>
          <div className="note-editor-surface">
            <NoteCard key={active.id} note={active} store={store} edit={edit} />
          </div>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} store={store} edit={edit} />
          ))}
          {!notes.length && <Empty action={() => edit("note")} />}
        </div>
      )}
    </>
  );
}
