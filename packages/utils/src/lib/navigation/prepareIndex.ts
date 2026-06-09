import type { _Index, _Item, Item } from "@canonical/ds-types";
import { getItemId } from "./getItemId.js";

/**
 * Create an index for O(1) lookup of navigation items by URL or key
 *
 * @param root - The annotated root item
 * @returns Index mapping URL/key to item
 */
export function prepareIndex<T extends Item = Item>(root: _Item<T>): _Index<T> {
  const index: _Index<T> = {};
  const stack: _Item<T>[] = [root];
  while (stack.length > 0) {
    const item = stack.pop()!;
    const id = getItemId(item);
    index[id] = item;
    if (item.items) {
      for (let i = item.items.length - 1; i >= 0; i--) {
        stack.push(item.items[i]);
      }
    }
  }
  return index;
}
