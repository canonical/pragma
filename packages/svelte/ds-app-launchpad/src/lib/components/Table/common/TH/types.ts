/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { Snippet } from "svelte";
import type { HTMLThAttributes } from "svelte/elements";

type BaseProps = HTMLThAttributes;

export interface THProps extends BaseProps {
  /**
   * The sort direction of the column.
   *
   * Provided value will be applied to the `aria-sort` attribute of the header and used to determine the visual state of the `TH.SortButton` if included as an action.
   */
  "aria-sort"?: HTMLThAttributes["aria-sort"];
  /**
   * A button or link to be included in the header cell.
   *
   * Usually <Table.TH.SortButton>.
   */
  action?: Snippet<[]>;
}

export type THContext = {
  sortDirection: HTMLThAttributes["aria-sort"];
};
