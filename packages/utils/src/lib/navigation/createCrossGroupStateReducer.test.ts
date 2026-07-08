import type { Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { annotateTree } from "./annotateTree.js";
import createCrossGroupStateReducer from "./createCrossGroupStateReducer.js";
import findAncestorPath from "./findAncestorPath.js";
import {
  type NavigationAction,
  NavigationActionType,
  type NavigationState,
} from "./navigationTypes.js";
import { prepareIndex } from "./prepareIndex.js";

// root -> group -> item. Two groups of two items each.
const buildTree = () => {
  const root: Item = {
    key: "root",
    items: [
      {
        key: "group-a",
        items: [
          { key: "a1", label: "A one", url: "/a1" },
          { key: "a2", label: "A two", url: "/a2" },
        ],
      },
      {
        key: "group-b",
        items: [
          { key: "b1", label: "B one", url: "/b1" },
          { key: "b2", label: "B two", url: "/b2" },
        ],
      },
    ],
  };
  const index = prepareIndex(annotateTree(root));
  return { index };
};

const stateHighlighting = (
  index: ReturnType<typeof buildTree>["index"],
  url: string,
): NavigationState => {
  const item = index[url];
  if (!item) throw new Error(`test item ${url} not found`);
  return {
    selectedItems: [],
    highlightedItems: findAncestorPath(index, item),
    currentDepth: item.depth,
    isOpen: true,
    inputValue: "",
    keysSoFar: "",
  };
};

const arrow = (type: NavigationActionType): NavigationAction =>
  ({ type }) as NavigationAction;

describe("createCrossGroupStateReducer", () => {
  it("moves to the first item of the next group on ArrowDown at a group's last item", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const next = reducer(
      stateHighlighting(index, "/a2"),
      arrow(NavigationActionType.ARROW_DOWN),
    );
    expect(next.highlightedItems.at(-1)?.key).toBe("b1");
  });

  it("moves to the last item of the previous group on ArrowUp at a group's first item", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const prev = reducer(
      stateHighlighting(index, "/b1"),
      arrow(NavigationActionType.ARROW_UP),
    );
    expect(prev.highlightedItems.at(-1)?.key).toBe("a2");
  });

  it("does not move when the item is mid-group (base reducer handles it)", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const state = stateHighlighting(index, "/a1");
    expect(reducer(state, arrow(NavigationActionType.ARROW_DOWN))).toBe(state);
  });

  it("does not move past the last group on ArrowDown", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const state = stateHighlighting(index, "/b2");
    expect(reducer(state, arrow(NavigationActionType.ARROW_DOWN))).toBe(state);
  });

  it("does not move before the first group on ArrowUp", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const state = stateHighlighting(index, "/a1");
    expect(reducer(state, arrow(NavigationActionType.ARROW_UP))).toBe(state);
  });

  it("ignores non-vertical actions", () => {
    const { index } = buildTree();
    const reducer = createCrossGroupStateReducer();
    const state = stateHighlighting(index, "/a2");
    expect(reducer(state, arrow(NavigationActionType.ARROW_RIGHT))).toBe(state);
    expect(reducer(state, arrow(NavigationActionType.HOME))).toBe(state);
  });

  it("returns state unchanged when nothing is highlighted", () => {
    const reducer = createCrossGroupStateReducer();
    const state: NavigationState = {
      selectedItems: [],
      highlightedItems: [],
      currentDepth: 0,
      isOpen: true,
      inputValue: "",
      keysSoFar: "",
    };
    expect(reducer(state, arrow(NavigationActionType.ARROW_DOWN))).toBe(state);
  });

  it("returns state unchanged when the highlighted node is the root (no parent group)", () => {
    const root: Item = {
      key: "root",
      items: [{ key: "group-a", items: [{ key: "a1", url: "/a1" }] }],
    };
    const index = prepareIndex(annotateTree(root));
    const reducer = createCrossGroupStateReducer();
    const rootItem = index.root;
    if (!rootItem) throw new Error("root not found");
    const state: NavigationState = {
      selectedItems: [],
      // Highlight the root itself — getParentItem returns undefined for it.
      highlightedItems: [rootItem],
      currentDepth: 0,
      isOpen: true,
      inputValue: "",
      keysSoFar: "",
    };
    expect(reducer(state, arrow(NavigationActionType.ARROW_DOWN))).toBe(state);
  });

  it("does not cross into an adjacent group that has no enabled items", () => {
    const root: Item = {
      key: "root",
      items: [
        { key: "group-a", items: [{ key: "a1", label: "A1", url: "/a1" }] },
        // An empty group offers no landing item.
        { key: "group-empty", items: [] },
      ],
    };
    const index = prepareIndex(annotateTree(root));
    const reducer = createCrossGroupStateReducer();
    expect(
      reducer(
        stateHighlighting(index, "/a1"),
        arrow(NavigationActionType.ARROW_DOWN),
      ).highlightedItems.at(-1)?.key,
    ).toBe("a1");
  });

  it("skips a disabled adjacent group", () => {
    const root: Item = {
      key: "root",
      items: [
        { key: "group-a", items: [{ key: "a1", label: "A1", url: "/a1" }] },
        {
          key: "group-b",
          disabled: true,
          items: [{ key: "b1", label: "B1", url: "/b1" }],
        },
        { key: "group-c", items: [{ key: "c1", label: "C1", url: "/c1" }] },
      ],
    };
    const index = prepareIndex(annotateTree(root));
    const reducer = createCrossGroupStateReducer();
    const next = reducer(
      stateHighlighting(index, "/a1"),
      arrow(NavigationActionType.ARROW_DOWN),
    );
    expect(next.highlightedItems.at(-1)?.key).toBe("c1");
  });

  describe("type-ahead across groups", () => {
    // The reducer reads `keysSoFar` off state (set below), not the action.
    const typeAhead = (): NavigationAction =>
      ({ type: NavigationActionType.TYPE_AHEAD }) as NavigationAction;

    const withKeys = (
      state: NavigationState,
      keysSoFar: string,
    ): NavigationState => ({ ...state, keysSoFar });

    it("jumps to a matching item in another group", () => {
      const { index } = buildTree();
      const reducer = createCrossGroupStateReducer();
      // Highlight "A one"; typing "b" should reach "B one" in the next group
      // (the base reducer only searches the current group and finds nothing).
      const state = withKeys(stateHighlighting(index, "/a1"), "b");
      const next = reducer(state, typeAhead());
      expect(next.highlightedItems.at(-1)?.key).toBe("b1");
      expect(next.highlightedItems.at(-2)?.key).toBe("group-b");
    });

    it("leaves the highlight when the current item already matches", () => {
      const { index } = buildTree();
      const reducer = createCrossGroupStateReducer();
      // "A one" already matches "a" — the base reducer handled it in-group.
      const state = withKeys(stateHighlighting(index, "/a1"), "a");
      expect(reducer(state, typeAhead())).toBe(state);
    });

    it("wraps around to an earlier group", () => {
      const { index } = buildTree();
      const reducer = createCrossGroupStateReducer();
      // From "B two", typing "a" wraps forward past the end to "A one".
      const state = withKeys(stateHighlighting(index, "/b2"), "a");
      const next = reducer(state, typeAhead());
      expect(next.highlightedItems.at(-1)?.key).toBe("a1");
    });

    it("no-ops when nothing matches", () => {
      const { index } = buildTree();
      const reducer = createCrossGroupStateReducer();
      const state = withKeys(stateHighlighting(index, "/a1"), "z");
      expect(reducer(state, typeAhead())).toBe(state);
    });

    it("no-ops with an empty search", () => {
      const { index } = buildTree();
      const reducer = createCrossGroupStateReducer();
      const state = stateHighlighting(index, "/a1"); // keysSoFar: ""
      expect(reducer(state, typeAhead())).toBe(state);
    });

    it("no-ops when nothing is highlighted", () => {
      const reducer = createCrossGroupStateReducer();
      const state: NavigationState = {
        selectedItems: [],
        highlightedItems: [],
        currentDepth: 0,
        isOpen: true,
        inputValue: "",
        keysSoFar: "a",
      };
      expect(reducer(state, typeAhead())).toBe(state);
    });

    it("skips disabled items when matching across groups", () => {
      const root: Item = {
        key: "root",
        items: [
          { key: "group-a", items: [{ key: "a1", label: "Alpha", url: "/a1" }] },
          {
            key: "group-b",
            items: [
              { key: "b1", label: "Bravo", disabled: true, url: "/b1" },
              { key: "b2", label: "Bongo", url: "/b2" },
            ],
          },
        ],
      };
      const index = prepareIndex(annotateTree(root));
      const reducer = createCrossGroupStateReducer();
      const state = withKeys(stateHighlighting(index, "/a1"), "b");
      // "Bravo" is disabled → the match is the enabled "Bongo".
      const next = reducer(state, typeAhead());
      expect(next.highlightedItems.at(-1)?.key).toBe("b2");
    });

    it("skips disabled and empty groups when matching across groups", () => {
      const root: Item = {
        key: "root",
        items: [
          { key: "group-a", items: [{ key: "a1", label: "Alpha", url: "/a1" }] },
          // A disabled group and an empty group are both passed over.
          {
            key: "group-dis",
            disabled: true,
            items: [{ key: "d1", label: "Bad", url: "/d1" }],
          },
          { key: "group-empty" },
          { key: "group-c", items: [{ key: "c1", label: "Bongo", url: "/c1" }] },
        ],
      };
      const index = prepareIndex(annotateTree(root));
      const reducer = createCrossGroupStateReducer();
      const state = withKeys(stateHighlighting(index, "/a1"), "b");
      const next = reducer(state, typeAhead());
      expect(next.highlightedItems.at(-1)?.key).toBe("c1");
    });
  });
});
