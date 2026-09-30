import type { _Item, Item } from "@canonical/ds-types";

/**
 * Get the unique identifier for a navigation item (url or key)
 *
 * Total: `Item` requires one of the two, so there is no third case to handle.
 * `url` takes precedence when both are present.
 *
 * @param item - The navigation item
 * @returns The item's url or key
 */
export function getItemId(item: Item | _Item): string {
  if (item.url !== undefined) return item.url;
  return item.key;
}
