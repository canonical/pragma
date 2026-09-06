import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BestPosition,
  useWindowFitment,
} from "../useWindowFitment/index.js";
import { useContextualMenu } from "./index.js";
import type { MenuItem } from "./types.js";

// Mock only the leaf positioning hook; the navigation tree runs for real so
// composition is genuinely exercised.
vi.mock("../useWindowFitment/index.js");

const menu: MenuItem = {
  key: "menu",
  items: [
    { key: "a1", label: "A one", url: "/a1" },
    { key: "a2", label: "A two", url: "/a2" },
    { type: "separator" },
    { key: "b1", label: "B one", url: "/b1" },
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

  it("highlights the first enabled item on open", () => {
    // The root's children are the items themselves, so the shared reducer's
    // OPEN lands directly on the first real menuitem — the roving tab stop
    // keyboard navigation moves from.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    act(() => result.current.open());

    const highlighted = result.current.highlightedItems.at(-1);
    expect(highlighted?.key).toBe("a1");
    // The full path is [root, item].
    expect(result.current.highlightedItems.at(-2)?.key).toBe("menu");
  });

  it("feeds separators to the tree as disabled nodes with generated keys", () => {
    // The tree machinery skips DISABLED nodes — that, plus a guaranteed key
    // (the index throws on identity-less nodes), is the entire separator
    // contract. The discriminant survives annotation for the render layer.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    const separator = result.current.index["separator-0"];
    expect(separator).toBeDefined();
    expect(separator?.disabled).toBe(true);
    expect(separator && "type" in separator ? separator.type : undefined).toBe(
      "separator",
    );
  });

  it("passes positioning props through to useWindowFitment", () => {
    renderHook(() =>
      useContextualMenu({ root: menu, preferredDirections: ["block-end"] }),
    );
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith(
      expect.objectContaining({ preferredDirections: ["block-end"] }),
    );
  });

  it("skips a separator on ArrowDown through the composed hook", () => {
    // The separator sits between "a2" and "b1"; the tree's disabled-skipping
    // sibling walk must step straight over it, with no separator logic here.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    const a2 = result.current.index["/a2"];
    expect(a2).toBeDefined();
    act(() => result.current.highlightItem(a2));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a2");

    const arrowDownEvent = {
      key: "ArrowDown",
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as React.KeyboardEvent;
    act(() => {
      result.current.getMenuProps().onKeyDown?.(arrowDownEvent);
    });
    expect(result.current.highlightedItems.at(-1)?.key).toBe("b1");
  });

  it("handles a keydown once when it bubbles through nested menu surfaces", () => {
    // Regression: one keyboard handler serves every surface (root + each open
    // submenu), and a keydown inside a portalled submenu bubbles through ALL
    // of them in the React tree. Without stopPropagation each key dispatched
    // twice: type-ahead "c" accumulated as "cc", locking the search into the
    // repeated-character cycle so a two-letter prefix never matched.
    const typeAheadMenu: MenuItem = {
      key: "menu",
      items: [
        { key: "cut", label: "Cut", url: "/cut" },
        { key: "copy", label: "Copy", url: "/copy" },
        { key: "cat", label: "Cat", url: "/cat" },
      ],
    };
    const { result } = renderHook(() =>
      useContextualMenu({ root: typeAheadMenu }),
    );
    act(() => result.current.open());

    // Mimic React's bubbling contract: the second (ancestor) surface handler
    // only runs if the first did not stop propagation.
    const bubble = (k: string) => {
      let stopped = false;
      const event = {
        key: k,
        preventDefault: () => {},
        stopPropagation: () => {
          stopped = true;
        },
      } as unknown as React.KeyboardEvent;
      act(() => {
        const handler = result.current.getMenuProps().onKeyDown;
        handler?.(event); // nearest (submenu) surface
        if (!stopped) handler?.(event); // root surface, per React semantics
      });
    };

    bubble("c"); // matches Cut (already current) — must NOT become "cc"
    bubble("a"); // accumulated "ca" must match Cat
    expect(result.current.highlightedItems.at(-1)?.key).toBe("cat");
  });

  it("keeps the keyboard highlight when the pointer leaves the menu", () => {
    // Regression: the tree's default menu props dispatch CLOSE on mouse-leave,
    // wiping highlightedItems while the disclosure keeps the popup open — a
    // pointer grazing off the surface destroyed a keyboard user's position.
    // The composed getMenuProps must neutralise that handler.
    const { result } = renderHook(() => useContextualMenu({ root: menu }));

    act(() => result.current.open());
    const key = (k: string) =>
      ({
        key: k,
        preventDefault: () => {},
        stopPropagation: () => {},
      }) as unknown as React.KeyboardEvent;

    // Open highlights "a1"; ArrowDown moves to "a2".
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowDown")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a2");

    // The surface carries no tree mouse-leave handler; simulate the leave
    // anyway (optional call) — the highlight must survive it.
    const menuProps = result.current.getMenuProps();
    expect(menuProps.onMouseLeave).toBeUndefined();
    act(() => {
      menuProps.onMouseLeave?.({} as React.SyntheticEvent);
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a2");

    // Arrow keys continue from where they were, not from a reset state.
    act(() => result.current.getMenuProps().onKeyDown?.(key("ArrowUp")));
    expect(result.current.highlightedItems.at(-1)?.key).toBe("a1");
  });

  it("opens a submenu on ArrowRight and closes it on ArrowLeft", () => {
    // A menu with a submenu parent ("parent" → "sub1"/"sub2").
    const withSubmenu: MenuItem = {
      key: "menu",
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
      ({
        key: k,
        preventDefault: () => {},
        stopPropagation: () => {},
      }) as unknown as React.KeyboardEvent;

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
