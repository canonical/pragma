/** Modifier domain return types. */

import type { URI } from "@canonical/ke";

/** A modifier family (e.g., "size", "variant") with its allowed values. */
export interface ModifierFamily {
  /** Full RDF URI identifying this modifier family. */
  readonly uri: URI;
  /** Human-readable family name. */
  readonly name: string;
  /** Allowed values within this family (e.g., `["small", "medium", "large"]`). */
  readonly values: readonly string[];
}

/** Summary view of a modifier family. */
export type ModifierSummary = ModifierFamily;

/** Digest view of a modifier family for generic list contracts. */
export type ModifierDigest = ModifierSummary;

/** Detailed view of a modifier family. */
export type ModifierDetailed = ModifierFamily;
