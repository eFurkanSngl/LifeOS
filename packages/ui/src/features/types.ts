import type { Kind, Entity } from "@lifeos/core";
export type Edit = (
  kind: Kind,
  record?: Entity,
  initial?: Record<string, unknown>,
) => void;
