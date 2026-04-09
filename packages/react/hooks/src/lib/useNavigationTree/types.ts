import type { _Index, _Item, Item } from "@canonical/ds-types";

/** Arrow key orientation at a given tree depth */
export type Orientation = "horizontal" | "vertical";

/** Focus management strategy for the navigation widget */
export type FocusStrategy = "roving" | "taborder";

/** How orientation is resolved — a fixed value or a function of depth */
export type OrientationConfig = Orientation | ((depth: number) => Orientation);

/** Action types for the navigation state machine */
export enum NavigationActionType {
  ITEM_SELECT = "ITEM_SELECT",
  ITEM_HIGHLIGHT = "ITEM_HIGHLIGHT",
  OPEN = "OPEN",
  CLOSE = "CLOSE",
  TOGGLE = "TOGGLE",
  ARROW_DOWN = "ARROW_DOWN",
  ARROW_UP = "ARROW_UP",
  ARROW_LEFT = "ARROW_LEFT",
  ARROW_RIGHT = "ARROW_RIGHT",
  HOME = "HOME",
  END = "END",
  PAGE_UP = "PAGE_UP",
  PAGE_DOWN = "PAGE_DOWN",
  TYPE_AHEAD = "TYPE_AHEAD",
  CLEAR_TYPE_AHEAD = "CLEAR_TYPE_AHEAD",
  SET_INPUT_VALUE = "SET_INPUT_VALUE",
  RESET = "RESET",
}

/** A dispatched action with optional payload */
export interface NavigationAction {
  type: NavigationActionType;
  item?: _Item;
  inputValue?: string;
}

/** The reducer's state shape */
export interface NavigationState {
  /** Items from root to current selection (ancestor path) */
  selectedItems: _Item[];
  /** Items from root to current highlight (ancestor path) */
  highlightedItems: _Item[];
  /** Current keyboard/focus depth in the tree */
  currentDepth: number;
  /** Whether the navigation widget is expanded (for collapsible patterns) */
  isOpen: boolean;
  /** Search/filter input value (for searchable menus) */
  inputValue: string;
  /** Accumulated type-ahead characters */
  keysSoFar: string;
}

/** Structural predicates for a node relative to current state */
export interface NodeStatus {
  /** Node is the last item in selectedItems (the selected leaf) */
  selected: boolean;
  /** Node appears in selectedItems (ancestor of or equal to the selected leaf) */
  inSelectedBranch: boolean;
  /** Node is the last item in highlightedItems (the highlighted leaf) */
  highlighted: boolean;
  /** Node appears in highlightedItems (ancestor of or equal to the highlighted leaf) */
  inHighlightedBranch: boolean;
}

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
