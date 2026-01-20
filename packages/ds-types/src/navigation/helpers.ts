import type { _Index, _Item, Item } from "./types.js";

/**
 * Get the unique identifier for an item (url or key)
 *
 * @throws Error if item has neither url nor key
 */
export function getItemId(item: Item | _Item): string {
  if (item.url) return item.url;
  if (item.key) return item.key;
  throw new Error("Item must have either url or key");
}

/**
 * Annotate a navigation tree with parent references and depth
 *
 * Transforms Item tree into _Item tree with parentUrl and depth.
 *
 * @param root - The root item to annotate
 * @param parentUrl - Parent URL (null for root)
 * @param depth - Current depth (0 for root)
 * @returns Annotated item tree
 */
export function annotateTree(
  root: Item,
  parentUrl: string | null = null,
  depth = 0,
): _Item {
  const { items, ...rest } = root;
  const annotated: _Item = {
    ...rest,
    parentUrl,
    depth,
  };
  if (items) {
    annotated.items = items.map((child) =>
      annotateTree(child, getItemId(root), depth + 1),
    );
  }
  return annotated;
}

/**
 * Create an index for O(1) lookup of items by URL or key
 *
 * @param root - The annotated root item
 * @returns Index mapping URL/key to item
 */
export function prepareIndex(root: _Item): _Index {
  const index: _Index = {};
  const stack: _Item[] = [root];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) continue;
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
