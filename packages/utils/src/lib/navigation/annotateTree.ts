import type { _Item, Item } from "@canonical/ds-types";
import { getItemId } from "./getItemId.js";

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
export function annotateTree<T extends Item = Item>(
  root: T,
  parentUrl: string | null = null,
  depth = 0,
): _Item<T> {
  const { items, ...rest } = root;
  // `rest` is `Omit<T, "items">`; the cast reattaches the annotation fields to
  // recover the `_Item<T> = T & { parentUrl; depth; items? }` shape. Single seam.
  const annotated = {
    ...rest,
    parentUrl,
    depth,
  } as _Item<T>;
  if (items) {
    // The tree is homogeneous: every node is the same item type `T`. The base
    // `Item<C>.items` is typed `Item<C>[]`, so narrow children back to `T`
    // (enhanced item types like `NavItem` already declare `items?: NavItem[]`).
    annotated.items = (items as T[]).map((child) =>
      annotateTree<T>(child, getItemId(root), depth + 1),
    );
  }
  return annotated;
}
