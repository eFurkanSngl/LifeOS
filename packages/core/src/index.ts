import { addDays, addMonths, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  type Entity,
  type Task,
  type Focus,
  type TypedEntity,
  type Kind,
} from "@lifeos/validation";
export * from "@lifeos/validation";
export const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";
export function taskReminderId(taskId: string) {
  return (parseInt(taskId[0], 16) ^ 8).toString(16) + taskId.slice(1);
}
export const today = (timezone = "Europe/Istanbul", now = new Date()) =>
  format(toZonedTime(now, timezone), "yyyy-MM-dd");
export const formatTime = (value: string, timezone = "Europe/Istanbul") =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export function localInstant(value: string, timezone: string) {
  const instant = fromZonedTime(value, timezone);
  const target = (value.length === 16 ? value + ":00" : value).slice(0, 19);
  const matches = (date: Date) =>
    format(toZonedTime(date, timezone), "yyyy-MM-dd'T'HH:mm:ss") === target;
  if (!matches(instant))
    throw new Error(
      "Bu yerel saat yaz saati geçişi nedeniyle mevcut değil. Başka bir saat seçin.",
    );
  // Repeated wall times use the first instant, including half-hour DST transitions.
  for (let minutes = 180; minutes >= 15; minutes -= 15) {
    const earlier = new Date(instant.getTime() - minutes * 60000);
    if (matches(earlier)) return earlier.toISOString();
  }
  return instant.toISOString();
}
export function localInput(value: string, timezone: string) {
  return format(toZonedTime(value, timezone), "yyyy-MM-dd'T'HH:mm");
}
export function entities<K extends Kind>(
  records: Entity[],
  kind: K,
): TypedEntity<K>[] {
  return records.filter(
    (r) => r.kind === kind && !r.deleted,
  ) as TypedEntity<K>[];
}
export function remaining(focus: Focus, now = Date.now()) {
  return Math.max(
    0,
    focus.remainingMs -
      (focus.status === "running" && focus.resumedAt
        ? Math.max(0, now - Date.parse(focus.resumedAt))
        : 0),
  );
}
export function streak(dates: string[], day: string) {
  const set = new Set(dates);
  let d = new Date(day + "T12:00:00");
  if (!set.has(day)) d = addDays(d, -1);
  let count = 0;
  while (set.has(format(d, "yyyy-MM-dd"))) {
    count++;
    d = addDays(d, -1);
  }
  return count;
}
export function overlaps(a: Task, b: Task) {
  if (!a.scheduledAt || !b.scheduledAt) return false;
  const x = Date.parse(a.scheduledAt),
    y = Date.parse(b.scheduledAt);
  return x < y + b.duration * 60000 && y < x + a.duration * 60000;
}
// Bounded calendar expansion; each occurrence has its own deterministic UUID and state.
export function occurrenceId(seriesId: string, date: string) {
  const hex = date.replaceAll("-", "");
  return `${seriesId.slice(0, 24)}${hex}0000`;
}
export function expandRecurrence(
  entity: TypedEntity<"task">,
  from: string,
  days = 35,
): { id: string; data: Task }[] {
  const t = entity.data,
    r = t.recurrence;
  if (!r || !t.scheduledAt || t.seriesId) return [];
  const anchor = toZonedTime(t.scheduledAt, r.timezone),
    anchorDay = format(anchor, "yyyy-MM-dd"),
    time = format(anchor, "HH:mm:ss");
  const start = new Date(from + "T12:00:00");
  const result: { id: string; data: Task }[] = [];
  for (let n = 0; n < Math.min(days, 93); n++) {
    const d = addDays(start, n),
      date = format(d, "yyyy-MM-dd");
    if (date < anchorDay || (r.until && date > r.until)) continue;
    const diff = Math.round(
      (Date.parse(date + "T12:00Z") - Date.parse(anchorDay + "T12:00Z")) /
        86400000,
    );
    const monthDiff =
      (d.getFullYear() - anchor.getFullYear()) * 12 +
      d.getMonth() -
      anchor.getMonth();
    const weekdays = r.weekdays.length ? r.weekdays : [anchor.getDay()];
    const matches =
      r.frequency === "daily" || r.frequency === "interval"
        ? diff % r.interval === 0
        : r.frequency === "weekly"
          ? Math.floor(diff / 7) % r.interval === 0 &&
            weekdays.includes(d.getDay())
          : monthDiff % r.interval === 0 &&
            d.getDate() === addMonths(anchor, monthDiff).getDate();
    if (matches) {
      let scheduledAt: string;
      try {
        scheduledAt = localInstant(date + "T" + time, r.timezone);
      } catch {
        continue;
      }
      const { recurrence: _r, completedAt: _c, ...base } = t;
      void _r;
      void _c;
      result.push({
        id: occurrenceId(entity.id, date),
        data: {
          ...base,
          status: "planned",
          seriesId: entity.id,
          occurrenceDate: date,
          scheduledAt,
        },
      });
    }
  }
  return result;
}
export function conflict(local: Entity, remote: Entity) {
  return local.dirty && local.cloudVersion !== remote.cloudVersion;
}
export function retryDelay(attempt: number) {
  return Math.min(300000, 1000 * 2 ** Math.min(attempt, 9));
}
export function isQuiet(
  now: Date,
  timezone: string,
  start: string,
  end: string,
) {
  const time = format(toZonedTime(now, timezone), "HH:mm");
  return start === end
    ? false
    : start < end
      ? time >= start && time < end
      : time >= start || time < end;
}
export function dueReminders(records: Entity[], now = new Date()) {
  return entities(records, "reminder").filter(
    (r) =>
      r.data.status === "pending" && Date.parse(r.data.fireAt) <= now.getTime(),
  );
}
