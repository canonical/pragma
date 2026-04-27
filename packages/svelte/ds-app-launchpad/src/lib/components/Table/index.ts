import { TH } from "./common/index.js";
import { default as TableRoot } from "./Table.svelte";

const Table = TableRoot as typeof TableRoot & {
  /**
   * A table header cell component meant to be used for sortable columns.
   *
   * @example
   * ```svelte
   * <Table.TH aria-sort="ascending" scope="col">
   *   Sortable Column
   *   {#snippet action()}
   *     <Table.TH.SortButton onclick={handleSortClick} />
   *   {/snippet}
   * </Table.TH>
   * ```
   */
  TH: typeof TH;
};

Table.TH = TH;

export type { THProps as TableTHProps } from "./common/index.js";

export * from "./types.js";
export { Table };
