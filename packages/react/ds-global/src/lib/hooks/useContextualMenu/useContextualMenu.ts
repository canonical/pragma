import type { _Item } from "@canonical/ds-types";
import {
  getMenuProps as getMenuAriaProps,
  getMenuGroupProps,
  getMenuItemProps,
  useNavigationTree,
} from "@canonical/react-hooks";
import { createCrossGroupStateReducer } from "@canonical/utils";
import { useCallback, useEffect, useMemo } from "react";
import { useDisclosure } from "../useDisclosure/index.js";
import type {
  MenuItem,
  UseContextualMenuProps,
  UseContextualMenuResult,
} from "./types.js";

/**
 * Drives a contextual menu: a click-triggered, positioned popup listing grouped
 * menu items with full keyboard support.
 *
 * Positioning, open state, outside-click and Escape dismissal come from
 * {@link useDisclosure} in `click` mode. Roving focus, type-ahead, and ARIA
 * wiring come from `useNavigationTree`. Vertical arrow keys cross group
 * boundaries through a `stateReducer`, so the shared navigation machinery stays
 * menu-agnostic.
 *
 * @param root The menu tree (menu -> group -> item).
 * @param wrap Whether arrow keys wrap at the first/last item.
 * @param typeAheadTimeout Type-ahead reset timeout in milliseconds.
 * @param props Forwarded to the underlying disclosure (positioning, callbacks).
 * @returns The open state, positioning, and menu prop-getters.
 */
const useContextualMenu = ({
  root,
  wrap = false,
  typeAheadTimeout,
  ...props
}: UseContextualMenuProps): UseContextualMenuResult => {
  const {
    isOpen,
    open,
    close,
    toggle,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    arrowOffset,
    getToggleProps: getDisclosureToggleProps,
  } = useDisclosure({ ...props, mode: "click" });

  // The cross-group reducer operates on state.highlightedItems (the tree's own
  // instances), so it needs no external index — avoiding the instance mismatch
  // that a separately-annotated tree would introduce.
  const stateReducer = useMemo(
    () => createCrossGroupStateReducer<MenuItem>(),
    [],
  );

  const nav = useNavigationTree<MenuItem>({
    root,
    focus: "roving",
    wrap,
    typeAheadTimeout,
    // The cross-group boundary rule lives here, not in the shared reducer.
    stateReducer,
  });

  // The disclosure owns the open state (it drives positioning and dismissal);
  // mirror it into the navigation tree so roving focus follows open/close.
  useEffect(() => {
    if (isOpen) nav.openMenu();
    else nav.closeMenu();
  }, [isOpen, nav.openMenu, nav.closeMenu]);

  // The trigger must drive the DISCLOSURE (the source of truth for open) while
  // keeping the disclosure's click/keyboard handlers. The tree's toggle is not
  // used for open/close here.
  const getTriggerProps = useCallback(
    () => ({
      "aria-haspopup": "menu" as const,
      "aria-expanded": isOpen,
      "aria-controls": popupId,
      ...getDisclosureToggleProps(),
    }),
    [isOpen, popupId, getDisclosureToggleProps],
  );

  // Menu-role ARIA getters, composing the base navigation prop-getters (for
  // roving tabindex + refs) with the contextual-menu ARIA presets.
  const getMenuProps = useCallback(
    (opts?: {
      label?: string;
      labelledBy?: string;
      ref?: React.Ref<HTMLElement>;
    }) => ({
      // Compose the positioning ref (if provided) with the navigation menu ref.
      ...nav.getMenuProps(opts?.ref ? { ref: opts.ref } : undefined),
      ...getMenuAriaProps(nav, opts),
    }),
    [nav],
  );

  const getGroupProps = useCallback(
    (opts?: { label?: string; labelledBy?: string }) =>
      getMenuGroupProps(nav, opts),
    [nav],
  );

  const getItemProps = useCallback(
    (item: _Item<MenuItem>) => ({
      ...nav.getItemProps(item),
      ...getMenuItemProps(nav, item),
    }),
    [nav],
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    targetRef,
    popupRef,
    popupPositionStyle,
    popupId,
    bestPosition,
    arrowOffset,
    annotatedRoot: nav.annotatedRoot,
    index: nav.index,
    highlightedItems: nav.highlightedItems,
    highlightItem: nav.highlightItem,
    selectItem: nav.selectItem,
    getTriggerProps,
    getMenuProps,
    getGroupProps,
    getItemProps,
  };
};

export default useContextualMenu;
