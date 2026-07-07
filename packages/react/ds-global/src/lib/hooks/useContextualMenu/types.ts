import type { _Item, Item } from "@canonical/ds-types";
import type {
  ItemProps,
  MenuGroupPropsResult,
  MenuItemPropsResult,
  MenuProps,
  MenuPropsResult,
  UseNavigationTreeResult,
} from "@canonical/react-hooks";
import type {
  UseDisclosureProps,
  UseDisclosureResult,
} from "../useDisclosure/index.js";

/**
 * A menu item that may carry a right-aligned slot (e.g. a badge or keyboard
 * shortcut) in addition to the base navigation fields. The slot is an optional
 * extension that survives tree annotation.
 */
export interface MenuItem
  extends Item<React.ComponentType<{ item: MenuItem }>> {
  /** Content rendered right-aligned within the item, such as a badge or shortcut. */
  slot?: React.ReactNode;
  /** Icon rendered left of the label. */
  icon?: React.ReactNode;
  /** Child items — a group's items, or a future submenu's entries. */
  items?: MenuItem[];
}

export interface UseContextualMenuProps
  extends Omit<UseDisclosureProps, "mode"> {
  /**
   * The menu tree. The root's children are groups; each group's children are
   * the menu items (menu -> group -> item). One level of items is supported now;
   * deeper nesting is reserved for submenus.
   */
  root: MenuItem;
  /** Whether arrow keys wrap at the first/last item. Defaults to false. */
  wrap?: boolean;
  /** Type-ahead reset timeout in milliseconds. */
  typeAheadTimeout?: number;
}

/** Options for the menu/group ARIA prop-getters. */
export interface MenuAriaOptions {
  /** Accessible name for the element. */
  label?: string;
  /** Id of an element that labels this one. */
  labelledBy?: string;
  /** A ref to compose with the menu's internal keyboard ref (menu container only). */
  ref?: React.Ref<HTMLElement>;
}

/**
 * The contextual menu combines a click disclosure (open state, positioning,
 * dismissal) with a navigation tree (roving keyboard focus, type-ahead, and
 * cross-group arrow traversal via a `stateReducer`) and menu ARIA wiring.
 */
export interface UseContextualMenuResult
  extends Pick<
      UseDisclosureResult,
      | "isOpen"
      | "open"
      | "close"
      | "toggle"
      | "targetRef"
      | "popupRef"
      | "popupPositionStyle"
      | "popupId"
      | "bestPosition"
      | "arrowOffset"
    >,
    Pick<
      UseNavigationTreeResult<MenuItem>,
      | "annotatedRoot"
      | "index"
      | "highlightedItems"
      | "highlightItem"
      | "selectItem"
    > {
  /**
   * Prop-getter for the menu trigger element. Drives the disclosure (open state,
   * positioning, dismissal) and carries the menu ARIA wiring
   * (`aria-haspopup`/`aria-expanded`/`aria-controls`).
   */
  getTriggerProps: () => Record<string, unknown>;
  /**
   * Prop-getter for the `role="menu"` container element. Merges the navigation
   * container props (keyboard handler, ref) with the menu ARIA preset.
   */
  getMenuProps: (opts?: MenuAriaOptions) => MenuProps & MenuPropsResult;
  /** Prop-getter for a `role="group"` element. */
  getGroupProps: (opts?: MenuAriaOptions) => MenuGroupPropsResult;
  /** Prop-getter for a `role="menuitem"` element. */
  getItemProps: (item: _Item<MenuItem>) => ItemProps & MenuItemPropsResult;
}
