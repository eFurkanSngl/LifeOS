import { useEffect, useState } from "react";
import { Play, Pause, Square, Flame } from "lucide-react";
import { entities, remaining, today } from "@lifeos/core";
import { tr, label } from "../i18n";
import type { LifeStore } from "../store";
export function FocusPanel({
  store,
  compact = false,
}: {
  store: LifeStore;
  compact?: boolean;
}) {
  const sessions = entities(store.records, "focus"),
    active = sessions.find(
      (s) => s.data.status === "running" || s.data.status === "paused",
    ),
    [duration, setDuration] = useState(25),
    [taskId, setTaskId] = useState(""),
    [now, setNow] = useState(Date.now());
  const [presets, setPresets] = useState<number[]>([15, 25, 45, 60, 90]);
  useEffect(() => {
    try {
      const values: unknown = JSON.parse(
        localStorage.getItem("lifeos-focus-presets") ?? "null",
      );
      if (
        Array.isArray(values) &&
        values.length &&
        values.length <= 12 &&
        values.every((n) => Number.isInteger(n) && n >= 1 && n <= 180)
      )
        setPresets(values);
    } catch {
      /* A damaged preference never prevents focus sessions. */
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active?.id]);
  const day = today(store.settings.timezone),
    week = new Date(day + "T12:00Z");
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  const weekStart = week.toISOString().slice(0, 10);
  const total = (since: string) =>
    sessions
      .filter(
        (s) =>
          s.data.endedAt &&
          today(store.settings.timezone, new Date(s.data.endedAt)) >= since,
      )
      .reduce(
        (sum, s) =>
          sum +
          Math.round((s.data.duration * 60000 - s.data.remainingMs) / 60000),
        0,
      );
  const ms = active ? remaining(active.data, now) : duration * 60000,
    minutes = Math.floor(ms / 60000),
    seconds = Math.floor((ms % 60000) / 1000);
  const start = async () => {
    if (active) return;
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) return;
    const task = entities(store.records, "task").find((t) => t.id === taskId);
    await store.save("focus", {
      title: task?.data.title ?? tr.focus,
      taskId: taskId || undefined,
      duration,
      startedAt: new Date().toISOString(),
      resumedAt: new Date().toISOString(),
      remainingMs: duration * 60000,
      status: "running",
    });
  };
  const change = async (action: "pause" | "resume" | "stop") => {
    if (!active) return;
    const left = remaining(active.data);
    await store.save(
      "focus",
      {
        ...active.data,
        status:
          action === "pause"
            ? "paused"
            : action === "resume"
              ? "running"
              : "completed",
        remainingMs: left,
        resumedAt: action === "resume" ? new Date().toISOString() : undefined,
        endedAt: action === "stop" ? new Date().toISOString() : undefined,
      },
      active.id,
      active.version,
    );
  };
  return (
    <div className={`focus-panel ${compact ? "compact" : ""}`}>
      <div className="focus-heading">
        <Flame size={19} />
        <span>{tr.focus}</span>
        <span className="badge orange">
          {active
            ? label(active.data.status === "running" ? "active" : "paused")
            : "Pomodoro"}
        </span>
      </div>
      <h2>{tr.focusTitle}</h2>
      <p className="muted">{active?.data.title ?? tr.focusHint}</p>
      <div className="timer" role="timer" aria-label={tr.remaining}>
        {String(minutes).padStart(2, "0")}
        <span>:</span>
        {String(seconds).padStart(2, "0")}
      </div>
      {!active && (
        <div className="focus-options">
          <label className="sr-only" htmlFor="focus-duration">
            {tr.duration}
          </label>
          <select
            id="focus-duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {presets.map((n) => (
              <option key={n} value={n}>
                {n} dk
              </option>
            ))}
          </select>
          <input
            aria-label={tr.duration}
            type="number"
            min={1}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <select
            aria-label={tr.linkedTask}
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">{tr.linkedTask}</option>
            {entities(store.records, "task")
              .filter(
                (t) => !t.data.recurrence && t.data.status !== "completed",
              )
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.data.title}
                </option>
              ))}
          </select>
          <button
            className="text-button"
            disabled={
              !Number.isInteger(duration) ||
              duration < 1 ||
              duration > 180 ||
              presets.includes(duration) ||
              presets.length >= 12
            }
            onClick={() => {
              const next = [...presets, duration].sort((a, b) => a - b);
              setPresets(next);
              try {
                localStorage.setItem(
                  "lifeos-focus-presets",
                  JSON.stringify(next),
                );
              } catch {
                store.setError(tr.draftStorageError);
              }
            }}
          >
            {tr.presetSave}
          </button>
        </div>
      )}
      <div className="focus-actions">
        {!active ? (
          <button className="button orange-button" onClick={() => void start()}>
            <Play size={16} />
            {tr.start}
          </button>
        ) : (
          <>
            <button
              className="button orange-button"
              onClick={() =>
                void change(
                  active.data.status === "paused" ? "resume" : "pause",
                )
              }
            >
              {active.data.status === "paused" ? (
                <Play size={16} />
              ) : (
                <Pause size={16} />
              )}
              {active.data.status === "paused" ? tr.resume : tr.pause}
            </button>
            <button
              className="icon-button"
              aria-label={tr.stop}
              onClick={() => void change("stop")}
            >
              <Square size={17} />
            </button>
          </>
        )}
      </div>
      {!compact && (
        <div className="focus-history">
          <h3>{tr.focusHistory}</h3>
          <p className="muted">
            {tr.today}: {total(day)} dk · {tr.thisWeek}: {total(weekStart)} dk
          </p>
          {sessions
            .filter((s) => s.data.endedAt)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 20)
            .map((s) => (
              <div className="simple-row" key={s.id}>
                <span>
                  {s.data.title}
                  <small>
                    {new Date(s.data.startedAt).toLocaleDateString("tr-TR", {
                      timeZone: store.settings.timezone,
                    })}
                  </small>
                </span>
                <strong>
                  {Math.round(
                    (s.data.duration * 60000 - s.data.remainingMs) / 60000,
                  )}{" "}
                  dk
                </strong>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
