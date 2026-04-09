import type { _Index, _Item } from "@canonical/ds-types";

/**
 * Get the parent item from the index by following the parentUrl reference.
 *
 * Returns undefined for root items (parentUrl is null).
 *
 * @param index - Flat lookup table for O(1) item access
 * @param item - The item whose parent to find
 * @returns The parent item, or undefined for root items
 */
export default function getParentItem(
  index: _Index,
  item: _Item,
): _Item | undefined {
  return item.parentUrl ? index[item.parentUrl] : undefined;
}
