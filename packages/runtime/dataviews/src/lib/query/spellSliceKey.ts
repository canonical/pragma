import canonicalizeSlice from "./canonicalizeSlice.js";
import stringifyStable from "./stringifyStable.js";
import type { Slice } from "./types.js";

/**
 * One string identifying a slice by what it asks for: two slices spell the
 * same key exactly when they are the same query — equality operands in any
 * order, an empty search as no search, a repeated sort field collapsed. The
 * one comparison for the coordinator's request identity, a source's cache
 * key and slice equality, so nothing tells two queries apart differently.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function spellSliceKey(slice: Slice): string {
  return stringifyStable(canonicalizeSlice(slice));
}
