import type { ReactNode } from "react";
import type { TableBodyProps } from "./common/index.js";

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

/**
 * The key a windowing descriptor carries its implementation under. The
 * table reads it and the virtualization entry point writes it. Neither the
 * key nor what it holds is exported, so no descriptor is made anywhere
 * else, and the table's own entry point imports this key without ever
 * importing the body.
 */
const windowed: unique symbol = Symbol("windowed");

export default windowed;
