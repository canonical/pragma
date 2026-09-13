/**
 * What a windowing descriptor carries between the table and the
 * virtualization entry point: the body a windowed table renders in place
 * of its own, and the estimate its rows are placed at. Component-free, so
 * the entry point that writes a descriptor loads nothing of the table.
 */

import type { ReactNode } from "react";
import type { TableBodyProps } from "../_work_in_progress/DataTable/common/index.js";

/**
 * Props of the body a windowed table renders in place of its own: the
 * table's own body props, the height a row is placed at until it is
 * measured, and the table's published tracks, whose change re-wraps every
 * row.
 */
export type WindowedBodyProps<TRow extends object> = TableBodyProps<TRow> & {
  readonly estimatedRowHeight: number;
  readonly tracks: string | undefined;
};

/** The body a windowed table renders in place of its own. */
export type WindowedBody = <TRow extends object>(
  props: WindowedBodyProps<TRow>,
) => ReactNode;

/** What a windowing descriptor carries: the body, and its row estimate. */
export type Windowed = {
  readonly body: WindowedBody;
  readonly estimatedRowHeight: number;
};
