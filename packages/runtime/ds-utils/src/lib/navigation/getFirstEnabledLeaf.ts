import type { _Item, Item } from "@canonical/ds-types";

/**
 * Descend to the first enabled LEAF of a subtree — the first enabled node that
 * has no enabled children of its own.
 *
 * The point of difference from {@link getFirstEnabledChild} is the structural
 * group layer of a contextual menu. A menu is a `root -> group -> item` tree:
 * the root's direct children are GROUPS (rendered `role="group"`, never
 * focusable), and the real `role="menuitem"` nodes live one level deeper.
 * Highlighting the first *child* of the root lands on a group, so no item
 * becomes the roving tab stop and arrow keys have no current item to move from.
 * Descending to the first leaf lands on the first real menuitem instead.
 *
 * For a flat `root -> item` tree (e.g. a simple menu with no groups) the first
 * child is already a leaf, so this returns exactly what
 * {@link getFirstEnabledChild} would — no behaviour change.
 *
 * @param item The subtree root to descend from (typically the menu root).
 * @returns The first enabled leaf, or `undefined` if the subtree has none.
 */
export default function getFirstEnabledLeaf<T extends Item = Item>(
  item: _Item<T>,
): _Item<T> | undefined {
  // Walk the enabled children in order; recurse into any that themselves have
  // children (a group), and backtrack to the next sibling if a branch dead-ends
  // (e.g. a group whose items are all disabled). An enabled child with no
  // children of its own IS the leaf we want.
  for (const child of item.items ?? []) {
    if (child.disabled) continue;
    if (child.items?.length) {
      // A container (group / submenu parent): descend, but keep scanning
      // siblings if this branch has no enabled leaf (e.g. all items disabled).
      const leaf = getFirstEnabledLeaf(child);
      if (leaf) return leaf;
    } else {
      // An enabled node with no children of its own — the first real leaf.
      return child;
    }
  }
  return undefined;
}
