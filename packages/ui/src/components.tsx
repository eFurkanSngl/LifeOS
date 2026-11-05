import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Plus,
  ArrowUpRight,
  Check,
  Trash2,
  Pencil,
  Clock3,
  Ellipsis,
  Inbox,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { type Entity, type Kind, entities } from "./types";
import {
  schemas,
  localInput,
  localInstant,
  taskSchema,
  formatTime,
  SETTINGS_ID,
  type TypedEntity,
} from "@lifeos/core";
import { tr, label } from "./i18n";
import { openLink } from "./native";
import type { LifeStore } from "./store";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-head">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label={tr.cancel}>
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = tr.empty,
  hint = tr.emptyHint,
  action,
}: {
  title?: string;
  hint?: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <p>{title}</p>
      <span>{hint}</span>
      {action && (
        <button className="button secondary" onClick={action}>
          <Plus size={15} />
          {tr.new}
        </button>
      )}
    </div>
  );
}
export function Section({
  title,
  children,
  action,
  sub,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  sub?: string;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function ExternalLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <a
      href={url}
      onClick={(e) =>
        openLink(e, url, (message) =>
          window.dispatchEvent(
            new CustomEvent("lifeos-error", { detail: message }),
          ),
        )
      }
      target="_blank"
      rel="noopener noreferrer"
      className="external-link"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
export function DeleteButton({
  record,
  store,
}: {
  record: Entity;
  store: LifeStore;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="icon-button danger-hover"
        aria-label={tr.remove}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={15} />
      </button>
      {open && (
        <Modal title={tr.deleteConfirm} onClose={() => setOpen(false)}>
          <p className="muted">{tr.deleteHint}</p>
          <p>{String(record.data.title ?? "")}</p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              {tr.cancel}
            </button>
            <button
              className="button danger"
              onClick={async () => {
                const result = await store.run(
                  () => store.service().remove(record),
                  tr.deleted,
                );
                void result;
                setOpen(false);
              }}
            >
              {tr.remove}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function TaskRow({
  task,
  store,
  onEdit,
  select,
  checked,
}: {
  task: TypedEntity<"task">;
  store: LifeStore;
  onEdit: () => void;
  select?: () => void;
  checked?: boolean;
}) {
  const t = task.data,
    done = t.status === "completed",
    overdue =
      t.dueDate &&
      t.dueDate <
        new Intl.DateTimeFormat("en-CA", {
          timeZone: store.settings.timezone,
        }).format(new Date()) &&
      !done;
  return (
    <div className={`task-row ${done ? "is-done" : ""}`}>
      {select && (
        <input
          aria-label={`${tr.selected}: ${t.title}`}
          type="checkbox"
          checked={checked}
          onChange={select}
        />
      )}
      <button
        aria-label={`${done ? tr.undo : tr.complete}: ${t.title}`}
        className={`check-button ${done ? "checked" : ""}`}
        onClick={() =>
          void store.save(
            "task",
            {
              ...t,
              status: done ? "planned" : "completed",
              completedAt: done ? undefined : new Date().toISOString(),
            },
            task.id,
            task.version,
          )
        }
      >
        {done && <Check size={13} />}
      </button>
      <button className="task-main" onClick={onEdit}>
        <span>{t.title}</span>
        <small>
          {t.category}
          {t.scheduledAt && (
            <> · {formatTime(t.scheduledAt, store.settings.timezone)}</>
          )}{" "}
          · {t.duration} dk{overdue && <em>{tr.overdue}</em>}
        </small>
      </button>
      {t.priority !== "normal" && (
        <span className={`badge ${t.priority}`}>{label(t.priority)}</span>
      )}
      <span className="task-status">{label(t.status)}</span>
      <button className="icon-button" aria-label={tr.edit} onClick={onEdit}>
        <Ellipsis size={18} />
      </button>
    </div>
  );
}
type Field = {
  key: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
const fields: Partial<Record<Kind, Field[]>> = {
  task: [
    { key: "title", required: true },
    { key: "description", type: "textarea" },
    { key: "category" },
    { key: "projectId", type: "project" },
    { key: "priority", options: ["low", "normal", "high", "critical"] },
    {
      key: "status",
      options: [
        "inbox",
        "planned",
        "in_progress",
        "completed",
        "skipped",
        "cancelled",
      ],
    },
    { key: "scheduledAt", type: "datetime-local" },
    { key: "dueDate", type: "date" },
    { key: "duration", type: "number" },
    {
      key: "type",
      options: ["feature", "bug", "improvement", "research", "maintenance"],
    },
    { key: "severity", options: ["", "low", "medium", "high", "critical"] },
    { key: "milestoneId", type: "milestone" },
    { key: "tags" },
    { key: "notes", type: "textarea" },
  ],
  project: [
    { key: "title", required: true },
    { key: "description", type: "textarea" },
    { key: "type" },
    { key: "status", options: ["active", "paused", "completed"] },
    { key: "startDate", type: "date" },
    { key: "targetDate", type: "date" },
    { key: "priority", options: ["low", "normal", "high", "critical"] },
    { key: "notes", type: "textarea" },
  ],
  habit: [
    { key: "title", required: true },
    { key: "category" },
    { key: "frequency", options: ["daily", "weekdays", "weekly"] },
    { key: "target", type: "number" },
    { key: "unit" },
    { key: "preferredTime", type: "time" },
    { key: "notes", type: "textarea" },
  ],
  note: [
    { key: "title", required: true },
    { key: "body", type: "textarea" },
    { key: "category" },
    { key: "tags" },
    { key: "pinned", type: "checkbox" },
  ],
  contact: [
    { key: "title", required: true },
    { key: "company" },
    { key: "position" },
    { key: "url", type: "url" },
    { key: "category" },
    { key: "status" },
    { key: "lastInteraction", type: "date" },
    { key: "followUp", type: "date" },
    { key: "notes", type: "textarea" },
  ],
  application: [
    { key: "title", required: true },
    { key: "company", required: true },
    { key: "url", type: "url" },
    { key: "date", type: "date" },
    {
      key: "status",
      options: [
        "interested",
        "applied",
        "contacted",
        "interview",
        "waiting",
        "rejected",
        "offer",
        "closed",
      ],
    },
    { key: "followUp", type: "date" },
    { key: "notes", type: "textarea" },
  ],
  shortcut: [
    { key: "title", required: true },
    { key: "url", type: "url", required: true },
    { key: "color", options: ["blue", "orange", "green"] },
    { key: "icon", options: ["chat", "code", "book"] },
    { key: "pinned", type: "checkbox" },
    { key: "order", type: "number" },
  ],
  codex: [
    { key: "title", required: true },
    { key: "reference", required: true },
    { key: "url", type: "url" },
    { key: "projectId", type: "project" },
    { key: "notes", type: "textarea" },
  ],
  reminder: [
    { key: "title", required: true },
    { key: "fireAt", type: "datetime-local", required: true },
    { key: "taskId", type: "task" },
    { key: "habitId", type: "habit" },
    { key: "contactId", type: "contact" },
    { key: "sound", type: "checkbox" },
  ],
  milestone: [
    { key: "title", required: true },
    { key: "projectId", type: "project", required: true },
    { key: "targetDate", type: "date" },
    { key: "completed", type: "checkbox" },
  ],
  interaction: [
    { key: "title", required: true },
    { key: "contactId", type: "contact", required: true },
    { key: "date", type: "date", required: true },
    { key: "body", type: "textarea" },
  ],
  settings: [
    { key: "timezone", required: true },
    { key: "sound", type: "checkbox" },
    { key: "quietEnabled", type: "checkbox" },
    { key: "quietStart", type: "time" },
    { key: "quietEnd", type: "time" },
    { key: "snoozeMinutes", type: "number" },
    { key: "closeToTray", type: "checkbox" },
    { key: "minimizeToTray", type: "checkbox" },
    { key: "mcpEnabled", type: "checkbox" },
  ],
};
export function RecordForm({
  kind,
  record,
  initial = {},
  store,
  onClose,
}: {
  kind: Kind;
  record?: Entity;
  initial?: Record<string, unknown>;
  store: LifeStore;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    let base: Record<string, unknown> = { ...initial, ...record?.data };
    for (const field of fields[kind] ?? []) {
      if (field.type === "datetime-local" && base[field.key])
        base[field.key] = localInput(
          String(base[field.key]),
          store.settings.timezone,
        );
      if (field.key === "tags" && Array.isArray(base.tags))
        base.tags = base.tags.join(", ");
    }
    if (kind === "task") {
      const parsed = taskSchema.safeParse({
        ...base,
        title: base.title || "x",
        scheduledAt: undefined,
        tags: [],
      });
      if (parsed.success) base = { ...parsed.data, ...base };
    }
    return base;
  });
  const [repeat, setRepeat] = useState(
      (record?.data.recurrence as { frequency?: string } | undefined)
        ?.frequency ?? "",
    ),
    [interval, setIntervalValue] = useState(
      String(
        (record?.data.recurrence as { interval?: number } | undefined)
          ?.interval ?? 1,
      ),
    ),
    [until, setUntil] = useState(
      String(
        (record?.data.recurrence as { until?: string } | undefined)?.until ??
          "",
      ),
    ),
    [weekdays, setWeekdays] = useState(
      (
        (record?.data.recurrence as { weekdays?: number[] } | undefined)
          ?.weekdays ?? []
      ).join(","),
    ),
    [remind, setRemind] = useState(
      record?.data.reminderOffsetMinutes !== undefined,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = { ...form };
      for (const f of fields[kind] ?? []) {
        if (f.type === "number" && data[f.key] !== undefined)
          data[f.key] = Number(data[f.key]);
        if (f.type === "datetime-local" && data[f.key])
          data[f.key] = localInstant(
            String(data[f.key]),
            store.settings.timezone,
          );
        if (f.type === "checkbox") data[f.key] = Boolean(data[f.key]);
        if (
          data[f.key] === "" &&
          ![
            "title",
            "body",
            "description",
            "notes",
            "company",
            "position",
            "category",
            "status",
            "type",
            "unit",
          ].includes(f.key)
        )
          delete data[f.key];
      }
      if ("tags" in data)
        data.tags = String(data.tags ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      if (kind === "task") {
        data.reminderOffsetMinutes = remind
          ? Number(form.reminderOffsetMinutes ?? 0)
          : undefined;
        if (remind && !data.scheduledAt)
          throw new Error(tr.reminderNeedsSchedule);
        data.recurrence = repeat
          ? {
              frequency: repeat,
              interval: Number(interval),
              until: until || undefined,
              weekdays: weekdays.split(",").filter(Boolean).map(Number),
              timezone: store.settings.timezone,
            }
          : undefined;
        if (repeat && !data.scheduledAt)
          throw new Error("Tekrar için planlanan başlangıç gerekli.");
        if (data.status === "completed" && !data.completedAt)
          data.completedAt = new Date().toISOString();
        if (data.status !== "completed") delete data.completedAt;
      }
      if (kind === "reminder" && data.fireAt !== record?.data.fireAt) {
        data.status = "pending";
        delete data.deliveredAt;
      }
      const parsed = schemas[kind].parse(data);
      const saved = await store
        .service()
        .save(
          kind,
          parsed,
          kind === "settings" ? SETTINGS_ID : record?.id,
          record?.version,
        );
      if (
        (kind === "contact" && data.followUp) ||
        (kind === "application" && data.followUp)
      ) {
        const fireAt = localInstant(
          String(data.followUp) + "T09:00",
          store.settings.timezone,
        );
        await store.service().save("reminder", {
          title: String(data.title),
          fireAt,
          contactId: kind === "contact" ? saved.id : undefined,
          sound: store.settings.sound,
        });
      }
      await store.refresh();
      store.notify(tr.saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${record ? tr.edit : tr.new} · ${label(kind === "task" ? "tasks" : kind === "project" ? "projects" : kind === "habit" ? "habits" : kind === "note" ? "ideas" : kind === "contact" ? "contacts" : kind === "application" ? "applications" : kind === "shortcut" ? "chatgpt" : kind)}`}
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)} className="record-form">
        <div className="form-grid">
          {(fields[kind] ?? []).map((f) => {
            const id = `field-${f.key}`,
              value = form[f.key];
            const choices = [
              "project",
              "task",
              "habit",
              "contact",
              "milestone",
            ].includes(f.type ?? "")
              ? entities(store.records, f.type as Kind)
              : undefined;
            return (
              <label
                key={f.key}
                htmlFor={id}
                className={`${f.type === "textarea" || f.key === "title" ? "span-2" : ""} ${f.type === "checkbox" ? "checkbox-label" : ""}`}
              >
                <span>
                  {label(f.key)}
                  {f.required ? " *" : ""}
                </span>
                {choices ? (
                  <select
                    aria-label={label(f.key)}
                    id={id}
                    required={f.required}
                    value={String(value ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {choices.map((r) => (
                      <option key={r.id} value={r.id}>
                        {String("title" in r.data ? r.data.title : r.id)}
                      </option>
                    ))}
                  </select>
                ) : f.options ? (
                  <select
                    aria-label={label(f.key)}
                    id={id}
                    value={String(value ?? f.options[0])}
                    onChange={(e) => update(f.key, e.target.value)}
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o ? label(o) : "—"}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={id}
                    rows={3}
                    value={String(value ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    id={id}
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => update(f.key, e.target.checked)}
                  />
                ) : (
                  <input
                    id={id}
                    autoFocus={f.key === "title"}
                    required={f.required}
                    type={f.type ?? "text"}
                    value={String(value ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        {kind === "task" && (
          <div className="recurrence-fields">
            <label htmlFor="recurrence-frequency">
              {tr.recurrence}
              <select
                aria-label={tr.recurrence}
                id="recurrence-frequency"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              >
                <option value="">{tr.noRepeat}</option>
                {["daily", "weekly", "monthly", "interval"].map((v) => (
                  <option value={v} key={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
            {repeat && (
              <>
                <p className="muted">{tr.recurrenceHint}</p>
                <div className="form-grid">
                  <label>
                    {tr.repeatInterval}
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={interval}
                      onChange={(e) => setIntervalValue(e.target.value)}
                    />
                  </label>
                  <label>
                    {tr.until}
                    <input
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                    />
                  </label>
                </div>
                {repeat === "weekly" && (
                  <label>
                    {tr.weekdaysHint}
                    <input
                      value={weekdays}
                      onChange={(e) => setWeekdays(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}
            <label className="checkbox-label">
              <span>{tr.remind}</span>
              <input
                type="checkbox"
                checked={remind}
                onChange={(e) => setRemind(e.target.checked)}
              />
            </label>
            {remind && (
              <label>
                {tr.reminderOffsetMinutes}
                <input
                  type="number"
                  min={0}
                  max={10080}
                  value={String(form.reminderOffsetMinutes ?? 0)}
                  onChange={(e) =>
                    update("reminderOffsetMinutes", Number(e.target.value))
                  }
                />
              </label>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {tr.cancel}
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "…" : tr.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TimeIcon() {
  return <Clock3 size={16} />;
}
export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="icon-button" aria-label={tr.edit} onClick={onClick}>
      <Pencil size={15} />
    </button>
  );
}
