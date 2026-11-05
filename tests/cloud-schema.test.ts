import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
let db: PGlite;
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  task = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`,
  );
  await db.exec(
    readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function owner(id: string, anonymous = false) {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({ is_anonymous: anonymous })],
  );
  await db.exec("set role authenticated");
}
async function push(
  id: string,
  data: Record<string, unknown>,
  version = 0,
  kind = "task",
) {
  return (
    await db.query<{
      lifeos_push: {
        ok: boolean;
        record: { version: number; data: Record<string, unknown> };
      };
    }>("select public.lifeos_push($1::uuid,$2,$3::jsonb,false,$4::bigint)", [
      id,
      kind,
      JSON.stringify(data),
      version,
    ])
  ).rows[0].lifeos_push;
}
it("applies the complete schema and idempotent compare-and-swap protocol", async () => {
  await owner(a);
  const first = await push(task, { title: "Study", status: "planned" });
  expect(first).toMatchObject({ ok: true, record: { version: 1 } });
  expect(await push(task, { title: "Study", status: "planned" })).toMatchObject(
    { ok: true, record: { version: 1 } },
  );
  expect(
    await push(task, { title: "Changed", status: "planned" }, 1),
  ).toMatchObject({ ok: true, record: { version: 2 } });
  expect(
    await push(task, { title: "Stale", status: "planned" }, 1),
  ).toMatchObject({ ok: false, record: { version: 2 } });
});
it("isolates reads and prevents identity reassignment across owners", async () => {
  await owner(b);
  expect(
    (await db.query("select * from public.lifeos_records")).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into public.lifeos_records(user_id,id,kind,data) values($1,$2,$3,$4)",
      [a, crypto.randomUUID(), "note", JSON.stringify({ title: "Forbidden" })],
    ),
  ).rejects.toThrow(/row-level security/);
  await owner(a);
  await expect(
    db.query(
      "update public.lifeos_records set user_id=$1,version=version+1 where id=$2",
      [b, task],
    ),
  ).rejects.toThrow();
  expect(
    (await db.query("select * from public.lifeos_records")).rows,
  ).toHaveLength(1);
});
it("denies anonymous authenticated users and the anon role", async () => {
  await owner(a, true);
  expect(
    (await db.query("select * from public.lifeos_records")).rows,
  ).toHaveLength(0);
  await expect(
    push(crypto.randomUUID(), { title: "Denied", status: "inbox" }),
  ).rejects.toThrow(/Authenticated owner/);
  await db.exec("reset role;set role anon");
  await expect(db.query("select * from public.lifeos_records")).rejects.toThrow(
    /permission denied/,
  );
});
it("rejects missing or cross-owner project references", async () => {
  await owner(a);
  const project = crypto.randomUUID();
  await push(project, { title: "Private project" }, 0, "project");
  await owner(b);
  await expect(
    push(crypto.randomUUID(), {
      title: "Wrong owner",
      status: "inbox",
      projectId: project,
    }),
  ).rejects.toThrow(/Missing owner-scoped/);
});
it("retains tombstones and denies physical deletion", async () => {
  await owner(a);
  await db.query("select public.lifeos_push($1,$2,$3::jsonb,true,2)", [
    task,
    "task",
    JSON.stringify({ title: "Changed", status: "planned" }),
  ]);
  expect(
    (
      await db.query<{ deleted: boolean }>(
        "select deleted from public.lifeos_records where id=$1",
        [task],
      )
    ).rows[0].deleted,
  ).toBe(true);
  await expect(
    db.query("delete from public.lifeos_records where id=$1", [task]),
  ).rejects.toThrow(/permission denied/);
});

it("rejects a payload without a required title at the database boundary", async () => {
  await owner(a);
  await expect(push(crypto.randomUUID(), { status: "inbox" })).rejects.toThrow(
    /check constraint/,
  );
});
