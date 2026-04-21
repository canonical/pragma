/* @canonical/generator-ds 0.10.0-experimental.5 */

import { SortButton } from "./common/index.js";
import { default as THRoot } from "./TH.svelte";

const TH = THRoot as typeof THRoot & {
  /**
   * A button that toggles the sort direction of the column.
   */
  SortButton: typeof SortButton;
};

TH.SortButton = SortButton;

export * from "./types.js";
export { TH };
