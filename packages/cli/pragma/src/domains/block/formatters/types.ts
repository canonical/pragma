/**
 * Formatter input types for block commands.
 *
 * Composite types that bundle the data with display options,
 * so formatters conform to the `Formatters<T>` contract.
 */

import type { BlockDetailed } from "../../shared/types.js";
import type { AspectFlags } from "../types.js";

/** Input payload for the block-lookup formatter, pairing data with display flags. */
export interface BlockLookupInput {
  readonly block: BlockDetailed;
  readonly detailed: boolean;
  readonly aspects: AspectFlags;
}
