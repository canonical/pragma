import type { _Index, _Item, Item } from "@canonical/ds-types";
import type {
  NavigationAction,
  NavigationState,
  NodeStatus,
  OrientationConfig,
} from "@canonical/utils";

// Re-export framework-agnostic types for convenience
export type {
  NavigationAction,
  NavigationState,
  NodeStatus,
  Orientation,
  OrientationConfig,
} from "@canonical/utils";
export { NavigationActionType } from "@canonical/utils";

/** Focus management strategy for the navigation widget */
export type FocusStrategy = "roving" | "taborder";

/** Props for the useNavigationTree hook */
export interface UseNavigationTreeProps {
  /** The root navigation item (WD405 Item type) */
  root: Item;
  /** Focus management strategy. "roving": one tab stop, arrow-managed. "taborder": every item tabbable. Default: "roving". */
  focus?: FocusStrategy;
  /** Arrow key orientation per depth. Default: all vertical. */
  orientation?: OrientationConfig;
  /** Whether arrow keys wrap at list boundaries. Default: false. */
  wrap?: boolean;
  /** Custom state reducer for intercepting/overriding transitions */
  stateReducer?: (
    state: NavigationState,
    action: NavigationAction,
  ) => NavigationState;
  /** Initial URL to resolve selection from. Sets selectedItems on mount. */
  initialUrl?: string;
  /** Type-ahead reset timeout in milliseconds. Default: 700. */
  typeAheadTimeout?: number;
}

/** Props returned by getToggleProps */
export interface ToggleProps {
  onClick?: (e: React.SyntheticEvent) => void;
  onMouseEnter?: (e: React.SyntheticEvent) => void;
  ref?: React.Ref<HTMLElement>;
  [key: string]: unknown;
}

/** Props returned by getMenuProps */
export interface MenuProps {
  onMouseLeave?: (e: React.SyntheticEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  ref?: React.Ref<HTMLElement>;
  tabIndex?: number;
  [key: string]: unknown;
}

/** Props returned by getItemProps */
export interface ItemProps {
  onClick?: (e: React.SyntheticEvent) => void;
  onMouseMove?: (e: React.SyntheticEvent) => void;
  tabIndex?: number;
  ref?: React.Ref<HTMLElement>;
  [key: string]: unknown;
}

/** Return value of the useNavigationTree hook */
export interface UseNavigationTreeResult extends NavigationState {
  /** Annotated root item */
  annotatedRoot: _Item;
  /** Flat index for O(1) lookup by URL or key */
  index: _Index;

  /** Derive the structural status of a node from current state */
  getNodeStatus: (item: _Item) => NodeStatus;
  /** Props for the element that toggles open/close */
  getToggleProps: (props?: Partial<ToggleProps>) => ToggleProps;
  /** Props for the menu/list container */
  getMenuProps: (props?: Partial<MenuProps>) => MenuProps;
  /** Props for an individual item */
  getItemProps: (item: _Item, props?: Partial<ItemProps>) => ItemProps;

  /** Set selection to this item's ancestor path */
  selectItem: (item: _Item) => void;
  /** Set highlight to this item's ancestor path */
  highlightItem: (item: _Item) => void;
  /** Set the full highlighted path directly */
  setHighlightedItems: (items: _Item[]) => void;
  /** Set the current searchable-menu input value */
  setInputValue: (value: string) => void;
  /** Open the navigation widget */
  openMenu: () => void;
  /** Close the navigation widget */
  closeMenu: () => void;
  /** Return to initial state */
  reset: () => void;
}
