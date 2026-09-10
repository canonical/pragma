import type { _Item } from "@canonical/ds-types";
import type { NavigationAction, NavigationState } from "@canonical/react-hooks";
import {
  getMenuProps as getMenuAriaProps,
  getMenuItemProps,
  NavigationActionType,
  useNavigationTree,
} from "@canonical/react-hooks";
import { useCallback, useEffect, useMemo } from "react";
import { useDisclosure } from "../useDisclosure/index.js";
import {
  getHighlightedMenuEntry,
  getMenuEntryFocusTarget,
} from "./getMenuEntryFocusTarget.js";
import isMenuSeparator from "./isMenuSeparator.js";
import type {
  MenuEntry,
  MenuItem,
  UseContextualMenuProps,
  UseContextualMenuResult,
} from "./types.js";

/**
 * Prepare a menu entry for the navigation tree. A separator becomes a
 * PRESENTATIONAL, label-less node, which is what makes the shared navigation
 * machinery (arrow keys, Home/End, type-ahead, roving focus) skip it with no
 * separator awareness of its own.
 *
 * Not `disabled`. A disabled entry is a menu item the user may not choose
 * right now, and a renderer is entitled to draw it greyed and announce it
 * `aria-disabled`; a separator is not an item at all. Marking it disabled
 * made one flag mean two things depending on the node you read it from, and
 * left `disabled` unable to answer "may the user choose this?" on its own.
 *
 * The word "separator" stops here: the core learns only that the node is
 * presentational. Its `key` is the identity the tree's index requires, and
 * the type already guarantees it. Items recurse into their submenu entries.
 */
const prepareEntry = (entry: MenuEntry): MenuEntry => {
  if (isMenuSeparator(entry)) {
    return { ...entry, presentational: true };
  }
  if (!entry.items?.length) return entry;
  return {
    ...entry,
    items: entry.items.map(prepareEntry),
  };
};

/**
 * Drives a contextual menu: a click-triggered, positioned popup listing menu
 * items and separators with full keyboard support.
 *
 * Positioning, open state, outside-click and Escape dismissal come from
 * {@link useDisclosure} in `click` mode. Roving focus, type-ahead, and ARIA
 * wiring come from `useNavigationTree`, unmodified: separators enter the tree
 * as presentational, label-less nodes, which the tree already skips.
 *
 * @param root The menu tree (menu -> entries; an item's `items` is its submenu).
 * @param wrap Whether arrow keys wrap at the first/last item.
 * @param typeAheadTimeout Type-ahead reset timeout in milliseconds.
 * @param props Forwarded to the underlying disclosure (positioning, callbacks).
 * @returns The open state, positioning, and menu prop-getters.
 */
const useContextualMenu = ({
  root,
  wrap = false,
  typeAheadTimeout,
  highlightFirstItem = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
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
  } = useDisclosure({
    ...props,
    mode: "click",
    // ContextualMenu owns Escape so a key event handled by a menu surface
    // cannot race the disclosure's document listener and close twice.
    closeOnEscape: false,
    // ContextualMenu owns outside dismissal because nested surfaces are
    // portalled outside the root popup ref.
    closeOnOutsideClick: false,
  });

  // Separators become presentational nodes BEFORE the tree annotates the root,
  // so useNavigationTree runs unmodified.
  const preparedRoot = useMemo(() => prepareEntry(root) as MenuItem, [root]);

  const stateReducer = useCallback(
    (
      state: NavigationState<MenuEntry>,
      action: NavigationAction<MenuEntry>,
    ): NavigationState<MenuEntry> =>
      !highlightFirstItem && action.type === NavigationActionType.OPEN
        ? { ...state, highlightedItems: [] }
        : state,
    [highlightFirstItem],
  );

  const nav = useNavigationTree<MenuEntry>({
    root: preparedRoot,
    focus: "roving",
    wrap,
    typeAheadTimeout,
    stateReducer,
  });

  // The disclosure owns the open state (it drives positioning and dismissal);
  // mirror it into the navigation tree so roving focus follows open/close. The
  // reducer's OPEN highlights the first interactive child — a real menuitem,
  // since the root's children are the items themselves (separators are
  // presentational, and the tree passes over them).
  useEffect(() => {
    if (isOpen) {
      nav.openMenu();
    } else {
      nav.closeMenu();
    }
  }, [isOpen, nav.openMenu, nav.closeMenu]);

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
      if (!highlightFirstItem) {
        menu.focus();
        return;
      }
      const focusTarget = getMenuEntryFocusTarget(
        getHighlightedMenuEntry(menu),
      );
      (focusTarget ?? menu).focus();
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(focusMenu));
    return () => cancelAnimationFrame(id);
  }, [isOpen, popupRef, highlightFirstItem]);

  // Keep DOM focus on the currently-highlighted item as the keyboard highlight
  // moves. The tree only updates the roving `tabindex`; without moving focus too
  // the new item is not scrolled into view — so navigating to an item below a
  // long menu's fold would move the highlight to an item that stays off-screen.
  // Focusing it (menu + submenus are portalled, so search the whole document)
  // scrolls it into view natively. Guarded so it only runs while focus is
  // already inside a menu (never steals focus when the menu is not in use).
  // @note Impure — moves DOM focus.
  const highlightedTail = nav.highlightedItems.at(-1);
  useEffect(() => {
    if (typeof window === "undefined" || !isOpen || !highlightedTail) return;
    const active = document.activeElement;
    const focusWithinMenu =
      active instanceof HTMLElement && active.closest('[role="menu"]') !== null;
    if (!focusWithinMenu) return;
    const id = requestAnimationFrame(() => {
      const item = getHighlightedMenuEntry(document);
      const focusTarget = getMenuEntryFocusTarget(item);
      if (focusTarget && focusTarget !== document.activeElement) {
        focusTarget.focus();
        if (typeof item?.scrollIntoView === "function") {
          item.scrollIntoView({ block: "nearest" });
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, highlightedTail]);

  // The trigger must drive the DISCLOSURE (the source of truth for open) while
  // keeping the disclosure's click/keyboard handlers. The tree's toggle is not
  // used for open/close here.
  const getTriggerProps = useCallback(() => {
    const disclosureToggleProps = getDisclosureToggleProps();
    return {
      ...disclosureToggleProps,
      "aria-haspopup": "menu" as const,
      "aria-expanded": isOpen,
      "aria-controls": popupId,
    };
  }, [isOpen, popupId, getDisclosureToggleProps]);

  // Bridge the tree's keyboard handling to the disclosure, which owns the open
  // state. Escape and Tab close a command menu and return focus to the trigger
  // (WAI-ARIA menu pattern). A panel is not a command row: Tab/Shift+Tab,
  // Space, and typing stay native, and only Escape / nested ArrowLeft leave.
  const handleMenuKeyDown = useCallback(
    (
      event: React.KeyboardEvent,
      treeKeyDown?: (e: React.KeyboardEvent) => void,
    ) => {
      const target = event.target;
      const isInsidePanel =
        target instanceof HTMLElement &&
        target.closest("[data-contextual-menu-panel]") !== null;

      if (isInsidePanel) {
        if (event.key === "Escape") {
          if (closeOnEscape) {
            close();
            // @note Impure — returns focus to the trigger.
            targetRef.current?.focus();
          }
          return;
        }
        if (event.key === "ArrowLeft") {
          treeKeyDown?.(event);
        }
        return;
      }

      if (event.key === "Tab" || event.key === "Escape") {
        // Consume Escape even when the menu stays open so the tree cannot map
        // it to CLOSE and steal focus back to the trigger.
        if (event.key === "Escape" && !closeOnEscape) return;
        // Tab must not move focus to the next control while a command menu is open.
        if (event.key === "Tab") event.preventDefault();
        close();
        // @note Impure — returns focus to the trigger.
        targetRef.current?.focus();
        return;
      }
      treeKeyDown?.(event);
    },
    [close, closeOnEscape, targetRef],
  );

  // A ContextualMenu can own several portalled surfaces. Handle outside
  // pointer-down once here instead of letting useDisclosure race its single
  // popup ref against nested portals.
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;
    const handlePointerDown = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (!node || targetRef.current?.contains(node)) return;
      const belongsToMenu = event
        .composedPath()
        .some(
          (entry) =>
            entry instanceof HTMLElement &&
            entry.dataset.contextualMenuOwner === popupId,
        );
      if (!belongsToMenu) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, closeOnOutsideClick, targetRef, popupId, close]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, close]);

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
      // No `aria-modal`: it is only valid on modal dialog roles, not `role=
      // "menu"`. The menu-button pattern (haspopup + expanded + Escape/Tab
      // dismissal) already conveys the semantics.
      return {
        ...baseProps,
        ...getMenuAriaProps(nav, opts),
        // The tree's default menu props dispatch CLOSE on mouse-leave, wiping
        // the keyboard highlight (and collapsing keyboard-opened submenus)
        // while the popup stays visually open — a pointer grazing off the
        // surface would destroy a keyboard user's position. The DISCLOSURE
        // owns open/close for a contextual menu, so neutralise it.
        onMouseLeave: undefined,
        onKeyDown: (event: React.KeyboardEvent) => {
          // ONE keyboard handler serves every surface (root + each open
          // submenu), and a keydown inside a portalled submenu bubbles
          // through ALL of them in the React tree — so without stopping here
          // each key would dispatch twice per extra surface. Doubled
          // type-ahead ("c" accumulating as "cc") locks the search into the
          // repeated-character cycle and never matches a two-letter prefix.
          // Handle at the nearest menu surface only.
          event.stopPropagation();
          handleMenuKeyDown(event, treeKeyDown);
        },
      };
    },
    [nav, handleMenuKeyDown],
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
    getItemProps,
  };
};

export default useContextualMenu;
