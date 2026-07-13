import type { HTMLAttributes, ReactNode } from "react";
import type { EntityKind, RelationKind } from "../../graph/types.js";

export interface GraphLegendProps extends HTMLAttributes<HTMLDivElement> {
  /** Entity kinds to explain, in order. Defaults to all four. */
  entityKinds?: EntityKind[];
  /** Relation kinds to explain, in order. Defaults to all four. */
  relationKinds?: RelationKind[];
  /** Heading rendered above the key; pass `null` to omit it. */
  heading?: ReactNode;
}
