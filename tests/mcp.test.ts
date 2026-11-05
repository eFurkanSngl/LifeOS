import { it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../services/mcp-server/src/tools";
import { SqliteRepository } from "../packages/database/src/node";
import { LifeService } from "../packages/database/src/index";
import { SETTINGS_ID } from "../packages/core/src/index";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
it("exposes twelve allowlisted tools, enforces opt-in, validates and persists actual tool calls", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-")),
    repo = new SqliteRepository(join(dir, "test.sqlite"), true),
    server = createServer(repo),
    client = new Client({ name: "test", version: "1.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(a);
    await client.connect(b);
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(12);
    expect(tools.tools.some((t) => /delete|sql|shell/.test(t.name))).toBe(
      false,
    );
    const denied = await client.callTool({
      name: "lifeos_create_task",
      arguments: { task: { title: "Denied" } },
    });
    expect(denied.isError).toBe(true);
    expect(await repo.list()).toHaveLength(0);
    await new LifeService(repo).save(
      "settings",
      { mcpEnabled: true },
      SETTINGS_ID,
    );
    const created = await client.callTool({
      name: "lifeos_create_task",
      arguments: { task: { title: "CancellationToken" } },
    });
    expect(created.isError).not.toBe(true);
    expect((await repo.list()).find((r) => r.kind === "task")?.data.title).toBe(
      "CancellationToken",
    );
    const task = (await repo.list()).find((r) => r.kind === "task")!;
    await client.callTool({
      name: "lifeos_update_task",
      arguments: {
        id: task.id,
        expectedVersion: task.version,
        changes: { status: "in_progress", priority: "high" },
      },
    });
    const active = (await repo.list()).find((r) => r.id === task.id)!;
    const update = await client.callTool({
      name: "lifeos_update_task",
      arguments: {
        id: task.id,
        expectedVersion: active.version,
        changes: { title: "Renamed only" },
      },
    });
    expect(update.isError).not.toBe(true);
    expect(
      (await repo.list()).find((r) => r.id === task.id)?.data,
    ).toMatchObject({
      title: "Renamed only",
      status: "in_progress",
      priority: "high",
    });
    const invalid = await client.callTool({
      name: "lifeos_create_task",
      arguments: { task: { title: "" } },
    });
    expect(invalid.isError).toBe(true);
    expect(
      repo.db.prepare("SELECT count(*) as n FROM mcp_action_logs").get()?.n,
    ).toBe(3);
  } finally {
    await client.close();
    await server.close();
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
