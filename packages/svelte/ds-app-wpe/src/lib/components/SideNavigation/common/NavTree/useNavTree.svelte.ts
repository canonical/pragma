import type { _Item } from "@canonical/ds-types";
import type { NavigationState } from "@canonical/utils";
import {
  annotateTree,
  createCrossGroupStateReducer,
  createNavigationReducer,
  findAncestorPath,
  getItemId,
  NavigationActionType,
  prepareIndex,
} from "@canonical/utils";
import type { NavItem } from "../../types.js";

const blankState: Omit<
  NavigationState<NavItem>,
  "highlightedItems" | "currentDepth"
> = {
  selectedItems: [],
  isOpen: false,
  inputValue: "",
  keysSoFar: "",
};

export interface UseNavTreeOptions {
  /** Reactive getter for the root item — its direct children render as groups. */
  root: () => NavItem;
}

/**
 * Headless controller for a single SideNavigation region (Content or Footer).
 * Each region owns one instance — they're independent keyboard/focus domains,
 * matching them being independently Tab-reachable regions.
 *
 * Wraps `@canonical/utils`' framework-agnostic navigation reducer, applied
 * per keystroke rather than kept as persistent reactive state — DOM focus is
 * the source of truth for "where are we", read fresh from whichever item
 * received the key event — then translated into an imperative `.focus()`
 * call. This keeps every item natively Tab-focusable (no roving tabindex,
 * matching the spec's plain top-to-bottom tab order) while layering arrow
 * keys on top as a WCAG-conformant enhancement: Up/Down move across siblings
 * at the SAME level only (crossing group boundaries at the edges), never
 * descending into a level automatically — only ArrowRight/Enter, which
 * explicitly expand a group, do that.
 */
export function useNavTree(options: UseNavTreeOptions) {
  const annotatedRoot = $derived(annotateTree<NavItem>(options.root()));
  const index = $derived(prepareIndex<NavItem>(annotatedRoot));
  const reducer = $derived(
    createNavigationReducer<NavItem>(index, {
      rootItem: annotatedRoot,
      orientation: "vertical",
      wrap: false,
    }),
  );
  const crossGroupReducer = createCrossGroupStateReducer<NavItem>();

  const elements = new Map<string, HTMLElement>();
  let keysSoFar = "";
  let clearTypeAheadTimer: ReturnType<typeof setTimeout> | undefined;

  /** Register (or, passing `null`, unregister) the focusable element for an item. */
  function register(item: _Item<NavItem>, element: HTMLElement | null): void {
    const id = getItemId(item);
    if (element) elements.set(id, element);
    else elements.delete(id);
  }

  /**
   * Resolve the item an action would move to from `item`, without moving
   * focus.
   *
   * Cross-group boundary crossing only applies to depth-2 items moving
   * between GROUPS — applying it one level deeper (a subitem's siblings)
   * would misread its depth-2 parent item as a "group" and let Up/Down leak
   * into an unrelated top-level item's own subitems, which is exactly the
   * "arrows descend into a level" failure this hook exists to avoid.
   *
   * The cross-group reducer's own contract (see its tests) is to run on the
   * PRE-move state and only decide anything when the base reducer left that
   * state untouched — i.e. `item` was already sitting at its group's edge, so
   * `getSibling` had nowhere left to go. Feeding it the base reducer's
   * ALREADY-moved result instead (as `useNavigationTree`'s generic
   * `stateReducer` composition does) misreads a real, successful in-group
   * move that happens to land ON that edge — e.g. the first press from a
   * group's second-to-last item — as "stuck", and crosses one group too many.
   */
  function resolve(
    item: _Item<NavItem>,
    actionType: NavigationActionType,
  ): _Item<NavItem> | undefined {
    const seed: NavigationState<NavItem> = {
      ...blankState,
      highlightedItems: findAncestorPath(index, item),
      currentDepth: item.depth,
    };
    const afterBase = reducer(seed, { type: actionType });
    const isVerticalMove =
      actionType === NavigationActionType.ARROW_DOWN ||
      actionType === NavigationActionType.ARROW_UP;
    const next =
      item.depth === 2 && isVerticalMove && afterBase === seed
        ? crossGroupReducer(seed, { type: actionType })
        : afterBase;
    return next.highlightedItems.at(-1);
  }

  /** Move focus from `item` per `actionType`. A no-op if there's nowhere to go. */
  function move(item: _Item<NavItem>, actionType: NavigationActionType): void {
    const target = resolve(item, actionType);
    if (target && target !== item) elements.get(getItemId(target))?.focus();
  }

  /**
   * Accumulate a type-ahead character and move focus to the next enabled
   * item (searching across groups, when `item` is a top-level one) whose
   * label starts with the accumulated string. Resets after `timeout`ms.
   */
  function typeAhead(item: _Item<NavItem>, char: string, timeout = 700): void {
    const seed: NavigationState<NavItem> = {
      ...blankState,
      highlightedItems: findAncestorPath(index, item),
      currentDepth: item.depth,
      keysSoFar,
    };
    const action = { type: NavigationActionType.TYPE_AHEAD, inputValue: char };
    const afterBase = reducer(seed, action);
    const next =
      item.depth === 2 ? crossGroupReducer(afterBase, action) : afterBase;
    keysSoFar = next.keysSoFar;

    const target = next.highlightedItems.at(-1);
    if (target && target !== item) elements.get(getItemId(target))?.focus();

    clearTimeout(clearTypeAheadTimer);
    clearTypeAheadTimer = setTimeout(() => {
      keysSoFar = "";
    }, timeout);
  }

  return {
    get annotatedRoot() {
      return annotatedRoot;
    },
    get index() {
      return index;
    },
    register,
    move,
    typeAhead,
  };
}

/** The controller `useNavTree` returns — an independent keyboard/focus domain over one item tree. */
export type NavTreeController = ReturnType<typeof useNavTree>;
