import type { _Index, _Item } from "@canonical/ds-types";

/**
 * Walk parentUrl to build the ancestor path from root to item.
 *
 * Returns an array starting with the root and ending with the given item,
 * following the parentUrl chain in the index.
 *
 * @param index - Flat lookup table for O(1) item access
 * @param item - The item to find the path to
 * @returns Array of items from root to item
 */
export default function findAncestorPath(index: _Index, item: _Item): _Item[] {
  const path: _Item[] = [];
  let current: _Item | undefined = item;
  while (current) {
    path.unshift(current);
    current = current.parentUrl ? index[current.parentUrl] : undefined;
  }
  return path;
}
