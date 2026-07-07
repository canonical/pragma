import { act, renderHook } from "@testing-library/react";
import type { CSSProperties } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayedToggle } from "../useDelayedToggle/index.js";
import {
  type BestPosition,
  useWindowFitment,
} from "../useWindowFitment/index.js";
import { useDisclosure } from "./index.js";

vi.mock("../useDelayedToggle/index.js");
vi.mock("../useWindowFitment/index.js");

describe("useDisclosure", () => {
  const mockTargetRef = { current: document.createElement("div") };
  const mockPopupRef = { current: document.createElement("div") };

  const mockBestPosition: BestPosition = {
    positionName: "bottom",
    position: { top: 10, left: 20 },
    fits: true,
    autoFitOffset: { top: 0, left: 0 },
  };

  const mockPopupPositionStyle: CSSProperties = {
    top: 10,
    left: 20,
    maxWidth: "300px",
  };

  beforeEach(() => {
    vi.mocked(useDelayedToggle).mockReturnValue({
      flag: false,
      activate: vi.fn(),
      deactivate: vi.fn(),
    });
    vi.mocked(useWindowFitment).mockReturnValue({
      targetRef: mockTargetRef,
      popupRef: mockPopupRef,
      bestPosition: mockBestPosition,
      popupPositionStyle: mockPopupPositionStyle,
    });
  });

  it("should return initial state, controls, and prop-getters", () => {
    const { result } = renderHook(() => useDisclosure({}));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isFocused).toBe(false);
    expect(result.current.targetRef).toBe(mockTargetRef);
    expect(result.current.popupRef).toBe(mockPopupRef);
    expect(result.current.bestPosition).toBe(mockBestPosition);
    expect(result.current.popupPositionStyle).toEqual(mockPopupPositionStyle);
    expect(result.current.popupId).toBeDefined();

    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.getToggleProps).toBeInstanceOf(Function);
    expect(result.current.getContentProps).toBeInstanceOf(Function);
  });

  it("should honour the isOpen prop override", () => {
    const { result } = renderHook(() => useDisclosure({ isOpen: true }));
    expect(result.current.isOpen).toBe(true);
  });

  describe("hover mode (default)", () => {
    it("exposes pointer and describedby wiring on the trigger", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "hover" }));
      const toggleProps = result.current.getToggleProps();

      expect(toggleProps["aria-describedby"]).toBe(result.current.popupId);
      expect(toggleProps["aria-expanded"]).toBeUndefined();
      expect(toggleProps.onPointerEnter).toBeInstanceOf(Function);
      expect(toggleProps.onPointerLeave).toBeInstanceOf(Function);
    });

    it("opens on pointer-enter and closes on pointer-leave", () => {
      const activate = vi.fn();
      const deactivate = vi.fn();
      vi.mocked(useDelayedToggle).mockReturnValue({
        flag: false,
        activate,
        deactivate,
      });

      const { result } = renderHook(() => useDisclosure({ mode: "hover" }));

      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to PointerEvent
        result.current.getToggleProps().onPointerEnter?.({} as any);
      });
      expect(activate).toHaveBeenCalledOnce();

      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to PointerEvent
        result.current.getToggleProps().onPointerLeave?.({} as any);
      });
      expect(deactivate).toHaveBeenCalledOnce();
    });

    it("opens on focus (keyboard parity)", () => {
      const activate = vi.fn();
      vi.mocked(useDelayedToggle).mockReturnValue({
        flag: false,
        activate,
        deactivate: vi.fn(),
      });

      const { result } = renderHook(() => useDisclosure({ mode: "hover" }));
      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to FocusEvent
        result.current.getToggleProps().onFocus?.({} as any);
      });

      expect(activate).toHaveBeenCalledOnce();
      expect(result.current.isFocused).toBe(true);
    });

    it("does not open on hover if the trigger is disabled", () => {
      const activate = vi.fn();
      vi.mocked(useDelayedToggle).mockReturnValue({
        flag: false,
        activate,
        deactivate: vi.fn(),
      });

      const { result } = renderHook(() => useDisclosure({ mode: "hover" }));
      act(() => {
        result.current
          .getToggleProps()
          // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to PointerEvent
          .onPointerEnter?.({ target: { disabled: true } } as any);
      });

      expect(activate).not.toHaveBeenCalled();
    });
  });

  describe("click mode", () => {
    it("exposes expanded/controls wiring on the trigger", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "click" }));
      const toggleProps = result.current.getToggleProps();

      expect(toggleProps["aria-expanded"]).toBe(false);
      expect(toggleProps["aria-controls"]).toBe(result.current.popupId);
      expect(toggleProps["aria-describedby"]).toBeUndefined();
      expect(toggleProps.onClick).toBeInstanceOf(Function);
      expect(toggleProps.onKeyDown).toBeInstanceOf(Function);
    });

    it("does not open on focus alone", () => {
      const activate = vi.fn();
      vi.mocked(useDelayedToggle).mockReturnValue({
        flag: false,
        activate,
        deactivate: vi.fn(),
      });

      const { result } = renderHook(() => useDisclosure({ mode: "click" }));
      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to FocusEvent
        result.current.getToggleProps().onFocus?.({} as any);
      });

      expect(activate).not.toHaveBeenCalled();
      expect(result.current.isFocused).toBe(true);
    });

    it("toggles open and shut on click (synchronously, no timer)", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "click" }));

      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to MouseEvent
        result.current.getToggleProps().onClick?.({ target: {} } as any);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to MouseEvent
        result.current.getToggleProps().onClick?.({ target: {} } as any);
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("opens on ArrowDown when closed", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "click" }));
      const preventDefault = vi.fn();
      act(() => {
        result.current.getToggleProps().onKeyDown?.({
          key: "ArrowDown",
          preventDefault,
          // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to KeyboardEvent
        } as any);
      });

      expect(result.current.isOpen).toBe(true);
      expect(preventDefault).toHaveBeenCalledOnce();
    });

    it("closes on outside pointer-down when open", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "click" }));

      // Open it first.
      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to MouseEvent
        result.current.getToggleProps().onClick?.({ target: {} } as any);
      });
      expect(result.current.isOpen).toBe(true);

      // A pointer-down outside the trigger and popup closes it.
      act(() => {
        const event = new Event("pointerdown", { bubbles: true });
        Object.defineProperty(event, "target", { value: document.body });
        document.dispatchEvent(event);
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("does not close on pointer-down inside the trigger or popup", () => {
      const { result } = renderHook(() => useDisclosure({ mode: "click" }));

      // Open it, then a pointer-down inside the popup must not close it.
      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: firing a test event without conforming to MouseEvent
        result.current.getToggleProps().onClick?.({ target: {} } as any);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        const event = new Event("pointerdown", { bubbles: true });
        Object.defineProperty(event, "target", { value: mockPopupRef.current });
        document.dispatchEvent(event);
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  it("closes a controlled-open click disclosure when Escape is pressed", () => {
    // A controlled `isOpen: true` registers the Escape listener without relying
    // on useDelayedToggle's internal state.
    const onHide = vi.fn();
    renderHook(() => useDisclosure({ mode: "click", isOpen: true, onHide }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onHide).toHaveBeenCalledOnce();
  });

  it("marks content hidden while closed and visible while open", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDisclosure({ isOpen }),
      { initialProps: { isOpen: false } },
    );
    expect(result.current.getContentProps().hidden).toBe(true);

    rerender({ isOpen: true });
    expect(result.current.getContentProps().hidden).toBe(false);
  });

  it("passes props through to useWindowFitment with the resolved isOpen", () => {
    renderHook(() => useDisclosure({ preferredDirections: ["top"] }));
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith({
      preferredDirections: ["top"],
      isOpen: false,
    });
  });
});
