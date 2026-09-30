import type { _Index, _Item, Item } from "@canonical/ds-types";

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
export default function findAncestorPath<T extends Item = Item>(
  index: _Index<T>,
  item: _Item<T>,
): _Item<T>[] {
  const path: _Item<T>[] = [];
  let current: _Item<T> | undefined = item;
  while (current) {
    path.unshift(current);
    current = current.parentUrl ? index[current.parentUrl] : undefined;
  }
  return path;
}
