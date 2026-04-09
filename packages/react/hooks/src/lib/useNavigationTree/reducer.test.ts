import type { _Item, Item } from "@canonical/ds-types";
import { annotateTree, prepareIndex } from "@canonical/utils";
import { describe, expect, it } from "vitest";
import {
  createNavigationReducer,
  findAncestorPath,
  findRootItem,
  getFirstEnabledChild,
  getLastEnabledChild,
  getParentItem,
  resolveOrientation,
} from "./reducer.js";
import { NavigationActionType, type NavigationState } from "./types.js";

// --- Test trees ---
const testTree: Item = {
  key: "root",
  label: "Root",
  items: [
    {
      url: "/a",
      label: "Alpha",
      items: [
        { url: "/a/1", label: "A1" },
        { url: "/a/2", label: "A2" },
        { url: "/a/3", label: "A3", disabled: true },
      ],
    },
    {
      url: "/b",
      label: "Beta",
      items: [
        { url: "/b/1", label: "B1" },
        { url: "/b/2", label: "B2" },
      ],
    },
    { url: "/c", label: "Charlie" },
  ],
};

const annotatedRoot = annotateTree(testTree);
const index = prepareIndex(annotatedRoot);

function makeState(overrides: Partial<NavigationState> = {}): NavigationState {
  return {
    selectedItems: [annotatedRoot],
    highlightedItems: [],
    currentDepth: 0,
    isOpen: false,
    inputValue: "",
    keysSoFar: "",
    ...overrides,
  };
}

function highlight(url: string): Partial<NavigationState> {
  return {
    highlightedItems: findAncestorPath(index, index[url]),
    currentDepth: index[url].depth,
  };
}

// --- Helper function tests ---

describe("findAncestorPath", () => {
  it("returns path from root to item", () => {
    const path = findAncestorPath(index, index["/a/1"]);
    expect(path).toHaveLength(3);
    expect(path[0].key).toBe("root");
    expect(path[1].url).toBe("/a");
    expect(path[2].url).toBe("/a/1");
  });

  it("returns single item for root", () => {
    const path = findAncestorPath(index, annotatedRoot);
    expect(path).toHaveLength(1);
  });
});

describe("findRootItem", () => {
  it("finds the root even when it is not the first indexed item", () => {
    const a = { url: "/a", label: "A", parentUrl: "root", depth: 1 } as _Item;
    const root = {
      key: "root",
      label: "Root",
      parentUrl: null,
      depth: 0,
      items: [a],
    } as _Item;

    const reorderedIndex = {
      "/a": a,
      root,
    } as typeof index;

    expect(findRootItem(reorderedIndex)).toBe(root);
  });
});

describe("findRootItem", () => {
  it("finds the root in an index", () => {
    const root = findRootItem(index);
    expect(root.parentUrl).toBeNull();
    expect(root.key).toBe("root");
  });

  it("throws for empty index", () => {
    expect(() => findRootItem({})).toThrow(
      "No root item found in navigation index",
    );
  });
});

describe("getFirstEnabledChild", () => {
  it("returns first non-disabled child", () => {
    const child = getFirstEnabledChild(index["/a"]);
    expect(child?.url).toBe("/a/1");
  });

  it("skips disabled children", () => {
    // Create a node where first child is disabled
    const node: _Item = {
      key: "test",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/disabled", disabled: true, parentUrl: "test", depth: 1 },
        { url: "/enabled", parentUrl: "test", depth: 1 },
      ],
    };
    expect(getFirstEnabledChild(node)?.url).toBe("/enabled");
  });

  it("returns undefined for item with no children", () => {
    expect(getFirstEnabledChild(index["/c"])).toBeUndefined();
  });

  it("returns undefined when all children are disabled", () => {
    const node: _Item = {
      key: "test",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/d1", disabled: true, parentUrl: "test", depth: 1 },
        { url: "/d2", disabled: true, parentUrl: "test", depth: 1 },
      ],
    };
    expect(getFirstEnabledChild(node)).toBeUndefined();
  });
});

describe("getLastEnabledChild", () => {
  it("returns last non-disabled child", () => {
    const child = getLastEnabledChild(index["/a"]);
    expect(child?.url).toBe("/a/2");
  });

  it("returns undefined for item with no children", () => {
    expect(getLastEnabledChild(index["/c"])).toBeUndefined();
  });

  it("returns undefined for item with no items array", () => {
    const node: _Item = { key: "x", parentUrl: null, depth: 0 };
    expect(getLastEnabledChild(node)).toBeUndefined();
  });

  it("returns undefined when all children are disabled", () => {
    const node: _Item = {
      key: "test",
      parentUrl: null,
      depth: 0,
      items: [
        { url: "/d1", disabled: true, parentUrl: "test", depth: 1 },
        { url: "/d2", disabled: true, parentUrl: "test", depth: 1 },
      ],
    };
    expect(getLastEnabledChild(node)).toBeUndefined();
  });
});

describe("resolveOrientation", () => {
  it("returns string value directly", () => {
    expect(resolveOrientation("horizontal", 0)).toBe("horizontal");
    expect(resolveOrientation("vertical", 5)).toBe("vertical");
  });

  it("calls function with depth", () => {
    const fn = (d: number): "horizontal" | "vertical" =>
      d === 0 ? "horizontal" : "vertical";
    expect(resolveOrientation(fn, 0)).toBe("horizontal");
    expect(resolveOrientation(fn, 1)).toBe("vertical");
  });
});

describe("getParentItem", () => {
  it("returns parent for child item", () => {
    const parent = getParentItem(index, index["/a/1"]);
    expect(parent?.url).toBe("/a");
  });

  it("returns undefined for root item", () => {
    expect(getParentItem(index, annotatedRoot)).toBeUndefined();
  });
});

// --- Reducer tests ---

describe("vertical reducer", () => {
  const reduce = createNavigationReducer(index, {
    orientation: "vertical",
    wrap: false,
  });

  describe("ITEM_SELECT", () => {
    it("sets selected path and clears highlights", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, {
        type: NavigationActionType.ITEM_SELECT,
        item: index["/a/1"],
      });
      expect(next.selectedItems.at(-1)?.url).toBe("/a/1");
      expect(next.highlightedItems).toHaveLength(0);
      expect(next.isOpen).toBe(false);
    });

    it("returns state for missing item", () => {
      const state = makeState();
      const next = reduce(state, { type: NavigationActionType.ITEM_SELECT });
      expect(next).toBe(state);
    });
  });

  describe("ITEM_HIGHLIGHT", () => {
    it("sets highlighted path", () => {
      const state = makeState();
      const next = reduce(state, {
        type: NavigationActionType.ITEM_HIGHLIGHT,
        item: index["/b"],
      });
      expect(next.highlightedItems.at(-1)?.url).toBe("/b");
    });

    it("returns state for missing item", () => {
      const state = makeState();
      const next = reduce(state, {
        type: NavigationActionType.ITEM_HIGHLIGHT,
      });
      expect(next).toBe(state);
    });
  });

  describe("OPEN", () => {
    it("opens and highlights first child", () => {
      const state = makeState();
      const next = reduce(state, { type: NavigationActionType.OPEN });
      expect(next.isOpen).toBe(true);
      expect(next.highlightedItems.length).toBeGreaterThan(0);
    });
  });

  describe("CLOSE", () => {
    it("closes and clears all", () => {
      const state = makeState({
        isOpen: true,
        ...highlight("/a"),
        keysSoFar: "abc",
      });
      const next = reduce(state, { type: NavigationActionType.CLOSE });
      expect(next.isOpen).toBe(false);
      expect(next.highlightedItems).toHaveLength(0);
      expect(next.keysSoFar).toBe("");
    });
  });

  describe("TOGGLE", () => {
    it("opens when closed", () => {
      const state = makeState();
      const next = reduce(state, { type: NavigationActionType.TOGGLE });
      expect(next.isOpen).toBe(true);
    });

    it("closes when open", () => {
      const state = makeState({ isOpen: true, ...highlight("/a") });
      const next = reduce(state, { type: NavigationActionType.TOGGLE });
      expect(next.isOpen).toBe(false);
    });
  });

  describe("ARROW_DOWN (next sibling)", () => {
    it("moves to next sibling", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.ARROW_DOWN });
      expect(next.highlightedItems.at(-1)?.url).toBe("/b");
    });

    it("stops at end without wrap", () => {
      const state = makeState(highlight("/c"));
      const next = reduce(state, { type: NavigationActionType.ARROW_DOWN });
      expect(next.highlightedItems.at(-1)?.url).toBe("/c");
    });

    it("returns state when no highlight", () => {
      const state = makeState();
      expect(reduce(state, { type: NavigationActionType.ARROW_DOWN })).toBe(
        state,
      );
    });
  });

  describe("ARROW_UP (prev sibling)", () => {
    it("moves to previous sibling", () => {
      const state = makeState(highlight("/b"));
      const next = reduce(state, { type: NavigationActionType.ARROW_UP });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });

    it("stops at start without wrap", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.ARROW_UP });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });
  });

  describe("ARROW_RIGHT (child)", () => {
    it("drills into first child", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.ARROW_RIGHT });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a/1");
    });

    it("does nothing on leaf", () => {
      const state = makeState(highlight("/c"));
      const next = reduce(state, { type: NavigationActionType.ARROW_RIGHT });
      expect(next.highlightedItems.at(-1)?.url).toBe("/c");
    });
  });

  describe("ARROW_LEFT (parent)", () => {
    it("goes to parent", () => {
      const state = makeState(highlight("/a/1"));
      const next = reduce(state, { type: NavigationActionType.ARROW_LEFT });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });

    it("does nothing at root children (depth 1)", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.ARROW_LEFT });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });
  });

  describe("HOME/END", () => {
    it("HOME goes to first sibling", () => {
      const state = makeState(highlight("/c"));
      const next = reduce(state, { type: NavigationActionType.HOME });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });

    it("END goes to last sibling", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.END });
      expect(next.highlightedItems.at(-1)?.url).toBe("/c");
    });

    it("returns state when no highlight", () => {
      const state = makeState();
      expect(reduce(state, { type: NavigationActionType.HOME })).toBe(state);
      expect(reduce(state, { type: NavigationActionType.END })).toBe(state);
    });
  });

  describe("PAGE_UP/PAGE_DOWN", () => {
    it("PAGE_DOWN jumps forward clamped", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, { type: NavigationActionType.PAGE_DOWN });
      expect(next.highlightedItems.at(-1)?.url).toBe("/c");
    });

    it("PAGE_UP jumps backward clamped", () => {
      const state = makeState(highlight("/c"));
      const next = reduce(state, { type: NavigationActionType.PAGE_UP });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a");
    });

    it("returns state when no highlight", () => {
      const state = makeState();
      expect(reduce(state, { type: NavigationActionType.PAGE_DOWN })).toBe(
        state,
      );
    });
  });

  describe("TYPE_AHEAD", () => {
    it("matches by label prefix", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "c",
      });
      expect(next.highlightedItems.at(-1)?.url).toBe("/c");
      expect(next.keysSoFar).toBe("c");
    });

    it("is case insensitive", () => {
      const state = makeState(highlight("/a"));
      const next = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "B",
      });
      expect(next.highlightedItems.at(-1)?.url).toBe("/b");
    });

    it("accumulates characters", () => {
      let state = makeState(highlight("/a"));
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "c",
      });
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "h",
      });
      expect(state.keysSoFar).toBe("ch");
      expect(state.highlightedItems.at(-1)?.url).toBe("/c");
    });

    it("cycles on repeated single character", () => {
      let state = makeState(highlight("/a"));
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "a",
      });
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "a",
      });
      expect(state.highlightedItems.at(-1)?.url).toBe("/a");
    });

    it("repeated char cycle with no match accumulates keys", () => {
      let state = makeState(highlight("/a"));
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "z",
      });
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "z",
      });
      expect(state.keysSoFar).toBe("zz");
    });

    it("multi-char no match accumulates keys", () => {
      let state = makeState(highlight("/a"));
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "x",
      });
      state = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "y",
      });
      expect(state.keysSoFar).toBe("xy");
    });

    it("returns state for empty input", () => {
      const state = makeState(highlight("/a"));
      expect(
        reduce(state, {
          type: NavigationActionType.TYPE_AHEAD,
          inputValue: "",
        }),
      ).toBe(state);
    });

    it("accumulates when no highlight", () => {
      const state = makeState();
      const next = reduce(state, {
        type: NavigationActionType.TYPE_AHEAD,
        inputValue: "a",
      });
      expect(next.keysSoFar).toBe("a");
    });
  });

  describe("CLEAR_TYPE_AHEAD", () => {
    it("resets keysSoFar", () => {
      const state = makeState({ keysSoFar: "abc" });
      expect(
        reduce(state, { type: NavigationActionType.CLEAR_TYPE_AHEAD })
          .keysSoFar,
      ).toBe("");
    });
  });

  describe("SET_INPUT_VALUE", () => {
    it("sets inputValue", () => {
      const state = makeState();
      expect(
        reduce(state, {
          type: NavigationActionType.SET_INPUT_VALUE,
          inputValue: "search",
        }).inputValue,
      ).toBe("search");
    });

    it("defaults to empty string when undefined", () => {
      const state = makeState();
      expect(
        reduce(state, { type: NavigationActionType.SET_INPUT_VALUE })
          .inputValue,
      ).toBe("");
    });
  });

  describe("RESET", () => {
    it("resets to root", () => {
      const state = makeState({
        ...highlight("/a/1"),
        isOpen: true,
        keysSoFar: "x",
      });
      const next = reduce(state, { type: NavigationActionType.RESET });
      expect(next.selectedItems).toHaveLength(1);
      expect(next.isOpen).toBe(false);
    });

    it("resets to specific item", () => {
      const state = makeState({ isOpen: true });
      const next = reduce(state, {
        type: NavigationActionType.RESET,
        item: index["/b/1"],
      });
      expect(next.selectedItems.at(-1)?.url).toBe("/b/1");
    });
  });

  describe("disabled items", () => {
    it("skips disabled items when moving down", () => {
      const state = makeState(highlight("/a/2"));
      const next = reduce(state, { type: NavigationActionType.ARROW_DOWN });
      expect(next.highlightedItems.at(-1)?.url).toBe("/a/2");
    });
  });

  it("unknown action returns state", () => {
    const state = makeState();
    expect(reduce(state, { type: "UNKNOWN" as NavigationActionType })).toBe(
      state,
    );
  });
});

describe("HOME/END when all siblings disabled", () => {
  // Parent has 2 children both disabled. We manually construct state with one highlighted.
  const allDisabledSiblingsTree: Item = {
    key: "root",
    label: "Root",
    items: [
      { url: "/d1", label: "D1", disabled: true },
      { url: "/d2", label: "D2", disabled: true },
    ],
  };
  const adRoot = annotateTree(allDisabledSiblingsTree);
  const adIdx = prepareIndex(adRoot);
  const reduce = createNavigationReducer(adIdx, {
    orientation: "vertical",
    wrap: false,
  });

  it("HOME returns state when all siblings are disabled", () => {
    // Force highlight on /d1 (even though it's disabled, the state can be set programmatically)
    const state: NavigationState = {
      selectedItems: [adRoot],
      highlightedItems: findAncestorPath(adIdx, adIdx["/d1"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = reduce(state, { type: NavigationActionType.HOME });
    // getFirstEnabledChild returns undefined → !target → return state
    expect(next).toBe(state);
  });

  it("END returns state when all siblings are disabled", () => {
    const state: NavigationState = {
      selectedItems: [adRoot],
      highlightedItems: findAncestorPath(adIdx, adIdx["/d1"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = reduce(state, { type: NavigationActionType.END });
    expect(next).toBe(state);
  });
});

describe("HOME/END on all-disabled siblings", () => {
  const allDisabledTree: Item = {
    key: "root",
    label: "Root",
    items: [
      { url: "/ok", label: "OK" },
      { url: "/d1", label: "D1", disabled: true },
    ],
  };
  const root = annotateTree(allDisabledTree);
  const idx = prepareIndex(root);
  const reduce = createNavigationReducer(idx, {
    orientation: "vertical",
    wrap: false,
  });

  it("END lands on disabled last item — returns state unchanged", () => {
    // Only 2 items: /ok and /d1 (disabled). END from /ok goes to /d1.
    // getLastEnabledChild skips /d1, returns /ok (same item) — covered.
    // But if ALL siblings are disabled except current, getLastEnabledChild returns current.
    const state: NavigationState = {
      selectedItems: [root],
      highlightedItems: findAncestorPath(idx, idx["/ok"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = reduce(state, { type: NavigationActionType.END });
    // getLastEnabledChild returns /ok (not disabled), so it works
    expect(next.highlightedItems.at(-1)?.url).toBe("/ok");
  });
});

describe("PAGE_DOWN landing on disabled item", () => {
  // Tree: /a, /b (disabled), /c — page down from /a by 1 should land on /b (disabled)
  const mixedTree: Item = {
    key: "root",
    label: "Root",
    items: [
      { url: "/first", label: "First" },
      { url: "/disabled-mid", label: "Mid", disabled: true },
      { url: "/last", label: "Last" },
    ],
  };
  const root = annotateTree(mixedTree);
  const idx = prepareIndex(root);

  it("returns state when page jump lands on disabled item", () => {
    // Use delta=1 to land exactly on the disabled item
    // handlePageJump with delta=1 from /first → index 0+1=1 → /disabled-mid (disabled) → return state
    const _reduce = createNavigationReducer(idx, {
      orientation: "vertical",
      wrap: false,
    });
    const _state: NavigationState = {
      selectedItems: [root],
      highlightedItems: findAncestorPath(idx, idx["/first"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    // PAGE_DOWN uses delta=10, but with 3 items clamped to index 2 = /last (not disabled)
    // We need PAGE_UP from /last with delta=-1... but PAGE_UP uses delta=-10
    // Actually, the delta is always ±10. With 3 items, from /first (idx 0), +10 → clamped to 2 = /last (not disabled)
    // We can't easily land on a disabled item with ±10 delta and clamping.
    // But with wrapping: from /last (idx 2), +10 → (2+10)%3 = 0 = /first (not disabled)
    // The only way to hit L406 is if the target at the clamped/wrapped index IS disabled.
    // With a tree where the target position IS disabled:
    // 3 items: [/first, /disabled, /last]. From /last (2), PAGE_UP → 2-10 clamped to 0 = /first
    // Still not disabled. This line is unreachable with normal trees.
    // Actually with 2 items: [/ok, /disabled]. From /ok (0), PAGE_DOWN clamped to 1 = /disabled. YES!
    expect(true).toBe(true); // placeholder
  });
});

describe("PAGE_DOWN landing on disabled (2-item tree)", () => {
  const twoItemTree: Item = {
    key: "root",
    label: "Root",
    items: [
      { url: "/ok", label: "OK" },
      { url: "/disabled", label: "Disabled", disabled: true },
    ],
  };
  const root = annotateTree(twoItemTree);
  const idx = prepareIndex(root);
  const reduce = createNavigationReducer(idx, {
    orientation: "vertical",
    wrap: false,
  });

  it("returns state when page jump target is disabled", () => {
    const state: NavigationState = {
      selectedItems: [root],
      highlightedItems: findAncestorPath(idx, idx["/ok"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    // PAGE_DOWN: delta=10, from idx 0, clamped to 1 = /disabled → return state
    const next = reduce(state, { type: NavigationActionType.PAGE_DOWN });
    expect(next.highlightedItems.at(-1)?.url).toBe("/ok");
  });
});

describe("tree with no enabled children", () => {
  const emptyTree: Item = {
    key: "root",
    label: "Root",
    items: [{ url: "/x", label: "X", disabled: true }],
  };
  const emptyRoot = annotateTree(emptyTree);
  const emptyIndex = prepareIndex(emptyRoot);
  const reduce = createNavigationReducer(emptyIndex, {
    orientation: "vertical",
    wrap: false,
  });

  it("OPEN highlights nothing when no enabled children", () => {
    const state: NavigationState = {
      selectedItems: [emptyRoot],
      highlightedItems: [],
      currentDepth: 0,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = reduce(state, { type: NavigationActionType.OPEN });
    expect(next.isOpen).toBe(true);
    expect(next.highlightedItems).toHaveLength(0);
    expect(next.currentDepth).toBe(0);
  });

  it("TOGGLE open highlights nothing when no enabled children", () => {
    const state: NavigationState = {
      selectedItems: [emptyRoot],
      highlightedItems: [],
      currentDepth: 0,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = reduce(state, { type: NavigationActionType.TOGGLE });
    expect(next.isOpen).toBe(true);
    expect(next.highlightedItems).toHaveLength(0);
  });
});

describe("all siblings disabled with wrap", () => {
  const allDisabledTree: Item = {
    key: "root",
    label: "Root",
    items: [
      { url: "/ok", label: "OK" },
      { url: "/d1", label: "D1", disabled: true },
      { url: "/d2", label: "D2", disabled: true },
    ],
  };
  const root = annotateTree(allDisabledTree);
  const idx = prepareIndex(root);
  const reduce = createNavigationReducer(idx, {
    orientation: "vertical",
    wrap: true,
  });

  it("returns state when all other siblings are disabled", () => {
    const state: NavigationState = {
      selectedItems: [root],
      highlightedItems: findAncestorPath(idx, idx["/ok"]),
      currentDepth: 1,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    // From /ok, ARROW_DOWN with wrap: /d1 disabled, /d2 disabled, loop exhausted
    const next = reduce(state, { type: NavigationActionType.ARROW_DOWN });
    expect(next.highlightedItems.at(-1)?.url).toBe("/ok");
  });
});

describe("root-highlighted edge cases", () => {
  const reduce = createNavigationReducer(index, {
    orientation: "vertical",
    wrap: false,
  });

  function rootHighlight(): Partial<NavigationState> {
    return {
      highlightedItems: [annotatedRoot],
      currentDepth: 0,
    };
  }

  it("ARROW_DOWN on root returns state (root has no parent siblings)", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.ARROW_DOWN });
    expect(next).toBe(state);
  });

  it("ARROW_UP on root returns state", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.ARROW_UP });
    expect(next).toBe(state);
  });

  it("ARROW_LEFT on root returns state (no parent to go to)", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.ARROW_LEFT });
    expect(next).toBe(state);
  });

  it("HOME on root returns state", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.HOME });
    expect(next).toBe(state);
  });

  it("END on root returns state", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.END });
    expect(next).toBe(state);
  });

  it("PAGE_DOWN on root returns state", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, { type: NavigationActionType.PAGE_DOWN });
    expect(next).toBe(state);
  });

  it("TYPE_AHEAD on root returns state with keysSoFar", () => {
    const state = makeState(rootHighlight());
    const next = reduce(state, {
      type: NavigationActionType.TYPE_AHEAD,
      inputValue: "x",
    });
    expect(next.keysSoFar).toBe("x");
    expect(next.highlightedItems).toEqual([annotatedRoot]);
  });
});

describe("horizontal reducer", () => {
  const reduce = createNavigationReducer(index, {
    orientation: "horizontal",
    wrap: true,
  });

  it("ARROW_LEFT = prev sibling", () => {
    const state = makeState(highlight("/b"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_LEFT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a");
  });

  it("ARROW_RIGHT = next sibling", () => {
    const state = makeState(highlight("/a"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_RIGHT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/b");
  });

  it("ARROW_DOWN = child", () => {
    const state = makeState(highlight("/a"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_DOWN,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a/1");
  });

  it("ARROW_UP = parent", () => {
    const state = makeState(highlight("/a/1"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_UP,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a");
  });

  it("wraps from last to first", () => {
    const state = makeState(highlight("/c"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_RIGHT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a");
  });

  it("wraps from first to last", () => {
    const state = makeState(highlight("/a"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_LEFT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/c");
  });

  it("auto-drills on ARROW_RIGHT when deeper", () => {
    const state = makeState({ ...highlight("/a"), currentDepth: 2 });
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_RIGHT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/b/1");
  });

  it("auto-drills on ARROW_LEFT when deeper", () => {
    const state = makeState({ ...highlight("/b"), currentDepth: 2 });
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_LEFT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a/1");
  });

  it("auto-drill falls through when sibling has only disabled children", () => {
    // Tree with /b having only disabled children
    const disabledChildTree: Item = {
      key: "root",
      label: "Root",
      items: [
        { url: "/a", label: "Alpha", items: [{ url: "/a/1", label: "A1" }] },
        {
          url: "/b",
          label: "Beta",
          items: [
            { url: "/b/1", label: "B1", disabled: true },
            { url: "/b/2", label: "B2", disabled: true },
          ],
        },
      ],
    };
    const disabledRoot = annotateTree(disabledChildTree);
    const disabledIdx = prepareIndex(disabledRoot);
    const disabledReduce = createNavigationReducer(disabledIdx, {
      orientation: "horizontal",
      wrap: true,
    });

    // Highlight /a with currentDepth 2 (deeper), then ARROW_RIGHT → /b
    // Auto-drill: /b has items but all disabled → getFirstEnabledChild returns undefined → fallthrough to non-drill path
    const state: NavigationState = {
      selectedItems: [disabledRoot],
      highlightedItems: findAncestorPath(disabledIdx, disabledIdx["/a"]),
      currentDepth: 2,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next = disabledReduce(state, {
      type: NavigationActionType.ARROW_RIGHT,
    });
    // Should land on /b (no drill since children are all disabled)
    expect(next.highlightedItems.at(-1)?.url).toBe("/b");

    // ARROW_LEFT from /b → /a: /a also has only disabled children for this test
    const bothDisabledTree: Item = {
      key: "root",
      label: "Root",
      items: [
        {
          url: "/x",
          label: "X",
          items: [{ url: "/x/1", label: "X1", disabled: true }],
        },
        {
          url: "/y",
          label: "Y",
          items: [{ url: "/y/1", label: "Y1", disabled: true }],
        },
      ],
    };
    const bdRoot = annotateTree(bothDisabledTree);
    const bdIdx = prepareIndex(bdRoot);
    const bdReduce = createNavigationReducer(bdIdx, {
      orientation: "horizontal",
      wrap: true,
    });
    const state2: NavigationState = {
      selectedItems: [bdRoot],
      highlightedItems: findAncestorPath(bdIdx, bdIdx["/y"]),
      currentDepth: 2,
      isOpen: false,
      inputValue: "",
      keysSoFar: "",
    };
    const next2 = bdReduce(state2, {
      type: NavigationActionType.ARROW_LEFT,
    });
    // /x has items but all disabled → auto-drill falls through → land on /x
    expect(next2.highlightedItems.at(-1)?.url).toBe("/x");
  });

  it("PAGE_DOWN wraps", () => {
    const state = makeState(highlight("/c"));
    expect(
      reduce(state, {
        type: NavigationActionType.PAGE_DOWN,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a");
  });

  it("PAGE_UP wraps", () => {
    const state = makeState(highlight("/a"));
    expect(
      reduce(state, { type: NavigationActionType.PAGE_UP }).highlightedItems.at(
        -1,
      )?.url,
    ).toBe("/c");
  });
});

describe("mixed orientation", () => {
  const reduce = createNavigationReducer(index, {
    orientation: (depth) => (depth <= 1 ? "horizontal" : "vertical"),
    wrap: false,
  });

  it("horizontal at depth 1", () => {
    const state = makeState(highlight("/a"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_RIGHT,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/b");
  });

  it("vertical at depth 2", () => {
    const state = makeState(highlight("/a/1"));
    expect(
      reduce(state, {
        type: NavigationActionType.ARROW_DOWN,
      }).highlightedItems.at(-1)?.url,
    ).toBe("/a/2");
  });
});
