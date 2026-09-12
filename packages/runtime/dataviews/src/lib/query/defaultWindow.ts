import type { ResultWindow } from "./types.js";

/**
 * The window a collection starts on when nothing else says otherwise: the
 * first page of fifty, from the start of the result, with nothing
 * collapsed. One owner, so the coordinator's seed and a parameter set
 * carrying no window cannot drift apart.
 */
const DEFAULT_WINDOW: ResultWindow = Object.freeze({
  page: 1,
  size: 50,
  cursor: null,
  collapsed: Object.freeze([]),
});

export default DEFAULT_WINDOW;
