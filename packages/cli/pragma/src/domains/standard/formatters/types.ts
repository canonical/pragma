/**
 * Formatter input types for standard commands.
 *
 * Composite types that bundle the data with display options,
 * so formatters conform to the `Formatters<T>` contract.
 */

import type { StandardDetailed } from "../../shared/types.js";

export interface StandardGetInput {
  readonly standard: StandardDetailed;
  readonly detailed: boolean;
}
