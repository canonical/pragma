import type { _Item } from "@canonical/ds-types";

/**
 * Find the last non-disabled child of a navigation item.
 *
 * @param item - The parent item to search
 * @returns The last enabled child, or undefined if none exist
 */
export default function getLastEnabledChild(item: _Item): _Item | undefined {
  if (!item.items) return undefined;
  for (let i = item.items.length - 1; i >= 0; i--) {
    if (!item.items[i].disabled) return item.items[i];
  }
  return undefined;
}
