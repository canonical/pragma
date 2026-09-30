import type { _Item, Item } from "@canonical/ds-types";
import { isInteractive } from "./isInteractive.js";

/**
 * Find the last interactive child of a navigation item.
 *
 * Skips both disabled items and presentational nodes — see {@link isInteractive}.
 *
 * @param item - The parent item to search
 * @returns The last interactive child, or undefined if none exist
 */
export default function getLastInteractiveChild<T extends Item = Item>(
  item: _Item<T>,
): _Item<T> | undefined {
  if (!item.items) return undefined;
  for (let i = item.items.length - 1; i >= 0; i--) {
    const child = item.items[i];
    if (isInteractive(child)) return child;
  }
  return undefined;
}
