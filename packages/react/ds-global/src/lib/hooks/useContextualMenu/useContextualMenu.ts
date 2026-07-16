import type { _Item } from "@canonical/ds-types";
import {
  getMenuProps as getMenuAriaProps,
  getMenuItemProps,
  useNavigationTree,
} from "@canonical/react-hooks";
import { useCallback, useEffect, useMemo } from "react";
import { useDisclosure } from "../useDisclosure/index.js";
import isMenuSeparator from "./isMenuSeparator.js";
import type {
  MenuEntry,
  MenuItem,
  UseContextualMenuProps,
  UseContextualMenuResult,
} from "./types.js";

/**
 * Prepare a menu entry for the navigation tree. A separator becomes a
 * disabled, label-less node with a guaranteed-unique key: `disabled` is what
 * makes the shared navigation machinery (arrow keys, Home/End, type-ahead,
 * roving focus) skip it with no separator awareness of its own, and the key
 * gives it the identity the tree's index requires. Items recurse into their
 * submenu entries; `counter` numbers auto-keyed separators tree-wide.
 */
const prepareEntry = (
  entry: MenuEntry,
  counter: { next: number },
): MenuEntry => {
  if (isMenuSeparator(entry)) {
    return {
      ...entry,
      key: entry.key ?? `separator-${counter.next++}`,
      disabled: true,
    };
  }
  if (!entry.items?.length) return entry;
  return {
    ...entry,
    items: entry.items.map((child) => prepareEntry(child, counter)),
  };
};

/**
 * Drives a contextual menu: a click-triggered, positioned popup listing menu
 * items and separators with full keyboard support.
 *
 * Positioning, open state, outside-click and Escape dismissal come from
 * {@link useDisclosure} in `click` mode. Roving focus, type-ahead, and ARIA
 * wiring come from `useNavigationTree`, unmodified: separators enter the tree
 * as disabled, label-less nodes, which the tree already skips.
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

  // Separators become disabled nodes with guaranteed keys BEFORE the tree
  // annotates the root, so useNavigationTree runs unmodified.
  const preparedRoot = useMemo(
    () => prepareEntry(root, { next: 0 }) as MenuItem,
    [root],
  );

  const nav = useNavigationTree<MenuEntry>({
    root: preparedRoot,
    focus: "roving",
    wrap,
    typeAheadTimeout,
  });

  // The disclosure owns the open state (it drives positioning and dismissal);
  // mirror it into the navigation tree so roving focus follows open/close. The
  // reducer's OPEN highlights the first enabled child — a real menuitem, since
  // the root's children are the items themselves (separators are disabled).
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
      const item = document.querySelector<HTMLElement>(
        '[role="menuitem"][tabindex="0"]',
      );
      if (item && item !== document.activeElement) {
        item.focus();
        item.scrollIntoView({ block: "nearest" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, highlightedTail]);

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
        onKeyDown: (event: React.KeyboardEvent) =>
          handleMenuKeyDown(event, treeKeyDown),
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
