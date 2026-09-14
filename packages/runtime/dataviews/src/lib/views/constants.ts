/**
 * The views domain's constants: the renderer a saved query names, the
 * state a session starts from and the outcome of a command with no view
 * open.
 */

import type { ViewOutcome, ViewsState } from "./types.js";

/** The renderer a saved query names; the table is the only one so far. */
export const RENDERER = "table";

/** The state a session starts from, before anything observes it. */
export const INITIAL_VIEWS_STATE: ViewsState = Object.freeze({
  listing: Object.freeze({ status: "idle" }),
  views: Object.freeze([]),
  unreadable: Object.freeze([]),
  current: null,
  modified: false,
  command: null,
});

/** The outcome of a command that needs an open view when none is. */
export const NO_VIEW_OPEN: ViewOutcome = Object.freeze({ status: "missing" });
