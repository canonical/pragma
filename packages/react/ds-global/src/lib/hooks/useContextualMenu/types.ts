import type { _DistributiveOmit, _Item, Item } from "@canonical/ds-types";
import type {
  ItemProps,
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
export type MenuItem = _DistributiveOmit<Item, "items"> & {
  /** Content rendered right-aligned within the item, such as a badge or shortcut. */
  slot?: React.ReactNode;
  /** Icon rendered left of the label. */
  icon?: React.ReactNode;
  /** Child entries — this item's submenu, which may itself contain separators. */
  items?: MenuEntry[];
  /** CSS class name applied to this item, in addition to the base classes. */
  className?: string;
  /** Accessible label overriding the item's visible label. */
  "aria-label"?: string;
  /** Called before the menu-level callback when this item is selected. */
  onSelect?: (item: MenuItem) => void;
  /**
   * How this item is rendered. `"custom"` without a `Component` falls back to
   * the default layout; `"panel"` without a `Component` does the same.
   * - `default`: ordinary selectable command row.
   * - `custom`: selectable command row whose contents come from `Component`.
   * - `panel`: non-selectable interactive surface (inputs, checkboxes,
   *   Apply/Reset). It is not a `menuitem` and does not intercept form keys.
   */
  displayItemsType?: "default" | "custom" | "panel";
  /**
   * Custom renderer for this item. Used by `"custom"` (selectable row) and
   * `"panel"` (non-selectable interactive surface).
   */
  Component?: React.ComponentType<{ item: MenuItem }>;
};

/**
 * A non-interactive divider between menu entries, rendered as a horizontal
 * rule. It is fed to the navigation tree as a PRESENTATIONAL, label-less node,
 * so the shared navigation machinery (arrow keys, Home/End, type-ahead, roving
 * focus) skips it without any separator awareness of its own.
 */
export interface MenuSeparator {
  /** Discriminant distinguishing a separator from a menu item. */
  type: "separator";
  /**
   * Unique identity within the menu, used as the React key and the navigation
   * index id. Required: a separator is a node in the navigation tree, and
   * every navigation item is identified by a `key` or a `url`.
   */
  key: string;
  /**
   * Set by {@link useContextualMenu} before the tree is annotated — being
   * presentational is what makes the navigation machinery skip the separator.
   * Consumers never set it.
   *
   * Deliberately not `disabled`: that would claim this is a menu item the
   * user may not choose, and a renderer would be entitled to announce it
   * `aria-disabled`. A separator is not an item.
   */
  presentational?: true;
}

/**
 * One entry in a contextual menu's list: an actionable item or a separator.
 */
export type MenuEntry = MenuItem | MenuSeparator;

export interface UseContextualMenuProps
  extends Omit<UseDisclosureProps, "mode"> {
  /**
   * The menu tree. The root's children are the menu entries — items and
   * separators in one flat list; an item's own `items` form its submenu.
   */
  root: MenuItem;
  /** Whether arrow keys wrap at the first/last item. Defaults to false. */
  wrap?: boolean;
  /** Type-ahead reset timeout in milliseconds. */
  typeAheadTimeout?: number;
  /** Whether opening highlights and focuses the first enabled item. Defaults to true. */
  highlightFirstItem?: boolean;
}

/** Options for the menu ARIA prop-getter. */
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
 * dismissal) with a navigation tree (roving keyboard focus, arrow traversal,
 * type-ahead) and menu ARIA wiring.
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
      UseNavigationTreeResult<MenuEntry>,
      | "annotatedRoot"
      | "index"
      | "highlightedItems"
      | "highlightItem"
      | "selectItem"
      | "getNodeStatus"
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
  /**
   * Prop-getter for a `role="menuitem"` element. Items only — a separator is
   * not interactive and receives no item props.
   */
  getItemProps: (item: _Item<MenuItem>) => ItemProps & MenuItemPropsResult;
}
