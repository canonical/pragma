import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
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

  it("passes positioning props through to useWindowFitment", () => {
    renderHook(() =>
      useContextualMenu({ root: menu, preferredDirections: ["bottom"] }),
    );
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith(
      expect.objectContaining({ preferredDirections: ["bottom"] }),
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
    // Minimal keyboard event carrying only what the menu handler reads.
    const arrowDownEvent = {
      key: "ArrowDown",
      preventDefault: () => {},
    } as unknown as KeyboardEvent;
    act(() => {
      result.current.getMenuProps().onKeyDown?.(arrowDownEvent);
    });
    expect(result.current.highlightedItems.at(-1)?.key).toBe("b1");
  });
});
