import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LifeService } from "@lifeos/database";
import { SqliteRepository } from "../../../packages/database/src/node";
import {
  taskSchema,
  taskPatchSchema,
  reminderSchema,
  noteSchema,
  entities,
  today,
  SETTINGS_ID,
} from "@lifeos/core";
export function createServer(repo: SqliteRepository) {
  const server = new McpServer({ name: "lifeos", version: "0.1.0" }),
    service = new LifeService(repo);
  const register = <S extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: z.ZodObject<S>,
    handler: (input: z.infer<z.ZodObject<S>>) => Promise<unknown>,
  ) => {
    const inputSchema: z.ZodRawShape = schema.shape;
    server.registerTool(name, { description, inputSchema }, async (args) => {
      try {
        const records = await repo.list();
        if (
          records.find((r) => r.id === SETTINGS_ID && !r.deleted)?.data
            .mcpEnabled !== true
        )
          throw new Error(
            "LifeOS MCP is disabled. Enable it in desktop settings.",
          );
        const parsed = schema.strict().parse(args);
        const result = await handler(parsed);
        repo.audit(
          name,
          typeof result === "object" && result && "id" in result
            ? String(result.id)
            : undefined,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                e instanceof z.ZodError
                  ? "Invalid tool arguments"
                  : e instanceof Error
                    ? e.message
                    : "Action failed",
            },
          ],
        };
      }
    });
  };
  const listInput = z
    .object({
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    })
    .strict();
  register(
    "lifeos_list_tasks",
    "List local tasks. Recurrence templates and independent occurrences are distinguished by recurrence/seriesId.",
    listInput,
    async (input) =>
      entities(await service.list(), "task")
        .filter(
          (t) =>
            !input.query ||
            t.data.title
              .toLocaleLowerCase()
              .includes(input.query.toLocaleLowerCase()),
        )
        .slice(0, input.limit),
  );
  const idInput = z.object({ id: z.string().uuid() }).strict();
  register("lifeos_get_task", "Get one task.", idInput, async ({ id }) => {
    const record = entities(await service.list(), "task").find(
      (r) => r.id === id,
    );
    if (!record) throw new Error("Task not found");
    return record;
  });
  register(
    "lifeos_create_task",
    "Create a task. For scheduling use explicit UTC instants, never assume a natural language date.",
    z.object({ task: taskSchema }).strict(),
    async ({ task }) => service.save("task", task),
  );
  register(
    "lifeos_update_task",
    "Update task fields using the version returned by get_task. Status changes may be reversed.",
    z
      .object({
        id: z.string().uuid(),
        expectedVersion: z.number().int().min(1),
        changes: taskPatchSchema,
      })
      .strict(),
    async ({ id, expectedVersion, changes }) => {
      const old = entities(await service.list(), "task").find(
        (r) => r.id === id,
      );
      if (!old) throw new Error("Task not found");
      return service.save(
        "task",
        { ...old.data, ...changes },
        id,
        expectedVersion,
      );
    },
  );
  register(
    "lifeos_complete_task",
    "Complete one occurrence, never a whole recurring template.",
    z
      .object({
        id: z.string().uuid(),
        expectedVersion: z.number().int().min(1),
      })
      .strict(),
    async ({ id, expectedVersion }) => {
      const old = entities(await service.list(), "task").find(
        (r) => r.id === id,
      );
      if (!old) throw new Error("Task not found");
      if (old.data.recurrence)
        throw new Error(
          "Complete an occurrence instead of a recurrence template",
        );
      return service.save(
        "task",
        {
          ...old.data,
          status: "completed",
          completedAt: new Date().toISOString(),
        },
        id,
        expectedVersion,
      );
    },
  );
  register("lifeos_list_projects", "List projects.", listInput, async (input) =>
    entities(await service.list(), "project")
      .filter(
        (p) =>
          !input.query ||
          p.data.title
            .toLocaleLowerCase()
            .includes(input.query.toLocaleLowerCase()),
      )
      .slice(0, input.limit),
  );
  register(
    "lifeos_get_project",
    "Get a project, its milestones and tasks.",
    idInput,
    async ({ id }) => {
      const records = await service.list(),
        project = entities(records, "project").find((p) => p.id === id);
      if (!project) throw new Error("Project not found");
      return {
        project,
        tasks: entities(records, "task")
          .filter((t) => t.data.projectId === id)
          .slice(0, 200),
        milestones: entities(records, "milestone").filter(
          (m) => m.data.projectId === id,
        ),
      };
    },
  );
  register(
    "lifeos_create_reminder",
    "Create one persistent native reminder. Delivery needs the LifeOS desktop process.",
    z.object({ reminder: reminderSchema }).strict(),
    async ({ reminder }) => service.save("reminder", reminder),
  );
  register(
    "lifeos_list_reminders",
    "List reminders.",
    listInput,
    async (input) =>
      entities(await service.list(), "reminder")
        .filter(
          (r) =>
            !input.query ||
            r.data.title
              .toLocaleLowerCase()
              .includes(input.query.toLocaleLowerCase()),
        )
        .slice(0, input.limit),
  );
  register(
    "lifeos_add_note",
    "Capture a local note.",
    z.object({ note: noteSchema }).strict(),
    async ({ note }) => service.save("note", note),
  );
  register("lifeos_list_notes", "List local notes.", listInput, async (input) =>
    entities(await service.list(), "note")
      .filter(
        (n) =>
          !input.query ||
          n.data.title
            .toLocaleLowerCase()
            .includes(input.query.toLocaleLowerCase()),
      )
      .slice(0, input.limit),
  );
  register(
    "lifeos_get_today_schedule",
    "Get today in the configured IANA timezone.",
    z.object({}).strict(),
    async () => {
      const records = await service.list(),
        zone = String(
          records.find((r) => r.id === SETTINGS_ID && !r.deleted)?.data
            .timezone ?? "Europe/Istanbul",
        ),
        day = today(zone);
      return {
        day,
        timezone: zone,
        tasks: entities(records, "task")
          .filter(
            (t) =>
              !t.data.recurrence &&
              t.data.scheduledAt &&
              today(zone, new Date(t.data.scheduledAt)) === day,
          )
          .sort((a, b) =>
            a.data.scheduledAt!.localeCompare(b.data.scheduledAt!),
          )
          .slice(0, 200),
      };
    },
  );
  return server;
}
