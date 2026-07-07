import type { _Item, Item } from "@canonical/ds-types";
import getFirstEnabledChild from "./getFirstEnabledChild.js";
import getLastEnabledChild from "./getLastEnabledChild.js";
import {
  type NavigationAction,
  NavigationActionType,
  type NavigationState,
} from "./navigationTypes.js";

/**
 * Scan the groups adjacent to `group` (skipping disabled or empty ones) and
 * return the group to land in, in the given direction.
 * @param groups The sibling groups (children of the menu root).
 * @param group The current group being left.
 * @param direction 1 for the next group, -1 for the previous.
 * @returns [adjacentGroup, landingItem] or undefined at the tree's edge.
 */
const findAdjacentLanding = <T extends Item = Item>(
  groups: _Item<T>[],
  group: _Item<T>,
  direction: 1 | -1,
): [_Item<T>, _Item<T>] | undefined => {
  let cursor = groups.indexOf(group) + direction;
  while (cursor >= 0 && cursor < groups.length) {
    const candidate = groups.at(cursor);
    if (candidate && !candidate.disabled) {
      // Enter a forward group at its first item, a backward group at its last.
      const landing =
        direction === 1
          ? getFirstEnabledChild(candidate)
          : getLastEnabledChild(candidate);
      if (landing) return [candidate, landing];
    }
    cursor += direction;
  }
  return undefined;
};

/**
 * Create a `stateReducer` for `useNavigationTree` that lets vertical arrow keys
 * cross group boundaries. Within a group, {@link createNavigationReducer}
 * already moves between items; at a group edge its `getSibling` finds no sibling
 * and leaves the highlight unchanged. This reducer detects that edge structurally
 * (the highlighted item is the first/last enabled child of its group) and moves
 * the highlight to the adjacent group's boundary item.
 *
 * It operates purely on `state.highlightedItems` — the ancestor path
 * `[root, group, item]` — so it uses the same annotated item instances the
 * navigation tree holds internally. It needs no external index, which avoids the
 * instance-mismatch that would arise from re-annotating the tree separately.
 *
 * The group boundary logic lives entirely here, so the base navigation reducer
 * stays group-agnostic. It suits any grouped, vertically-navigated widget
 * (contextual menus, sectioned side navigation) built on a
 * root -> group -> item tree.
 *
 * @returns A `(state, action) => state` reducer to pass as `stateReducer`.
 */
const createCrossGroupStateReducer =
  <T extends Item = Item>() =>
  (
    state: NavigationState<T>,
    action: NavigationAction<T>,
  ): NavigationState<T> => {
    const isDown = action.type === NavigationActionType.ARROW_DOWN;
    const isUp = action.type === NavigationActionType.ARROW_UP;
    if (!isDown && !isUp) return state;

    // The highlighted path is [root, group, item] for a grouped menu.
    const path = state.highlightedItems;
    const current = path.at(-1);
    const group = path.at(-2);
    const root = path.at(-3);
    // Only items nested inside a group (root -> group -> item) can cross groups.
    if (!current || !group || !root?.items) return state;

    const boundaryChild = isDown
      ? getLastEnabledChild(group)
      : getFirstEnabledChild(group);
    // Not at the group edge — the base reducer already moved within the group.
    if (boundaryChild !== current) return state;

    const landing = findAdjacentLanding(root.items, group, isDown ? 1 : -1);
    if (!landing) return state;

    const [adjacentGroup, target] = landing;
    return {
      ...state,
      // Build the path from the known chain — same instances the tree holds.
      highlightedItems: [...path.slice(0, -2), adjacentGroup, target],
      currentDepth: target.depth,
    };
  };

export default createCrossGroupStateReducer;
