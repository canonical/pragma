import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BestPosition,
  useWindowFitment,
} from "../useWindowFitment/index.js";
import { useContextualMenu } from "./index.js";
import type { MenuItem } from "./types.js";

// Mock only the leaf positioning hook; the navigation tree and cross-group
// reducer run for real so composition is genuinely exercised.
vi.mock("../useWindowFitment/index.js");

const menu: MenuItem = {
  key: "menu",
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
      items: [{ key: "b1", label: "B one", url: "/b1" }],
    },
  ],
};

describe("useContextualMenu", () => {
  const mockBestPosition: BestPosition = {
    positionName: "bottom",
    align: "center",
    position: { top: 0, left: 0 },
    fits: true,
    autoFitOffset: { top: 0, left: 0 },
  };

  beforeEach(() => {
    vi.mocked(useWindowFitment).mockReturnValue({
      targetRef: { current: null },
      popupRef: { current: null },
      bestPosition: mockBestPosition,
      popupPositionStyle: {},
      arrowOffset: { axis: "x", offset: 0 },
      direction: "ltr",
    });
  });

  it("exposes disclosure, navigation, and positioning surface", () => {
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.getTriggerProps).toBeInstanceOf(Function);
    expect(result.current.getMenuProps).toBeInstanceOf(Function);
    expect(result.current.getItemProps).toBeInstanceOf(Function);
    expect(result.current.arrowOffset).toEqual({ axis: "x", offset: 0 });
    expect(result.current.index).toBeDefined();
  });

  it("the trigger carries click-disclosure ARIA wiring", () => {
    const { result } = renderHook(() => useContextualMenu({ root: menu }));
    const triggerProps = result.current.getTriggerProps();
    expect(triggerProps["aria-expanded"]).toBe(false);
  });

  it("opens and closes via the imperative controls", () => {
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("highlights the first enabled LEAF item on open, not a group", () => {
    // Regression: the tree is root -> group -> item, so the shared reducer's
    // OPEN highlights the first child — a structural GROUP — which leaves no
    // menuitem as the roving tab stop and kills keyboard navigation. The hook
    // must descend to the first real item ("a1") on open.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    act(() => result.current.open());

    const highlighted = result.current.highlightedItems.at(-1);
    expect(highlighted?.key).toBe("a1");
    // The full path is [root, group, item] — a leaf, not the group itself.
    expect(result.current.highlightedItems.at(-2)?.key).toBe("group-a");
  });

  it("passes positioning props through to useWindowFitment", () => {
    renderHook(() =>
      useContextualMenu({ root: menu, preferredDirections: ["block-end"] }),
    );
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith(
      expect.objectContaining({ preferredDirections: ["block-end"] }),
    );
  });

  it("crosses group boundaries on ArrowDown through the composed hook", () => {
    // Regression: the cross-group reducer must operate on the tree's own item
    // instances (via the highlighted path), not a separately-annotated index —
    // otherwise reference checks never match and the behaviour silently no-ops.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    // Highlight the last item of group A.
    const a2 = result.current.index["/a2"];
    expect(a2).toBeDefined();
    act(() => result.current.highlightItem(a2));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a2");

    // ArrowDown at the group edge should move into group B's first item.
    const arrowDownEvent = {
      key: "ArrowDown",
      preventDefault: () => {},
    } as unknown as React.KeyboardEvent;
    act(() => {
      result.current.getMenuProps().onKeyDown?.(arrowDownEvent);
    });
    expect(result.current.highlightedItems.at(-1)?.key).toBe("b1");
  });

  it("keeps the keyboard highlight when the pointer leaves the menu", () => {
    // Regression: the tree's default menu props dispatch CLOSE on mouse-leave,
    // wiping highlightedItems while the disclosure keeps the popup open — a
    // pointer grazing off the surface destroyed a keyboard user's position.
    // The composed getMenuProps must neutralise that handler.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    act(() => result.current.open());
    const key = (k: string) =>
      ({ key: k, preventDefault: () => {} }) as unknown as React.KeyboardEvent;

    // Open highlights "a1"; ArrowDown crosses into group B ("b1").
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowDown")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("b1");

    // The surface carries no tree mouse-leave handler; simulate the leave
    // anyway (optional call) — the highlight must survive it.
    const menuProps = result.current.getMenuProps();
    expect(menuProps.onMouseLeave).toBeUndefined();
    act(() => {
      menuProps.onMouseLeave?.({} as React.SyntheticEvent);
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedItems.at(-1)?.key).toBe("b1");

    // Arrow keys continue from where they were (back up into group A's last
    // item), not from a reset state.
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowUp")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a2");
  });

  it("opens a submenu on ArrowRight and closes it on ArrowLeft", () => {
    // A menu with a submenu parent ("parent" → "sub1"/"sub2").
    const withSubmenu: MenuItem = {
      key: "menu",
      items: [
        {
          key: "group",
          items: [
            { key: "first", label: "First", url: "/first" },
            {
              key: "parent",
              label: "Parent",
              items: [
                { key: "sub1", label: "Sub one", url: "/sub1" },
                { key: "sub2", label: "Sub two", url: "/sub2" },
              ],
            },
          ],
        },
      ],
    };
    const { result } = renderHook(() =>
      useContextualMenu({ root: withSubmenu }),
    );

    const parent = result.current.index.parent;
    if (!parent) throw new Error("parent not found");
    act(() => result.current.highlightItem(parent));

    // While the parent itself is highlighted the submenu is CLOSED:
    // inHighlightedBranch is true, but highlighted is also true.
    expect(result.current.getNodeStatus(parent).inHighlightedBranch).toBe(true);
    expect(result.current.getNodeStatus(parent).highlighted).toBe(true);

    const key = (k: string) =>
      ({ key: k, preventDefault: () => {} }) as unknown as React.KeyboardEvent;

    // ArrowRight descends into the submenu → highlight moves to the first child.
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowRight")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("sub1");
    // Now the parent's submenu is OPEN: in the branch, but not the leaf.
    expect(result.current.getNodeStatus(parent).inHighlightedBranch).toBe(true);
    expect(result.current.getNodeStatus(parent).highlighted).toBe(false);

    // ArrowLeft returns the highlight to the parent → submenu closes again.
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowLeft")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("parent");
    expect(result.current.getNodeStatus(parent).highlighted).toBe(true);
  });
});
