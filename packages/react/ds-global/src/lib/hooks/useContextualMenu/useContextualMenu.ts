import type { _Item } from "@canonical/ds-types";
import {
  getMenuProps as getMenuAriaProps,
  getMenuGroupProps,
  getMenuItemProps,
  useNavigationTree,
} from "@canonical/react-hooks";
import {
  createCrossGroupStateReducer,
  getFirstEnabledLeaf,
} from "@canonical/utils";
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
  // mirror it into the navigation tree so roving focus follows open/close. On
  // open, highlight the first enabled LEAF (a real menuitem) rather than letting
  // the shared reducer's OPEN land on the first child — which, for the menu's
  // root -> group -> item tree, is a structural GROUP. Without a highlighted
  // menuitem no item gets the roving `tabindex="0"` and arrow keys have no
  // current item to move from, so keyboard navigation is dead.
  useEffect(() => {
    if (isOpen) {
      nav.openMenu();
      const firstLeaf = getFirstEnabledLeaf(nav.annotatedRoot);
      if (firstLeaf) nav.highlightItem(firstLeaf);
    } else {
      nav.closeMenu();
    }
  }, [
    isOpen,
    nav.openMenu,
    nav.closeMenu,
    nav.highlightItem,
    nav.annotatedRoot,
  ]);

  // Move DOM focus into the menu when it opens so arrow keys reach the roving
  // keyboard handler (WAI-ARIA menu button: opening focuses the first item).
  // Fires only on open; the double rAF waits for the popup to render and the
  // roving `tabindex="0"` to be applied before focus lands.
  // @note Impure — moves DOM focus.
  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;
    const menu = popupRef.current;
    if (!menu) return;
    const focusMenu = () => {
      const firstItem = menu.querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      // Prefer the first enabled menuitem; fall back to the menu container,
      // which carries the keyboard handler.
      (firstItem ?? menu).focus();
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(focusMenu));
    return () => cancelAnimationFrame(id);
  }, [isOpen, popupRef]);

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

  // Bridge the tree's keyboard handling to the disclosure, which owns the open
  // state. Escape and Tab close the menu and return focus to the trigger (WCAG /
  // WAI-ARIA menu pattern); every other key (arrows, Home/End, type-ahead,
  // Enter) is delegated to the navigation tree.
  const handleMenuKeyDown = useCallback(
    (
      event: React.KeyboardEvent,
      treeKeyDown?: (e: React.KeyboardEvent) => void,
    ) => {
      if (event.key === "Escape" || event.key === "Tab") {
        // Tab must not move focus to the next control while the menu is open.
        if (event.key === "Tab") event.preventDefault();
        close();
        // @note Impure — returns focus to the trigger.
        targetRef.current?.focus();
        return;
      }
      treeKeyDown?.(event);
    },
    [close, targetRef],
  );

  // Menu-role ARIA getters, composing the base navigation prop-getters (for
  // roving tabindex + refs) with the contextual-menu ARIA presets.
  const getMenuProps = useCallback(
    (opts?: {
      label?: string;
      labelledBy?: string;
      ref?: React.Ref<HTMLElement>;
    }) => {
      const baseProps = nav.getMenuProps(
        opts?.ref ? { ref: opts.ref } : undefined,
      );
      const treeKeyDown = baseProps.onKeyDown;
      return {
        ...baseProps,
        ...getMenuAriaProps(nav, opts),
        "aria-modal": true,
        onKeyDown: (event: React.KeyboardEvent) =>
          handleMenuKeyDown(event, treeKeyDown),
      };
    },
    [nav, handleMenuKeyDown],
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
    // `getNodeStatus(P).inHighlightedBranch` is true when the keyboard path
    // descends through P — i.e. P's submenu is the open one. The render layer
    // uses it to decide which submenus to show.
    getNodeStatus: nav.getNodeStatus,
    getTriggerProps,
    getMenuProps,
    getGroupProps,
    getItemProps,
  };
};

export default useContextualMenu;
