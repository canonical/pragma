import type { _Index, _Item } from "@canonical/ds-types";
import {
  type NavigationAction,
  NavigationActionType,
  type NavigationState,
  type OrientationConfig,
} from "./types.js";

/** Options injected into the reducer factory */
interface ReducerOptions {
  orientation: OrientationConfig;
  wrap: boolean;
}

/**
 * Create a navigation state reducer parameterized by the tree index and options.
 *
 * The reducer implements the state machine defined in NV.03/NV.04/NV.05 of the
 * B.HOOKS ADR. Arrow keys are remapped based on orientation at the current depth.
 * Auto-drill fires when moving between horizontal siblings with a submenu open.
 *
 * @param index - Flat lookup table for O(1) item access
 * @param options - Orientation config and wrap behavior
 * @returns A reducer function for use with useReducer
 */
export function createNavigationReducer(
  index: _Index,
  options: ReducerOptions,
): (state: NavigationState, action: NavigationAction) => NavigationState {
  const { orientation, wrap } = options;

  return (
    state: NavigationState,
    action: NavigationAction,
  ): NavigationState => {
    switch (action.type) {
      case NavigationActionType.ITEM_SELECT: {
        if (!action.item) return state;
        return {
          ...state,
          selectedItems: findAncestorPath(index, action.item),
          highlightedItems: [],
          currentDepth: action.item.depth,
          isOpen: false,
        };
      }

      case NavigationActionType.ITEM_HIGHLIGHT: {
        if (!action.item) return state;
        return {
          ...state,
          highlightedItems: findAncestorPath(index, action.item),
          currentDepth: action.item.depth,
        };
      }

      case NavigationActionType.OPEN: {
        const firstChild = getFirstEnabledChild(findRootItem(index));
        return {
          ...state,
          isOpen: true,
          highlightedItems: firstChild
            ? findAncestorPath(index, firstChild)
            : [],
          currentDepth: firstChild ? firstChild.depth : 0,
        };
      }

      case NavigationActionType.CLOSE: {
        return {
          ...state,
          isOpen: false,
          highlightedItems: [],
          currentDepth: 0,
          keysSoFar: "",
        };
      }

      case NavigationActionType.TOGGLE: {
        if (state.isOpen) {
          return {
            ...state,
            isOpen: false,
            highlightedItems: [],
            currentDepth: 0,
          };
        }
        const firstChild = getFirstEnabledChild(findRootItem(index));
        return {
          ...state,
          isOpen: true,
          highlightedItems: firstChild
            ? findAncestorPath(index, firstChild)
            : [],
          currentDepth: firstChild ? firstChild.depth : 0,
        };
      }

      case NavigationActionType.ARROW_DOWN:
      case NavigationActionType.ARROW_UP:
      case NavigationActionType.ARROW_LEFT:
      case NavigationActionType.ARROW_RIGHT: {
        return handleArrowKey(state, action.type, index, orientation, wrap);
      }

      case NavigationActionType.HOME: {
        return handleHomeEnd(state, index, "first");
      }

      case NavigationActionType.END: {
        return handleHomeEnd(state, index, "last");
      }

      case NavigationActionType.PAGE_UP: {
        return handlePageJump(state, index, -10, wrap);
      }

      case NavigationActionType.PAGE_DOWN: {
        return handlePageJump(state, index, 10, wrap);
      }

      case NavigationActionType.TYPE_AHEAD: {
        if (!action.inputValue) return state;
        return handleTypeAhead(state, index, action.inputValue);
      }

      case NavigationActionType.CLEAR_TYPE_AHEAD: {
        return { ...state, keysSoFar: "" };
      }

      case NavigationActionType.SET_INPUT_VALUE: {
        return { ...state, inputValue: action.inputValue ?? "" };
      }

      case NavigationActionType.RESET: {
        return action.item
          ? {
              ...state,
              selectedItems: findAncestorPath(index, action.item),
              highlightedItems: [],
              currentDepth: 0,
              isOpen: false,
              inputValue: "",
              keysSoFar: "",
            }
          : {
              ...state,
              selectedItems: [findRootItem(index)],
              highlightedItems: [],
              currentDepth: 0,
              isOpen: false,
              inputValue: "",
              keysSoFar: "",
            };
      }

      default:
        return state;
    }
  };
}

// --- Exported helpers ---

/** Walk parentUrl to build the ancestor path from root to item */
export function findAncestorPath(index: _Index, item: _Item): _Item[] {
  const path: _Item[] = [];
  let current: _Item | undefined = item;
  while (current) {
    path.unshift(current);
    current = current.parentUrl ? index[current.parentUrl] : undefined;
  }
  return path;
}

/** Find the root item (depth 0, parentUrl null) in the index */
export function findRootItem(index: _Index): _Item {
  for (const item of Object.values(index)) {
    if (item.parentUrl === null) return item;
  }
  throw new Error("No root item found in navigation index");
}

/** Find the first non-disabled child of an item */
export function getFirstEnabledChild(item: _Item): _Item | undefined {
  return item.items?.find((child) => !child.disabled);
}

/** Find the last non-disabled child of an item */
export function getLastEnabledChild(item: _Item): _Item | undefined {
  if (!item.items) return undefined;
  for (let i = item.items.length - 1; i >= 0; i--) {
    if (!item.items[i].disabled) return item.items[i];
  }
  return undefined;
}

/** Resolve orientation for a given depth */
export function resolveOrientation(
  config: OrientationConfig,
  depth: number,
): "horizontal" | "vertical" {
  return typeof config === "function" ? config(depth) : config;
}

/** Get the parent item from the index. Returns undefined for root items. */
export function getParentItem(index: _Index, item: _Item): _Item | undefined {
  return item.parentUrl ? index[item.parentUrl] : undefined;
}

// --- Arrow key orientation maps (module-level for v8 coverage) ---

const horizontalArrowMap = {
  [NavigationActionType.ARROW_LEFT]: "prev",
  [NavigationActionType.ARROW_RIGHT]: "next",
  [NavigationActionType.ARROW_UP]: "parent",
  [NavigationActionType.ARROW_DOWN]: "child",
} as const;

const verticalArrowMap = {
  [NavigationActionType.ARROW_UP]: "prev",
  [NavigationActionType.ARROW_DOWN]: "next",
  [NavigationActionType.ARROW_LEFT]: "parent",
  [NavigationActionType.ARROW_RIGHT]: "child",
} as const;

// --- Internal helpers ---

/**
 * Get the next/previous sibling, skipping disabled items.
 * direction: 1 for next, -1 for previous.
 */
function getSibling(
  index: _Index,
  item: _Item,
  direction: 1 | -1,
  wrapEnabled: boolean,
): _Item | undefined {
  const parent = getParentItem(index, item);
  if (!parent?.items) return undefined;

  const siblings = parent.items;
  const currentIndex = siblings.indexOf(item);

  const len = siblings.length;
  let nextIndex = currentIndex + direction;

  for (let i = 0; i < len - 1; i++) {
    if (wrapEnabled) {
      nextIndex = ((nextIndex % len) + len) % len;
    } else if (nextIndex < 0 || nextIndex >= len) {
      return undefined;
    }

    if (!siblings[nextIndex].disabled) {
      return siblings[nextIndex];
    }
    nextIndex += direction;
  }
  return undefined;
}

/**
 * Handle arrow key navigation with orientation remapping and auto-drill.
 */
function handleArrowKey(
  state: NavigationState,
  actionType: NavigationActionType,
  index: _Index,
  orientationConfig: OrientationConfig,
  wrapEnabled: boolean,
): NavigationState {
  const currentItem = state.highlightedItems[state.highlightedItems.length - 1];
  if (!currentItem) return state;

  const orient = resolveOrientation(orientationConfig, currentItem.depth);
  const map = orient === "horizontal" ? horizontalArrowMap : verticalArrowMap;
  const semantic = map[actionType as keyof typeof map];

  switch (semantic) {
    case "prev": {
      const sibling = getSibling(index, currentItem, -1, wrapEnabled);
      if (!sibling) return state;
      // Auto-drill: if deeper and horizontal, drill into new sibling's first child
      if (
        orient === "horizontal" &&
        state.currentDepth > sibling.depth &&
        sibling.items?.length
      ) {
        const child = getFirstEnabledChild(sibling);
        if (child) {
          return {
            ...state,
            highlightedItems: findAncestorPath(index, child),
            currentDepth: child.depth,
          };
        }
      }
      return {
        ...state,
        highlightedItems: findAncestorPath(index, sibling),
        currentDepth: sibling.depth,
      };
    }

    case "next": {
      const sibling = getSibling(index, currentItem, 1, wrapEnabled);
      if (!sibling) return state;
      // Auto-drill
      if (
        orient === "horizontal" &&
        state.currentDepth > sibling.depth &&
        sibling.items?.length
      ) {
        const child = getFirstEnabledChild(sibling);
        if (child) {
          return {
            ...state,
            highlightedItems: findAncestorPath(index, child),
            currentDepth: child.depth,
          };
        }
      }
      return {
        ...state,
        highlightedItems: findAncestorPath(index, sibling),
        currentDepth: sibling.depth,
      };
    }

    case "parent": {
      const parent = getParentItem(index, currentItem);
      if (!parent || parent.depth < 0) return state;
      if (parent.parentUrl === null && currentItem.depth <= 1) return state;
      return {
        ...state,
        highlightedItems: findAncestorPath(index, parent),
        currentDepth: parent.depth,
      };
    }

    case "child": {
      const child = getFirstEnabledChild(currentItem);
      if (!child) return state;
      return {
        ...state,
        highlightedItems: findAncestorPath(index, child),
        currentDepth: child.depth,
      };
    }
  }
}

/** Handle Home/End — jump to first/last item at current depth */
function handleHomeEnd(
  state: NavigationState,
  index: _Index,
  position: "first" | "last",
): NavigationState {
  const currentItem = state.highlightedItems[state.highlightedItems.length - 1];
  if (!currentItem) return state;

  const parent = getParentItem(index, currentItem);
  if (!parent?.items) return state;

  const target =
    position === "first"
      ? getFirstEnabledChild(parent)
      : getLastEnabledChild(parent);

  if (!target) return state;
  return {
    ...state,
    highlightedItems: findAncestorPath(index, target),
    currentDepth: target.depth,
  };
}

/** Handle PageUp/PageDown — jump N items at current depth */
function handlePageJump(
  state: NavigationState,
  index: _Index,
  delta: number,
  wrapEnabled: boolean,
): NavigationState {
  const currentItem = state.highlightedItems[state.highlightedItems.length - 1];
  if (!currentItem) return state;

  const parent = getParentItem(index, currentItem);
  if (!parent?.items) return state;

  const siblings = parent.items;
  const currentIdx = siblings.indexOf(currentItem);

  let targetIdx = currentIdx + delta;
  if (wrapEnabled) {
    targetIdx =
      ((targetIdx % siblings.length) + siblings.length) % siblings.length;
  } else {
    targetIdx = Math.max(0, Math.min(siblings.length - 1, targetIdx));
  }

  const target = siblings[targetIdx];
  if (!target || target.disabled) return state;

  return {
    ...state,
    highlightedItems: findAncestorPath(index, target),
    currentDepth: target.depth,
  };
}

/**
 * Handle type-ahead: append character, match label prefix at current depth.
 * Single-character repeat cycles through items starting with that character.
 */
function handleTypeAhead(
  state: NavigationState,
  index: _Index,
  char: string,
): NavigationState {
  const newKeysSoFar = state.keysSoFar + char;
  const currentItem = state.highlightedItems[state.highlightedItems.length - 1];
  if (!currentItem) return { ...state, keysSoFar: newKeysSoFar };

  const parent = getParentItem(index, currentItem);
  if (!parent?.items) return { ...state, keysSoFar: newKeysSoFar };

  const siblings = parent.items.filter((i) => !i.disabled);
  const search = newKeysSoFar.toLowerCase();

  // Single-character repeat: cycle through items starting with that character
  const isRepeatedChar =
    newKeysSoFar.length > 1 && new Set(newKeysSoFar).size === 1;

  if (isRepeatedChar) {
    const singleChar = search[0];
    const currentIdx = siblings.indexOf(currentItem);
    const startIdx = currentIdx + 1;
    for (let i = 0; i < siblings.length; i++) {
      const idx = (startIdx + i) % siblings.length;
      if (siblings[idx].label?.toLowerCase().startsWith(singleChar)) {
        return {
          ...state,
          keysSoFar: newKeysSoFar,
          highlightedItems: findAncestorPath(index, siblings[idx]),
          currentDepth: siblings[idx].depth,
        };
      }
    }
    return { ...state, keysSoFar: newKeysSoFar };
  }

  // Multi-character: match prefix
  const match = siblings.find((item) =>
    item.label?.toLowerCase().startsWith(search),
  );

  if (match) {
    return {
      ...state,
      keysSoFar: newKeysSoFar,
      highlightedItems: findAncestorPath(index, match),
      currentDepth: match.depth,
    };
  }

  return { ...state, keysSoFar: newKeysSoFar };
}
