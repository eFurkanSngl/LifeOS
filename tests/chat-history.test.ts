import { expect, it } from "vitest";
import { codexSchema, backupSchema } from "../packages/validation/src/index";
import { makeCodexReference } from "../packages/core/src/conversations";
it("preserves long imported Codex titles within a bounded size", () => {
  const title = "Original conversation title ".repeat(60);
  const imported = makeCodexReference(
    title,
    "codex resume session-id",
    "Source metadata",
  );
  expect(imported.title.length).toBeLessThanOrEqual(240);
  expect(imported.notes).toContain(title.trim());
  expect(imported.notes).toContain("Source metadata");
  expect(
    codexSchema.safeParse({ title, reference: "session-id" }).success,
  ).toBe(false);
  expect(
    codexSchema.safeParse({ title: "x".repeat(2001), reference: "session-id" })
      .success,
  ).toBe(false);
});
it("restores legacy long-title backups without dropping the original title", () => {
  const title = "Original title ".repeat(80).trim();
  const backup = backupSchema.parse({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records: [
      {
        id: crypto.randomUUID(),
        kind: "codex",
        data: { title, reference: "codex resume session-id" },
        version: 1,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  expect(backup.records[0].data.title).toHaveLength(240);
  expect(backup.records[0].data.notes).toContain(title);
});
