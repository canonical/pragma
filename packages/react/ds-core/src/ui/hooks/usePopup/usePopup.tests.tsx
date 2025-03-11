import { act, renderHook } from "@testing-library/react";
import type { CSSProperties } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDelayedToggle } from "../useDelayedToggle/index.js";
import {
  type BestPosition,
  useWindowFitment,
} from "../useWindowFitment/index.js";
import { usePopup } from "./index.js";

vi.mock("../useDelayedToggle/index.js");
vi.mock("../useWindowFitment/index.js");

describe("usePopup", () => {
  const mockTargetRef = { current: document.createElement("div") };
  const mockPopupRef = { current: document.createElement("div") };

  const mockBestPosition: BestPosition = {
    positionName: "bottom",
    position: { top: 10, left: 20 },
    fits: true,
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

  it("should return initial state and handlers", () => {
    const { result } = renderHook(() => usePopup({}));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isFocused).toBe(false);
    expect(result.current.targetRef).toBe(mockTargetRef);
    expect(result.current.popupRef).toBe(mockPopupRef);
    expect(result.current.bestPosition).toBe(mockBestPosition);
    expect(result.current.popupPositionStyle).toEqual(mockPopupPositionStyle);
    expect(result.current.popupId).toBeDefined();

    expect(result.current.handleTriggerBlur).toBeInstanceOf(Function);
    expect(result.current.handleTriggerEnter).toBeInstanceOf(Function);
    expect(result.current.handleTriggerFocus).toBeInstanceOf(Function);
    expect(result.current.handleTriggerLeave).toBeInstanceOf(Function);
  });

  it("should handle isOpen prop override", () => {
    const { result } = renderHook(() => usePopup({ isOpen: true }));
    expect(result.current.isOpen).toBe(true);
  });

  it("should call open and close on focus and blur", () => {
    const activate = vi.fn();
    const deactivate = vi.fn();
    vi.mocked(useDelayedToggle).mockReturnValue({
      flag: false,
      activate,
      deactivate,
    });

    const { result } = renderHook(() => usePopup({}));

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerFocus({ nativeEvent: {} } as any);
    });

    expect(activate).toHaveBeenCalledTimes(1);
    expect(result.current.isFocused).toBe(true);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerBlur({ nativeEvent: {} } as any);
    });

    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(result.current.isFocused).toBe(false);
  });

  it("should call open and close on enter and leave", () => {
    const activate = vi.fn();
    const deactivate = vi.fn();
    vi.mocked(useDelayedToggle).mockReturnValue({
      flag: false,
      activate,
      deactivate,
    });

    const { result } = renderHook(() => usePopup({}));

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerEnter({ nativeEvent: {} } as any);
    });

    expect(activate).toHaveBeenCalledTimes(1);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerLeave({ nativeEvent: {} } as any);
    });

    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it("should call onFocus, onBlur, onEnter, and onLeave callbacks", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const onEnter = vi.fn();
    const onLeave = vi.fn();

    const { result } = renderHook(() =>
      usePopup({ onFocus, onBlur, onEnter, onLeave }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerFocus({ nativeEvent: {} } as any);
    });

    expect(onFocus).toHaveBeenCalledTimes(1);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerBlur({ nativeEvent: {} } as any);
    });

    expect(onBlur).toHaveBeenCalledTimes(1);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerEnter({ nativeEvent: {} } as any);
    });

    expect(onEnter).toHaveBeenCalledTimes(1);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Allow firing a test focus event without the test data conforming to FocusEvent type
      result.current.handleTriggerLeave({ nativeEvent: {} } as any);
    });

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("should pass props to useWindowFitment", () => {
    const { result } = renderHook(() =>
      usePopup({ preferredDirections: ["top"] }),
    );
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith({
      preferredDirections: ["top"],
      isOpen: false,
    });
  });

  it("should pass isOpen to useWindowFitment", () => {
    const { result } = renderHook(() => usePopup({ isOpen: true }));
    expect(vi.mocked(useWindowFitment)).toHaveBeenCalledWith({
      isOpen: true,
    });
  });
});
