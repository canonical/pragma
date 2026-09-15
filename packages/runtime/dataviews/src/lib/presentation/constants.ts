/**
 * The presentation domain's constants: the empty arrangement, how long
 * changes gather before they are written, and the keys the table's
 * arrangement is kept under.
 */

import type { ViewPresentation } from "./types.js";

/** An arrangement holding nothing: what a target reads as before any change. */
export const NO_PRESENTATION: ViewPresentation = Object.freeze({});

/**
 * How long presentation changes gather before they are written: a burst —
 * a column resized by key, one step per press — is written once, the
 * timer starting again with every change.
 */
export const WRITE_DELAY = 200;

/**
 * The longest a change waits to be written while changes keep coming: a
 * key held down writes once a second rather than never.
 */
export const WRITE_DEADLINE = 1000;

/**
 * The prefix a column's width is kept under, followed by the column id.
 * Named for the renderer, so another renderer's arrangement never reads a
 * table's widths as its own.
 */
export const WIDTH_KEY_PREFIX = "table.width.";

/** The key the table's column order is kept under: a list of column ids. */
export const ORDER_KEY = "table.order";

/** The key the table's hidden columns are kept under: a list of column ids. */
export const HIDDEN_KEY = "table.hidden";
