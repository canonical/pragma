import type { _Index, _Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import type { UseNavigationTreeResult } from "../types.js";
import getDisclosureItemProps from "./getDisclosureItemProps.js";
import getDisclosureToggleProps from "./getDisclosureToggleProps.js";
import getMenubarItemProps from "./getMenubarItemProps.js";
import getMenubarListItemProps from "./getMenubarListItemProps.js";
import getMenubarMenuProps from "./getMenubarMenuProps.js";
import getNavigationItemProps from "./getNavigationItemProps.js";
import getTreeItemProps from "./getTreeItemProps.js";
import getTreeListItemProps from "./getTreeListItemProps.js";
import getTreeMenuProps from "./getTreeMenuProps.js";

// Minimal mock of UseNavigationTreeResult for pure function testing
function createMockNav(
  overrides: Partial<UseNavigationTreeResult> = {},
): UseNavigationTreeResult {
  const root: _Item = {
    key: "root",
    label: "Root",
    parentUrl: null,
    depth: 0,
    items: [
      {
        url: "/a",
        label: "A",
        parentUrl: "root",
        depth: 1,
        items: [
          { url: "/a/1", label: "A1", parentUrl: "/a", depth: 2 },
          { url: "/a/2", label: "A2", parentUrl: "/a", depth: 2 },
        ],
      },
      { url: "/b", label: "B", parentUrl: "root", depth: 1 },
    ],
  };

  const index: _Index = {
    root,
    "/a": root.items![0],
    "/a/1": root.items![0].items![0] as _Item,
    "/a/2": root.items![0].items![1] as _Item,
    "/b": root.items![1],
  };

  return {
    selectedItems: [root],
    highlightedItems: [],
    currentDepth: 0,
    isOpen: false,
    inputValue: "",
    keysSoFar: "",
    annotatedRoot: root,
    index,
    getNodeStatus: (_item: _Item) => ({
      selected: false,
      inSelectedBranch: false,
      highlighted: false,
      inHighlightedBranch: false,
    }),
    getToggleProps: () => ({}),
    getMenuProps: () => ({}),
    getItemProps: () => ({}),
    selectItem: () => {},
    highlightItem: () => {},
    setHighlightedItems: () => {},
    setInputValue: () => {},
    openMenu: () => {},
    closeMenu: () => {},
    reset: () => {},
    ...overrides,
  } as UseNavigationTreeResult;
}

describe("menubar ARIA helpers", () => {
  it("menubarMenuProps returns menubar at depth 0", () => {
    const nav = createMockNav();
    const result = getMenubarMenuProps(nav, { depth: 0, label: "Main" });
    expect(result.role).toBe("menubar");
    expect(result["aria-label"]).toBe("Main");
  });

  it("menubarMenuProps returns menu at depth 1+", () => {
    const nav = createMockNav();
    const result = getMenubarMenuProps(nav, { depth: 1 });
    expect(result.role).toBe("menu");
    expect(result["aria-label"]).toBeUndefined();
  });

  it("menubarItemProps returns aria-haspopup on parent items", () => {
    const nav = createMockNav();
    const parentItem = nav.index["/a"];
    const result = getMenubarItemProps(nav, parentItem);
    expect(result.role).toBe("menuitem");
    expect(result["aria-haspopup"]).toBe(true);
  });

  it("menubarItemProps omits aria-haspopup on leaf items", () => {
    const nav = createMockNav();
    const leafItem = nav.index["/b"];
    const result = getMenubarItemProps(nav, leafItem);
    expect(result.role).toBe("menuitem");
    expect(result["aria-haspopup"]).toBeUndefined();
  });

  it("menubarItemProps returns aria-expanded based on state", () => {
    const nav = createMockNav({
      isOpen: true,
      getNodeStatus: (item: _Item) => ({
        selected: false,
        inSelectedBranch: false,
        highlighted: false,
        inHighlightedBranch: item.url === "/a",
      }),
    });

    const parentItem = nav.index["/a"];
    const result = getMenubarItemProps(nav, parentItem);
    expect(result["aria-expanded"]).toBe(true);
  });

  it("menubarItemProps returns false aria-expanded when closed", () => {
    const nav = createMockNav({
      isOpen: false,
      getNodeStatus: () => ({
        selected: false,
        inSelectedBranch: false,
        highlighted: false,
        inHighlightedBranch: false,
      }),
    });

    const parentItem = nav.index["/a"];
    const result = getMenubarItemProps(nav, parentItem);
    expect(result["aria-expanded"]).toBe(false);
  });

  it("menubarItemProps gives tabIndex 0 to first item when nothing is highlighted/selected", () => {
    const nav = createMockNav({
      highlightedItems: [],
      selectedItems: [],
      getNodeStatus: () => ({
        selected: false,
        inSelectedBranch: false,
        highlighted: false,
        inHighlightedBranch: false,
      }),
    });

    const firstItem = nav.annotatedRoot.items![0];
    const result = getMenubarItemProps(nav, firstItem);
    expect(result.tabIndex).toBe(0);

    const secondItem = nav.annotatedRoot.items![1];
    const result2 = getMenubarItemProps(nav, secondItem);
    expect(result2.tabIndex).toBe(-1);
  });

  it("menubarListItemProps returns role none", () => {
    expect(getMenubarListItemProps()).toEqual({ role: "none" });
  });
});

describe("tree ARIA helpers", () => {
  it("treeMenuProps returns tree at depth 0", () => {
    const nav = createMockNav();
    const result = getTreeMenuProps(nav, { depth: 0, label: "Files" });
    expect(result.role).toBe("tree");
    expect(result["aria-label"]).toBe("Files");
  });

  it("treeMenuProps returns group at depth 1+", () => {
    const nav = createMockNav();
    const result = getTreeMenuProps(nav, { depth: 1 });
    expect(result.role).toBe("group");
  });

  it("treeItemProps returns aria-expanded from opts on parent", () => {
    const nav = createMockNav();
    const parentItem = nav.index["/a"];
    const result = getTreeItemProps(nav, parentItem, { expanded: true });
    expect(result.role).toBe("treeitem");
    expect(result["aria-expanded"]).toBe(true);
  });

  it("treeItemProps omits aria-expanded on leaf", () => {
    const nav = createMockNav();
    const leafItem = nav.index["/b"];
    const result = getTreeItemProps(nav, leafItem, { expanded: false });
    expect(result.role).toBe("treeitem");
    expect(result["aria-expanded"]).toBeUndefined();
  });

  it("treeItemProps omits aria-expanded when opts not provided", () => {
    const nav = createMockNav();
    const parentItem = nav.index["/a"];
    const result = getTreeItemProps(nav, parentItem);
    expect(result["aria-expanded"]).toBeUndefined();
  });

  it("treeItemProps gives tabIndex 0 to first item when nothing is highlighted/selected", () => {
    const nav = createMockNav({
      highlightedItems: [],
      selectedItems: [],
      getNodeStatus: () => ({
        selected: false,
        inSelectedBranch: false,
        highlighted: false,
        inHighlightedBranch: false,
      }),
    });

    const firstItem = nav.annotatedRoot.items![0];
    const result = getTreeItemProps(nav, firstItem);
    expect(result.tabIndex).toBe(0);

    const secondItem = nav.annotatedRoot.items![1];
    const result2 = getTreeItemProps(nav, secondItem);
    expect(result2.tabIndex).toBe(-1);
  });

  it("treeListItemProps returns role none", () => {
    expect(getTreeListItemProps()).toEqual({ role: "none" });
  });
});

describe("navigation ARIA helpers", () => {
  it("returns aria-current page on selected item", () => {
    const nav = createMockNav({
      getNodeStatus: (item: _Item) => ({
        selected: item.url === "/a",
        inSelectedBranch: item.url === "/a",
        highlighted: false,
        inHighlightedBranch: false,
      }),
    });

    const result = getNavigationItemProps(nav, nav.index["/a"]);
    expect(result["aria-current"]).toBe("page");
  });

  it("omits aria-current on non-selected item", () => {
    const nav = createMockNav();
    const result = getNavigationItemProps(nav, nav.index["/a"]);
    expect(result["aria-current"]).toBeUndefined();
  });
});

describe("disclosure ARIA helpers", () => {
  it("disclosureToggleProps returns expanded and controls", () => {
    const nav = createMockNav();
    const result = getDisclosureToggleProps(nav, nav.index["/a"], {
      expanded: true,
      controlsId: "section-a",
    });
    expect(result["aria-expanded"]).toBe(true);
    expect(result["aria-controls"]).toBe("section-a");
  });

  it("disclosureToggleProps returns false when collapsed", () => {
    const nav = createMockNav();
    const result = getDisclosureToggleProps(nav, nav.index["/a"], {
      expanded: false,
      controlsId: "section-a",
    });
    expect(result["aria-expanded"]).toBe(false);
  });

  it("disclosureItemProps returns aria-current on selected", () => {
    const nav = createMockNav({
      getNodeStatus: (item: _Item) => ({
        selected: item.url === "/b",
        inSelectedBranch: item.url === "/b",
        highlighted: false,
        inHighlightedBranch: false,
      }),
    });

    const result = getDisclosureItemProps(nav, nav.index["/b"]);
    expect(result["aria-current"]).toBe("page");
  });

  it("disclosureItemProps omits aria-current on non-selected", () => {
    const nav = createMockNav();
    const result = getDisclosureItemProps(nav, nav.index["/b"]);
    expect(result["aria-current"]).toBeUndefined();
  });
});
