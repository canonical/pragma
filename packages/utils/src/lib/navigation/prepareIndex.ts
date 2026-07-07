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
  // Drain the stack by popping into the loop condition: `item` narrows to a
  // defined `_Item<T>` inside the loop with no non-null assertion, and the
  // only exit is the empty-stack `undefined` — no unreachable guard branch.
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
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
