import type { Item, _Item } from "@canonical/ds-types";
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
