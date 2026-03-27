/** Tier hierarchy return types. */

import type { URI } from "@canonical/ke";

/** A single entry in the tier hierarchy (e.g., `global`, `apps`, `apps/lxd`). */
export interface TierEntry {
  /** Full RDF URI identifying this tier in the ke store. */
  readonly uri: URI;
  /** Slash-separated tier path (e.g., `"apps/lxd"`). */
  readonly path: string;
  /** Path of the parent tier, if this is not the root. */
  readonly parent?: string;
  /** Nesting depth in the tier hierarchy (0 = root). */
  readonly depth: number;
}
