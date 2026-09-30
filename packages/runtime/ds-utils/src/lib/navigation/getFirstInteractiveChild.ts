import type { _Item, Item } from "@canonical/ds-types";
import { isInteractive } from "./isInteractive.js";

/**
 * Find the first interactive child of a navigation item.
 *
 * Skips both disabled items and presentational nodes — see {@link isInteractive}.
 *
 * @param item - The parent item to search
 * @returns The first interactive child, or undefined if none exist
 */
export default function getFirstInteractiveChild<T extends Item = Item>(
  item: _Item<T>,
): _Item<T> | undefined {
  return item.items?.find(isInteractive);
}
