import type { _Item } from "@canonical/ds-types";
import { annotateTree, getItemId, prepareIndex } from "@canonical/utils";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { createNavigationReducer, findAncestorPath } from "./reducer.js";
import {
  type ItemProps,
  type MenuProps,
  NavigationActionType,
  type NavigationState,
  type NodeStatus,
  type ToggleProps,
  type UseNavigationTreeProps,
  type UseNavigationTreeResult,
} from "./types.js";

/**
 * Headless navigation state machine for tree-structured navigation items.
 *
 * Manages selection, highlighting, open/close, keyboard traversal, and type-ahead
 * over a WD405 Item tree. Does not render anything — returns prop getters and
 * structural queries. ARIA attributes are applied via separate preset helpers.
 *
 * @param props - Root item, focus strategy, orientation, and other options
 * @returns State, prop getters, node status query, and imperative actions
 */
export default function useNavigationTree(
  props: UseNavigationTreeProps,
): UseNavigationTreeResult {
  const {
    root,
    focus = "roving",
    orientation = "vertical",
    wrap = false,
    stateReducer,
    initialUrl,
    typeAheadTimeout = 700,
  } = props;

  const annotatedRoot = useMemo(() => annotateTree(root), [root]);
  const index = useMemo(() => prepareIndex(annotatedRoot), [annotatedRoot]);

  const initialState = useMemo((): NavigationState => {
    const initialItem = initialUrl ? index[initialUrl] : undefined;
    return {
      selectedItems: initialItem
        ? findAncestorPath(index, initialItem)
        : [annotatedRoot],
      highlightedItems: [],
      currentDepth: 0,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
  }, [annotatedRoot, index, initialUrl]);

  const composedReducer = useMemo(() => {
    const baseReducer = createNavigationReducer(index, { orientation, wrap });
    if (!stateReducer) return baseReducer;
    return (
      state: NavigationState,
      action: {
        type: NavigationActionType;
        item?: _Item;
        inputValue?: string;
      },
    ) => {
      const intermediate = baseReducer(state, action);
      return stateReducer(intermediate, action);
    };
  }, [index, orientation, wrap, stateReducer]);

  const [state, dispatch] = useReducer(composedReducer, initialState);

  const toggleRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const itemRefsMap = useRef<Map<string, HTMLElement>>(new Map());
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rovingTarget = useMemo((): _Item | null => {
    if (focus !== "roving") return null;
    const highlighted =
      state.highlightedItems[state.highlightedItems.length - 1];
    if (highlighted) return highlighted;
    const selected = state.selectedItems[state.selectedItems.length - 1];
    if (selected && selected !== annotatedRoot) return selected;
    const firstChild = annotatedRoot.items?.find((i) => !i.disabled);
    return firstChild ?? null;
  }, [focus, state.highlightedItems, state.selectedItems, annotatedRoot]);

  const getNodeStatus = useCallback(
    (item: _Item): NodeStatus => ({
      selected: state.selectedItems.at(-1) === item,
      inSelectedBranch: state.selectedItems.includes(item),
      highlighted: state.highlightedItems.at(-1) === item,
      inHighlightedBranch: state.highlightedItems.includes(item),
    }),
    [state.selectedItems, state.highlightedItems],
  );

  const selectItem = useCallback(
    (item: _Item) => dispatch({ type: NavigationActionType.ITEM_SELECT, item }),
    [],
  );

  const highlightItem = useCallback(
    (item: _Item) =>
      dispatch({ type: NavigationActionType.ITEM_HIGHLIGHT, item }),
    [],
  );

  const setHighlightedItems = useCallback((items: _Item[]) => {
    if (items.length > 0) {
      dispatch({
        type: NavigationActionType.ITEM_HIGHLIGHT,
        item: items[items.length - 1],
      });
    }
  }, []);

  const setInputValue = useCallback((value: string) => {
    dispatch({
      type: NavigationActionType.SET_INPUT_VALUE,
      inputValue: value,
    });
  }, []);

  const openMenu = useCallback(
    () => dispatch({ type: NavigationActionType.OPEN }),
    [],
  );

  const closeMenu = useCallback(
    () => dispatch({ type: NavigationActionType.CLOSE }),
    [],
  );

  const reset = useCallback(
    () => dispatch({ type: NavigationActionType.RESET }),
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent | KeyboardEvent) => {
      const actionMap: Record<string, NavigationActionType> = {
        ArrowDown: NavigationActionType.ARROW_DOWN,
        ArrowUp: NavigationActionType.ARROW_UP,
        ArrowLeft: NavigationActionType.ARROW_LEFT,
        ArrowRight: NavigationActionType.ARROW_RIGHT,
        Home: NavigationActionType.HOME,
        End: NavigationActionType.END,
        PageUp: NavigationActionType.PAGE_UP,
        PageDown: NavigationActionType.PAGE_DOWN,
        Escape: NavigationActionType.CLOSE,
      };

      if (event.key === "Enter") {
        event.preventDefault();
        const highlighted =
          state.highlightedItems[state.highlightedItems.length - 1];
        if (highlighted) {
          dispatch({
            type: NavigationActionType.ITEM_SELECT,
            item: highlighted,
          });
          toggleRef.current?.focus();
        }
        return;
      }

      const actionType = actionMap[event.key];
      if (actionType) {
        event.preventDefault();
        dispatch({ type: actionType });
        if (event.key === "Escape") {
          toggleRef.current?.focus();
        }
        return;
      }

      // Type-ahead: single printable character
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        dispatch({
          type: NavigationActionType.TYPE_AHEAD,
          inputValue: event.key,
        });
        if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = setTimeout(() => {
          dispatch({ type: NavigationActionType.CLEAR_TYPE_AHEAD });
        }, typeAheadTimeout);
      }
    },
    [state.highlightedItems, typeAheadTimeout],
  );

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  const getToggleProps = useCallback(
    (userProps?: Partial<ToggleProps>): ToggleProps => ({
      ...userProps,
      "aria-expanded": state.isOpen,
      ref: toggleRef,
      onClick: (e: React.SyntheticEvent) => {
        dispatch({ type: NavigationActionType.TOGGLE });
        userProps?.onClick?.(e);
      },
    }),
    [state.isOpen],
  );

  const getMenuProps = useCallback(
    (userProps?: Partial<MenuProps>): MenuProps => ({
      ...userProps,
      ref: composeRefs(userProps?.ref, menuRef),
      tabIndex: focus === "roving" ? -1 : undefined,
      onKeyDown: (e: React.KeyboardEvent) => {
        handleKeyDown(e);
        userProps?.onKeyDown?.(e);
      },
      onMouseLeave: (e: React.SyntheticEvent) => {
        dispatch({ type: NavigationActionType.CLOSE });
        userProps?.onMouseLeave?.(e);
      },
    }),
    [focus, handleKeyDown],
  );

  const getItemProps = useCallback(
    (item: _Item, userProps?: Partial<ItemProps>): ItemProps => {
      const id = getItemId(item);
      const isRovingTarget = rovingTarget === item;
      return {
        ...userProps,
        ...(focus === "roving" ? { tabIndex: isRovingTarget ? 0 : -1 } : {}),
        ref: composeRefs(userProps?.ref, (node: HTMLElement | null) => {
          if (node) {
            itemRefsMap.current.set(id, node);
          } else {
            itemRefsMap.current.delete(id);
          }
        }),
        onClick: (e: React.SyntheticEvent) => {
          e.stopPropagation();
          if (item.disabled) return;
          dispatch({ type: NavigationActionType.ITEM_SELECT, item });
          userProps?.onClick?.(e);
        },
        onMouseMove: (e: React.SyntheticEvent) => {
          e.stopPropagation();
          if (item.disabled) return;
          dispatch({ type: NavigationActionType.ITEM_HIGHLIGHT, item });
          userProps?.onMouseMove?.(e);
        },
      };
    },
    [focus, rovingTarget],
  );

  return {
    ...state,
    annotatedRoot,
    index,
    getNodeStatus,
    getToggleProps,
    getMenuProps,
    getItemProps,
    selectItem,
    highlightItem,
    setHighlightedItems,
    setInputValue,
    openMenu,
    closeMenu,
    reset,
  };
}

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  const activeRefs = refs.filter((ref) => ref !== undefined);

  return (value: T | null) => {
    for (const ref of activeRefs) {
      if (typeof ref === "function") {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}
