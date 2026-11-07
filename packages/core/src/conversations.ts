import { codexImportSchema } from "@lifeos/validation";

// The cloud envelope has a 240-character display title for every titled kind.
// Retain unusually long source titles in existing notes rather than losing them.
export function makeCodexReference(
  title: string,
  reference: string,
  notes = "",
) {
  return codexImportSchema.parse({ title, reference, notes });
}
