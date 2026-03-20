/**
 * Formatter input types for component commands.
 *
 * Composite types that bundle the data with display options,
 * so formatters conform to the `Formatters<T>` contract.
 */

import type { ComponentDetailed } from "../../shared/types.js";
import type { AspectFlags } from "../types.js";

export interface ComponentGetInput {
  readonly component: ComponentDetailed;
  readonly detailed: boolean;
  readonly aspects: AspectFlags;
}
