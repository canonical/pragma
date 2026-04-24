import type { _Item } from "@canonical/ds-types";

/**
 * Find the first non-disabled child of a navigation item.
 *
 * @param item - The parent item to search
 * @returns The first enabled child, or undefined if none exist
 */
export default function getFirstEnabledChild(item: _Item): _Item | undefined {
  return item.items?.find((child) => !child.disabled);
}
