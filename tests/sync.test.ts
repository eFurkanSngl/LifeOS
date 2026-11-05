import { PGlite } from "@electric-sql/pglite";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { CloudAdapter } from "../packages/integrations/src/index";
import { BrowserRepository, LifeService } from "../packages/database/src/index";
import "fake-indexeddb/auto";
let db: PGlite, adapter: CloudAdapter, service: LifeService;
const ownerId = "11111111-1111-4111-8111-111111111111";
let loseResponse = false,
  editInFlight: (() => Promise<void>) | undefined;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    `create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${ownerId}');create function auth.uid() returns uuid language sql stable as $$select '${ownerId}'::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;`,
  );
  await db.exec(
    readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
  await db.exec("set role authenticated");
  const binding = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => binding.get(k) ?? null,
    setItem: (k: string, v: string) => binding.set(k, v),
    removeItem: (k: string) => binding.delete(k),
  });
  loseResponse = false;
  editInFlight = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      if (url.pathname.endsWith("/rpc/lifeos_push")) {
        const p = JSON.parse(String(init?.body));
        const result = await db.query<{ lifeos_push: unknown }>(
          "select public.lifeos_push($1,$2,$3::jsonb,$4,$5)",
          [
            p.p_id,
            p.p_kind,
            JSON.stringify(p.p_data),
            p.p_deleted,
            p.p_expected,
          ],
        );
        if (editInFlight) {
          const edit = editInFlight;
          editInFlight = undefined;
          await edit();
        }
        if (loseResponse) {
          loseResponse = false;
          throw new TypeError("Network response lost");
        }
        return new Response(JSON.stringify(result.rows[0].lifeos_push), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.pathname.endsWith("/lifeos_records")) {
        const rows = (
          await db.query("select * from public.lifeos_records order by id")
        ).rows;
        const offset = Number(url.searchParams.get("offset") ?? 0),
          limit = Number(url.searchParams.get("limit") ?? 500);
        return new Response(
          JSON.stringify(rows.slice(offset, offset + limit)),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("Unexpected external request: " + url.pathname);
    }),
  );
  service = new LifeService(
    new BrowserRepository("sync-" + crypto.randomUUID()),
  );
  adapter = new CloudAdapter(
    "https://lifeos-test.supabase.co",
    "test-publishable-key",
  );
  vi.spyOn(adapter, "user").mockResolvedValue({
    id: ownerId,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-11-05T00:00:00.000Z",
  });
}, 30000);
afterEach(async () => {
  adapter?.client.auth.stopAutoRefresh();
  await db.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("synchronizes durable offline mutations through the real Supabase JS request path", async () => {
  const task = await service.save("task", { title: "Offline" });
  expect((await adapter.sync(service.repo)).conflicts).toHaveLength(0);
  expect((await service.list()).find((r) => r.id === task.id)).toMatchObject({
    dirty: false,
    cloudVersion: 1,
  });
  expect(
    (await db.query("select * from public.lifeos_records")).rows,
  ).toHaveLength(1);
});
it("preserves both versions of a real remote conflict", async () => {
  const task = await service.save("task", { title: "Original" });
  await adapter.sync(service.repo);
  await db.query("select public.lifeos_push($1,$2,$3::jsonb,false,1)", [
    task.id,
    "task",
    JSON.stringify({ ...task.data, title: "Remote edit" }),
  ]);
  const local = (await service.list())[0];
  await service.save(
    "task",
    { ...local.data, title: "Local edit" },
    task.id,
    local.version,
  );
  const result = await adapter.sync(service.repo);
  expect(result.conflicts).toHaveLength(1);
  expect(result.conflicts[0].local.data.title).toBe("Local edit");
  expect(result.conflicts[0].remote.data.title).toBe("Remote edit");
  expect((await service.list())[0].dirty).toBe(true);
});
it("retries a lost acknowledgement without duplicating or incrementing the cloud record", async () => {
  await service.save("task", { title: "Exactly one record" });
  loseResponse = true;
  await expect(adapter.sync(service.repo)).rejects.toThrow();
  expect((await service.list())[0].dirty).toBe(true);
  await adapter.sync(service.repo);
  expect(
    (
      await db.query<{ version: number }>(
        "select version from public.lifeos_records",
      )
    ).rows,
  ).toEqual([{ version: 1 }]);
  expect((await service.list())[0].dirty).toBe(false);
});
it("preserves an edit made while a successful push is in flight", async () => {
  const task = await service.save("task", { title: "Original" });
  editInFlight = async () => {
    await service.save(
      "task",
      { title: "Edited during request" },
      task.id,
      task.version,
    );
  };
  await adapter.sync(service.repo);
  expect((await service.list())[0]).toMatchObject({
    data: { title: "Edited during request" },
    dirty: true,
    cloudVersion: 1,
  });
  await adapter.sync(service.repo);
  expect((await service.list())[0]).toMatchObject({
    data: { title: "Edited during request" },
    dirty: false,
    cloudVersion: 2,
  });
});
