import type { _Item } from "@canonical/ds-types";

/** Arrow key orientation at a given tree depth */
export type Orientation = "horizontal" | "vertical";

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
