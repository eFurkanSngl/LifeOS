import { expect, it } from "vitest";
import { codexSchema } from "../packages/validation/src/index";
it("preserves long imported Codex titles within a bounded size", () => {
  const title = "Original conversation title ".repeat(60);
  expect(
    codexSchema.parse({ title, reference: "codex resume session-id" }).title,
  ).toBe(title.trim());
  expect(
    codexSchema.safeParse({ title: "x".repeat(2001), reference: "session-id" })
      .success,
  ).toBe(false);
});
