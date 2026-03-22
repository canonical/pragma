/**
 * Formatter input types for standard commands.
 *
 * Composite types that bundle the data with display options,
 * so formatters conform to the `Formatters<T>` contract.
 */

import type {
  Disclosure,
  StandardDetailed,
  StandardSummary,
} from "../../shared/types.js";

/** Input payload for the standard-lookup formatter, pairing data with a detail flag. */
export interface StandardLookupInput {
  readonly standard: StandardDetailed;
  readonly detailed: boolean;
}

/**
 * Input for the list formatter with progressive disclosure.
 *
 * - summary: items only (name + category + description)
 * - digest: items enriched with first do example
 * - detailed: items enriched with full dos/donts
 */
export interface StandardListOutput {
  readonly items: readonly StandardSummary[];
  readonly details?: readonly (StandardDetailed | null)[];
  readonly disclosure: Disclosure;
}
