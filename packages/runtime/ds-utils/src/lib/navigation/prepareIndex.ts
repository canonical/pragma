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
    // Dev-only: ids are unique by contract (`ItemIdentity`); behaviour
    // (last-write-wins) is unchanged.
    const previous = index[id];
    if (process.env.NODE_ENV !== "production" && previous !== undefined) {
      console.warn(
        `prepareIndex: duplicate item id "${id}" — "${previous.label ?? "(unnamed)"}" and "${item.label ?? "(unnamed)"}" share it. Item ids must be unique within a tree; the later entry overwrites the earlier in lookups.`,
      );
    }
    index[id] = item;
    if (item.items) {
      for (let i = item.items.length - 1; i >= 0; i--) {
        stack.push(item.items[i]);
      }
    }
  }
  return index;
}
