/**
 * The body contract the table and its virtualization share: what either
 * body — the table's own or the one a virtualization descriptor carries —
 * renders from, and what the descriptor carries between the table and the
 * entry point that writes it. Component-free, so the entry point loads
 * nothing of the table, and the body it writes renders rows it never knows:
 * the table hands either body the entries and the one function that renders
 * an entry as its row.
 */

import type { ReadonlyChannel, RowModel } from "@canonical/dataviews-core";
import type { DisplayEntry } from "@canonical/dataviews-core/bindings";
import type { ReactElement, ReactNode } from "react";
import type { VIRTUALIZED } from "./constants.js";

/**
 * How a virtualized body places one entry's row: the ref the row is measured
 * and kept by, and the logical position it reports, so a row not mounted
 * is still counted.
 */
export type EntryPlacement = {
  readonly ref: (node: HTMLDivElement) => () => void;
  readonly position: number;
};

/**
 * Renders one entry as its row. The table supplies it, so a body of either
 * kind renders rows without knowing them and keys each by its entry; a
 * virtualized body adds where it places each.
 */
export type EntryRenderer = (
  entry: DisplayEntry,
  placement?: EntryPlacement,
) => ReactElement;

/** What either body renders from: the entries, and the renderer of one. */
export type BodyProps = {
  /**
   * What the body displays, in order: the status row when there is a
   * status — why there are no rows, or what stands over the rows shown —
   * then the rows, unless the status replaces them.
   */
  readonly entries: readonly DisplayEntry[];
  /** The table's renderer of one entry as its row. */
  readonly renderEntry: EntryRenderer;
};

/**
 * Props of the body a virtualized table renders in place of its own: the
 * table's own body props, the row model whose replaced records may have new
 * heights, the height a row is placed at until it is measured, and the
 * table's published tracks, whose change re-wraps every row.
 */
export type VirtualizedBodyProps = BodyProps & {
  /** The provider's row model, whose replaced records may have new heights. */
  readonly rows: ReadonlyChannel<RowModel<object>>;
  /** The height a row is placed at until it is measured, in pixels. */
  readonly estimatedRowHeight: number;
  /** The table's published tracks, whose change re-wraps every row. */
  readonly tracks: string | undefined;
};

/** The body a virtualized table renders in place of its own. */
export type VirtualizedBody = (props: VirtualizedBodyProps) => ReactNode;

/** What a virtualization descriptor carries: the body, and its row estimate. */
export type Virtualized = {
  readonly body: VirtualizedBody;
  readonly estimatedRowHeight: number;
};

/**
 * A table that mounts only the rows near its viewport. Made by
 * `virtualizeRows`, from `@canonical/dataviews-react/virtualization`: the one
 * entry point that loads the implementation, so a table that never imports
 * it never ships it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataTableVirtualization = {
  /** The implementation, private to the package: nothing to read here. */
  readonly [VIRTUALIZED]: Virtualized;
};
