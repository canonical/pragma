import type { _Index, _Item } from "@canonical/ds-types";
import type { NodeStatus } from "@canonical/utils";
import { describe, expect, it } from "vitest";
import type { UseNavigationTreeResult } from "../types.js";
import getMenuGroupProps from "./getMenuGroupProps.js";
import getMenuItemProps from "./getMenuItemProps.js";
import getMenuProps from "./getMenuProps.js";

const defaultStatus: NodeStatus = {
  selected: false,
  inSelectedBranch: false,
  highlighted: false,
  inHighlightedBranch: false,
};

function createMockNav(
  overrides: Partial<UseNavigationTreeResult> = {},
  status: Partial<NodeStatus> = {},
): UseNavigationTreeResult {
  const root: _Item = { key: "menu", parentUrl: null, depth: 0 };
  const index: _Index = { menu: root };

  return {
    selectedItems: [],
    highlightedItems: [],
    currentDepth: 0,
    isOpen: true,
    inputValue: "",
    keysSoFar: "",
    annotatedRoot: root,
    index,
    getNodeStatus: () => ({ ...defaultStatus, ...status }),
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

describe("contextual-menu ARIA helpers", () => {
  it("getMenuProps returns role=menu with an accessible name", () => {
    const nav = createMockNav();
    expect(getMenuProps(nav, { label: "Actions" })).toEqual({
      role: "menu",
      "aria-label": "Actions",
    });
    expect(getMenuProps(nav, { labelledBy: "trigger-id" })).toEqual({
      role: "menu",
      "aria-labelledby": "trigger-id",
    });
    expect(getMenuProps(nav)).toEqual({ role: "menu" });
  });

  it("getMenuGroupProps returns role=group with an accessible name", () => {
    const nav = createMockNav();
    expect(getMenuGroupProps(nav, { label: "Edit" })).toEqual({
      role: "group",
      "aria-label": "Edit",
    });
    expect(getMenuGroupProps(nav)).toEqual({ role: "group" });
  });

  it("getMenuItemProps makes the highlighted item the roving tab stop", () => {
    const item: _Item = { url: "/x", parentUrl: "menu", depth: 2 };

    // The highlighted item is the roving tab stop when something is highlighted.
    const highlighted = getMenuItemProps(
      createMockNav({ highlightedItems: [item] }, { highlighted: true }),
      item,
    );
    expect(highlighted).toEqual({ role: "menuitem", tabIndex: 0 });

    const notHighlighted = getMenuItemProps(createMockNav(), item);
    expect(notHighlighted.tabIndex).toBe(-1);

    // When nothing is highlighted, the selected tail item takes the tab stop —
    // never both, preserving the single roving tab stop.
    const selected = getMenuItemProps(
      createMockNav({ selectedItems: [item] }, { selected: true }),
      item,
    );
    expect(selected.tabIndex).toBe(0);
  });

  it("getMenuItemProps marks a submenu trigger with haspopup/expanded", () => {
    const parent: _Item = {
      key: "sub",
      parentUrl: "menu",
      depth: 2,
      items: [{ url: "/x/1", parentUrl: "sub", depth: 3 }],
    };

    const result = getMenuItemProps(
      createMockNav({}, { inHighlightedBranch: true }),
      parent,
    );
    expect(result["aria-haspopup"]).toBe(true);
    expect(result["aria-expanded"]).toBe(true);
  });

  it("getMenuItemProps marks a disabled item aria-disabled", () => {
    const disabled: _Item = {
      url: "/d",
      parentUrl: "menu",
      depth: 2,
      disabled: true,
    };
    expect(getMenuItemProps(createMockNav(), disabled)["aria-disabled"]).toBe(
      true,
    );
  });
});
