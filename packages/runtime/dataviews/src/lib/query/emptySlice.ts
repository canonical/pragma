import type { Slice } from "./types.js";

/**
 * The query that restricts nothing: no filter, no search, no ordering of
 * its own and no grouping. One owner, so the coordinator's seed, a
 * parameter set carrying no query and a caller building one cannot drift
 * apart, and the twin of `DEFAULT_WINDOW` that completes a `Query`.
 */
const EMPTY_SLICE: Slice = Object.freeze({
  filter: Object.freeze([]),
  search: null,
  sort: Object.freeze([]),
  group: Object.freeze([]),
});

export default EMPTY_SLICE;
