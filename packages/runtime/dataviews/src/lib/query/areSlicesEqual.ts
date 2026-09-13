import spellSliceKey from "./spellSliceKey.js";
import type { Slice } from "./types.js";

/**
 * Semantic slice equality: two slices are equal when they spell the same
 * key. Equality operand order does not matter; sort order always does.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function areSlicesEqual(a: Slice, b: Slice): boolean {
  return a === b || spellSliceKey(a) === spellSliceKey(b);
}
