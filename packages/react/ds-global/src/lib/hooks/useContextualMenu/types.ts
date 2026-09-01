import type { _Item, Item } from "@canonical/ds-types";
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
export interface MenuItem extends Item {
  /** Content rendered right-aligned within the item, such as a badge or shortcut. */
  slot?: React.ReactNode;
  /** Icon rendered left of the label. */
  icon?: React.ReactNode;
  /** Child entries — this item's submenu, which may itself contain separators. */
  items?: MenuEntry[];
  /** CSS class name applied to this item, in addition to the base classes. */
  className?: string;
  /**
   * Opts this item into rendering via `Component` instead of the default
   * layout. `"custom"` without a `Component` falls back to the default.
   */
  displayItemsType?: "default" | "custom";
  /** Custom component for rendering this item itself, when `displayItemsType` is `"custom"`. */
  Component?: React.ComponentType<{ item: MenuItem }>;
}

/**
 * A non-interactive divider between menu entries, rendered as a horizontal
 * rule. It is fed to the navigation tree as a disabled, label-less node, so
 * the shared navigation machinery (arrow keys, Home/End, type-ahead, roving
 * focus) skips it without any separator awareness of its own.
 */
export interface MenuSeparator {
  /** Discriminant distinguishing a separator from a menu item. */
  type: "separator";
  /**
   * Unique identity within the menu, used as the React key and the navigation
   * index id. Auto-generated when omitted.
   */
  key?: string;
  /**
   * Set by {@link useContextualMenu} before the tree is annotated — disabled
   * is what makes the navigation machinery skip the separator. Consumers
   * never set it.
   */
  disabled?: true;
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
