import type { _Item, Item } from "@canonical/ds-types";

/**
 * Get the unique identifier for a navigation item (url or key)
 *
 * @param item - The navigation item
 * @returns The item's url or key
 * @throws Error if item has neither url nor key
 */
export function getItemId(item: Item | _Item): string {
  if (item.url) return item.url;
  if (item.key) return item.key;
  throw new Error("Item must have either url or key");
}
