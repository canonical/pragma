import type { ResultWindow } from "./types.js";

/**
 * The window a collection starts on when nothing else says otherwise: the
 * first page of fifty. One owner, so the coordinator's seed and a parameter
 * set carrying no window cannot drift apart.
 */
const DEFAULT_RESULT_WINDOW: ResultWindow = Object.freeze({
  page: 1,
  size: 50,
});

export default DEFAULT_RESULT_WINDOW;
