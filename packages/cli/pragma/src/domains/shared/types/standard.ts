/**
 * Standard cross-reference type.
 *
 * The hand-written standard domain's return types (StandardSummary,
 * StandardDetailed, CodeBlock, …) were deleted with the domain — the
 * `standard` noun is served by the bundled story pack, whose rows and
 * entities are generic string records. Only {@link StandardRef} remains:
 * block lookups still cross-reference standards by name/URI/category.
 */

import type { URI } from "@canonical/ke";

/** Lightweight reference to a standard, used in block cross-references. */
export interface StandardRef {
  /** Human-readable standard name. */
  readonly name: string;
  /** Full RDF URI of the referenced standard. */
  readonly uri: URI;
  /** Category the referenced standard belongs to. */
  readonly category: string;
}
