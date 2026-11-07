import { useEffect, useRef, useState } from "react";
import { Pin } from "lucide-react";
import { entities, type TypedEntity } from "@lifeos/core";
import { tr } from "../i18n";
import { EditButton, DeleteButton } from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
import { Markdown } from "../markdown";
export function NoteCard({
  note,
  store,
  edit,
}: {
  note: TypedEntity<"note">;
  store: LifeStore;
  edit: Edit;
}) {
  const draftKey = `lifeos-note-draft:${note.id}`;
  const [preview, setPreview] = useState(false);
  const readDraft = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as {
        body?: unknown;
        savedBody?: unknown;
        version?: unknown;
      } | null;
      return value &&
        typeof value.body === "string" &&
        value.body.length <= 20000 &&
        typeof value.savedBody === "string" &&
        typeof value.version === "number"
        ? (value as { body: string; savedBody: string; version: number })
        : null;
    } catch {
      return null;
    }
  };
  const [initialDraft] = useState(readDraft);
  const [body, setBody] = useState(initialDraft?.body ?? note.data.body),
    [savedBody, setSavedBody] = useState(
      initialDraft?.savedBody ?? note.data.body,
    ),
    [version, setVersion] = useState(initialDraft?.version ?? note.version),
    [conflicted, setConflicted] = useState(false);
  const pending = useRef<Promise<boolean> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    flushRef = useRef<() => Promise<boolean>>(async () => true);
  useEffect(() => {
    if (note.version === version) return;
    if (body === savedBody || note.data.body === body) {
      setBody(note.data.body);
      setSavedBody(note.data.body);
      setVersion(note.version);
    } else if (note.data.body === savedBody) {
      setVersion(note.version);
    } else {
      setConflicted(true);
    }
  }, [note.version, note.data.body]);
  const flush = (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) return pending.current;
    if (conflicted) return Promise.resolve(false);
    if (body === savedBody) return Promise.resolve(true);
    const action = store
      .service()
      .save("note", { ...note.data, body }, note.id, version)
      .then(async (record) => {
        setVersion(record.version);
        setSavedBody(body);
        const newer = readDraft();
        if (newer?.body === body) sessionStorage.removeItem(draftKey);
        else if (newer)
          sessionStorage.setItem(
            draftKey,
            JSON.stringify({
              ...newer,
              version: record.version,
              savedBody: body,
            }),
          );
        await store.refresh();
        return true;
      })
      .catch((error) => {
        store.setError(String(error));
        setConflicted(true);
        return false;
      })
      .finally(() => {
        pending.current = null;
      });
    pending.current = action;
    return action;
  };
  flushRef.current = flush;
  useEffect(() => {
    if (body === savedBody || conflicted) return;
    timer.current = setTimeout(() => void flushRef.current(), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [body, savedBody, version, conflicted]);
  useEffect(
    () => () => {
      void flushRef.current();
    },
    [],
  );
  const changeBody = (value: string) => {
    setBody(value);
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ body: value, savedBody, version }),
      );
    } catch {
      store.setError(tr.draftStorageError);
    }
  };
  const mutate = async (patch: Record<string, unknown>) => {
    if (!(await flush())) return;
    const latest = entities(await store.service().list(), "note").find(
      (r) => r.id === note.id,
    );
    if (latest)
      await store.save(
        "note",
        { ...latest.data, ...patch },
        note.id,
        latest.version,
      );
  };
  const editLatest = async () => {
    if (!(await flush())) return;
    const latest = entities(await store.service().list(), "note").find(
      (r) => r.id === note.id,
    );
    if (latest) edit("note", latest);
  };
  const saveCopy = async () => {
    const record = await store.save("note", {
      ...note.data,
      title: note.data.title.slice(0, 225) + " (" + tr.draft + ")",
      body,
      pinned: true,
    });
    if (record) {
      sessionStorage.removeItem(draftKey);
      setBody(note.data.body);
      setSavedBody(note.data.body);
      setVersion(note.version);
      setConflicted(false);
    }
  };
  // Preserve the click target while blur-triggered autosave changes the layout.
  return (
    <article
      className="panel note-card"
      onMouseDown={(event) => {
        if (event.target instanceof Element && event.target.closest("button"))
          event.preventDefault();
      }}
    >
      <div className="section-heading">
        <span className="badge">{note.data.category}</span>
        <div className="row-actions">
          <button
            className={`icon-button ${note.data.pinned ? "orange-text" : ""}`}
            aria-label={tr.pin}
            onClick={() => void mutate({ pinned: !note.data.pinned })}
          >
            <Pin size={15} />
          </button>
          <EditButton onClick={() => void editLatest()} />
          <DeleteButton record={note} store={store} />
        </div>
      </div>
      <h3>{note.data.title}</h3>
      <button
        className="text-button"
        aria-pressed={preview}
        onClick={() => setPreview(!preview)}
      >
        {preview ? tr.write : tr.preview}
      </button>
      {preview ? (
        <Markdown body={body} />
      ) : (
        <textarea
          aria-label={tr.body}
          value={body}
          onChange={(e) => changeBody(e.target.value)}
          onBlur={() => void flush()}
          rows={5}
        />
      )}
      {conflicted ? (
        <div className="error-message" role="alert">
          {tr.noteConflict}
          <button className="text-button" onClick={() => void saveCopy()}>
            {tr.saveDraftCopy}
          </button>
        </div>
      ) : (
        body !== savedBody && <small className="muted">{tr.unsavedDraft}</small>
      )}
      <div className="note-tags">
        {note.data.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="note-actions">
        <button
          className="text-button"
          onClick={() =>
            edit("task", undefined, {
              title: note.data.title,
              description: body,
            })
          }
        >
          {tr.convertTask}
        </button>
        <button
          className="text-button"
          onClick={() =>
            edit("project", undefined, {
              title: note.data.title,
              description: body,
            })
          }
        >
          {tr.convertProject}
        </button>
        <button
          className="text-button"
          onClick={() => void mutate({ archived: !note.data.archived })}
        >
          {note.data.archived ? tr.restore : tr.archive}
        </button>
      </div>
    </article>
  );
}
