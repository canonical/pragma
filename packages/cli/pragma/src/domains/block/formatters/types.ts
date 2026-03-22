/**
 * Formatter input types for block commands.
 *
 * Composite types that bundle the data with display options,
 * so formatters conform to the `Formatters<T>` contract.
 */

import type { BlockDetailed } from "../../shared/types.js";
import type { AspectFlags } from "../types.js";

export interface BlockGetInput {
  readonly component: BlockDetailed;
  readonly detailed: boolean;
  readonly aspects: AspectFlags;
}
