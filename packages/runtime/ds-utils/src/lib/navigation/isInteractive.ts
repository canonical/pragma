import type { _Item, Item } from "@canonical/ds-types";

/**
 * Whether keyboard navigation may land on a node.
 *
 * Two different facts disqualify a node, and the helpers that walk a tree care
 * about neither one specifically — only about the disjunction, which is why it
 * is named once here rather than spelled out at each call site:
 *
 * - `disabled` — an item the user may not choose right now.
 * - `presentational` — not an item at all (a separator, a heading, a spacer).
 *
 * Keeping them separate in the type and joined only in this predicate is what
 * lets a renderer draw a disabled item differently from a separator while the
 * traversal treats both as ground it does not stop on.
 *
 * @param item - The navigation item to test
 * @returns True when the node can take focus and be activated
 */
export function isInteractive<T extends Item = Item>(
  item: _Item<T> | Item,
): boolean {
  return !item.disabled && !item.presentational;
}
