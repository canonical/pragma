/**
 * Widen a strongly-typed verb to the base {@link VerbSpec} at the registry
 * boundary.
 *
 * A `VerbSpec<P, R>` with a concrete `R` cannot be placed directly in a
 * `CapabilityModule.verbs` array (`VerbSpec<…, unknown>[]`) because `Formatters`
 * is invariant in its data type. Authoring keeps the strong `R` so the
 * formatters in each `*.render.ts` are type-checked against the real payload;
 * this erases only that phantom `R` where the module is composed. The
 * projectors re-narrow through the verb's own formatters at run time.
 */

import type { VerbSpec } from "./types.js";

/**
 * Erase a verb's concrete data type for registry composition.
 *
 * @param verb - A strongly-typed verb spec.
 * @returns The same verb widened to the base `VerbSpec`.
 */
export function asVerb<P, R>(verb: VerbSpec<P, R>): VerbSpec {
  return verb as unknown as VerbSpec;
}
