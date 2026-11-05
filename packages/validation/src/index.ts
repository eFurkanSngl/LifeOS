import { z } from "zod";

export const kinds = [
  "task",
  "project",
  "habit",
  "habitLog",
  "note",
  "contact",
  "application",
  "shortcut",
  "codex",
  "focus",
  "review",
  "settings",
  "reminder",
  "milestone",
  "interaction",
] as const;
export const kindSchema = z.enum(kinds);
export type Kind = z.infer<typeof kindSchema>;
export const timezoneSchema = z.string().refine((v) => {
  try {
    new Intl.DateTimeFormat("tr", { timeZone: v });
    return true;
  } catch {
    return false;
  }
}, "Geçerli bir IANA saat dilimi girin.");
export const instant = z.string().datetime();
export const offsetInstant = z.string().datetime({ offset: true });
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Geçersiz tarih",
  );
export const safeUrl = z
  .string()
  .url()
  .max(2000)
  .refine((v) => {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "HTTPS bağlantısı girin.");
const title = z.string().trim().min(1, "Başlık gerekli.").max(240);
const text = z.string().max(20000).default("");
const optionalId = z.string().uuid().optional();
export const recurrenceSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly", "interval"]),
    interval: z.number().int().min(1).max(365).default(1),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    until: dateOnly.optional(),
    timezone: timezoneSchema.default("Europe/Istanbul"),
  })
  .strict();
export const taskSchema = z
  .object({
    title,
    description: text,
    category: z.string().max(80).default("Kişisel"),
    projectId: optionalId,
    priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
    status: z
      .enum([
        "inbox",
        "planned",
        "in_progress",
        "completed",
        "skipped",
        "cancelled",
      ])
      .default("inbox"),
    dueDate: dateOnly.optional(),
    scheduledAt: instant.optional(),
    duration: z.number().int().min(1).max(1440).default(30),
    completedAt: instant.optional(),
    recurrence: recurrenceSchema.optional(),
    reminderOffsetMinutes: z.number().int().min(0).max(10080).optional(),
    seriesId: optionalId,
    occurrenceDate: dateOnly.optional(),
    tags: z.array(z.string().max(40)).max(30).default([]),
    notes: text,
    type: z
      .enum(["feature", "bug", "improvement", "research", "maintenance"])
      .default("feature"),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    milestoneId: optionalId,
    archived: z.boolean().default(false),
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
// Zod 4 applies inner defaults even through optional wrappers. Sparse patches
// must remove those defaults so a title edit cannot reset status or priority.
const taskPatchShape: Record<string, z.ZodType> = {};
for (const [key, schema] of Object.entries(taskSchema.shape)) {
  taskPatchShape[key] = (
    schema instanceof z.ZodDefault ? schema.removeDefault() : schema
  ).optional();
}
export const taskPatchSchema = z.object(taskPatchShape).strict();
export const projectSchema = z
  .object({
    title,
    description: text,
    type: z.string().max(80).default("Yazılım"),
    status: z.enum(["active", "paused", "completed"]).default("active"),
    startDate: dateOnly.optional(),
    targetDate: dateOnly.optional(),
    priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
    notes: text,
  })
  .strict();
export const habitSchema = z
  .object({
    title,
    category: z.string().max(80).default("Kişisel"),
    frequency: z.enum(["daily", "weekdays", "weekly"]).default("daily"),
    target: z.number().int().min(1).max(1440).default(1),
    unit: z.string().max(30).default("kez"),
    preferredTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    notes: text,
  })
  .strict();
export const habitLogSchema = z
  .object({
    habitId: z.string().uuid(),
    date: dateOnly,
    count: z.number().int().min(0).max(10000),
  })
  .strict();
export const noteSchema = z
  .object({
    title,
    body: text,
    category: z.string().max(80).default("Fikir"),
    tags: z.array(z.string().max(40)).max(30).default([]),
    pinned: z.boolean().default(false),
    archived: z.boolean().default(false),
  })
  .strict();
export const contactSchema = z
  .object({
    title,
    company: text,
    position: text,
    url: safeUrl.optional(),
    category: z.string().max(80).default("LinkedIn"),
    status: z.string().max(80).default("Yeni"),
    lastInteraction: dateOnly.optional(),
    followUp: dateOnly.optional(),
    notes: text,
  })
  .strict();
export const applicationSchema = z
  .object({
    title,
    company: title,
    url: safeUrl.optional(),
    date: dateOnly.optional(),
    status: z
      .enum([
        "interested",
        "applied",
        "contacted",
        "interview",
        "waiting",
        "rejected",
        "offer",
        "closed",
      ])
      .default("interested"),
    followUp: dateOnly.optional(),
    notes: text,
  })
  .strict();
export const shortcutSchema = z
  .object({
    title,
    url: safeUrl.refine(
      (v) => ["chatgpt.com", "chat.openai.com"].includes(new URL(v).hostname),
      "ChatGPT bağlantısı girin.",
    ),
    color: z.enum(["blue", "orange", "green"]).default("blue"),
    icon: z.enum(["chat", "code", "book"]).default("chat"),
    pinned: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
  })
  .strict();
export const codexSchema = z
  .object({
    title,
    reference: z.string().trim().min(1).max(2000),
    url: safeUrl.optional(),
    projectId: optionalId,
    notes: text,
  })
  .strict();
export const focusSchema = z
  .object({
    title,
    taskId: optionalId,
    reminderId: optionalId,
    startedAt: instant,
    duration: z.number().int().min(1).max(180),
    remainingMs: z.number().int().min(0),
    resumedAt: instant.optional(),
    status: z.enum(["running", "paused", "completed", "cancelled"]),
    endedAt: instant.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "running" && !value.resumedAt)
      ctx.addIssue({
        code: "custom",
        path: ["resumedAt"],
        message: "Çalışan oturumun başlangıç zamanı gerekli.",
      });
    if (value.remainingMs > value.duration * 60000)
      ctx.addIssue({
        code: "custom",
        path: ["remainingMs"],
        message: "Kalan süre toplam süreden büyük olamaz.",
      });
  });
export type Focus = z.infer<typeof focusSchema>;
export const reminderSchema = z
  .object({
    title,
    taskId: optionalId,
    habitId: optionalId,
    contactId: optionalId,
    focusId: optionalId,
    fireAt: instant,
    status: z
      .enum(["pending", "delivered", "completed", "cancelled"])
      .default("pending"),
    deliveredAt: instant.optional(),
    sound: z.boolean().default(false),
  })
  .strict();
export const settingsSchema = z
  .object({
    title: z.literal("settings").default("settings"),
    timezone: timezoneSchema.default("Europe/Istanbul"),
    language: z.literal("tr").default("tr"),
    closeToTray: z.boolean().default(false),
    minimizeToTray: z.boolean().default(false),
    sound: z.boolean().default(false),
    quietStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("23:00"),
    quietEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("08:00"),
    quietEnabled: z.boolean().default(false),
    snoozeMinutes: z.number().int().min(1).max(1440).default(15),
    mcpEnabled: z.boolean().default(false),
  })
  .strict();
export const schemas = {
  task: taskSchema,
  project: projectSchema,
  habit: habitSchema,
  habitLog: habitLogSchema,
  note: noteSchema,
  contact: contactSchema,
  application: applicationSchema,
  shortcut: shortcutSchema,
  codex: codexSchema,
  focus: focusSchema,
  review: z.object({ title, date: dateOnly, body: text }).strict(),
  settings: settingsSchema,
  reminder: reminderSchema,
  milestone: z
    .object({
      title,
      projectId: z.string().uuid(),
      targetDate: dateOnly.optional(),
      completed: z.boolean().default(false),
    })
    .strict(),
  interaction: z
    .object({ title, contactId: z.string().uuid(), date: dateOnly, body: text })
    .strict(),
};
export type Data = { [K in Kind]: z.infer<(typeof schemas)[K]> }[Kind];
export const recordSchema = z
  .object({
    id: z.string().uuid(),
    kind: kindSchema,
    data: z.record(z.string(), z.unknown()),
    version: z.number().int().min(1),
    updatedAt: instant,
    deleted: z.boolean().default(false),
    cloudVersion: z.number().int().min(0).default(0),
    dirty: z.boolean().default(true),
  })
  .strict()
  .superRefine((v, ctx) => {
    const r = schemas[v.kind].safeParse(v.data);
    if (!r.success)
      ctx.addIssue({
        code: "custom",
        message: r.error.issues.map((x) => x.message).join(" "),
        path: ["data"],
      });
  })
  .transform((value) => ({
    ...value,
    data: validateData(value.kind, value.data),
  }));
export type Entity = z.infer<typeof recordSchema>;
export type TypedEntity<K extends Kind> = Omit<Entity, "data" | "kind"> & {
  kind: K;
  data: z.infer<(typeof schemas)[K]>;
};
export const backupSchema = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: instant,
    records: z.array(recordSchema).max(100000),
  })
  .strict();
export function validateData(
  kind: Kind,
  data: unknown,
): Record<string, unknown> {
  return schemas[kind].parse(data);
}
