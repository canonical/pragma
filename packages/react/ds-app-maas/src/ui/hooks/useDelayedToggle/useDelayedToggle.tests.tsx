import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDelayedToggle } from "./index.js";

describe("useDelayedToggle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize flag to false", () => {
    const { result } = renderHook(() => useDelayedToggle({}));
    expect(result.current.flag).toBe(false);
  });

  it("should set flag to true after activateDelay", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDelayedToggle({ activateDelay: 100 }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.flag).toBe(true);
  });

  it("should set flag to false after deactivateDelay", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDelayedToggle({ deactivateDelay: 100 }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(100);
      result.current.deactivate({} as Event);
      vi.advanceTimersByTime(100);
    });

    expect(result.current.flag).toBe(false);
  });

  it("should call onActivate callback", () => {
    vi.useFakeTimers();
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDelayedToggle({ activateDelay: 100, onActivate }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(100);
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("should call onDeactivate callback", () => {
    vi.useFakeTimers();
    const onDeactivate = vi.fn();
    const { result } = renderHook(() =>
      useDelayedToggle({ deactivateDelay: 100, onDeactivate }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(100);
      result.current.deactivate({} as Event);
      vi.advanceTimersByTime(100);
    });

    expect(onDeactivate).toHaveBeenCalledTimes(1);
  });

  it("should clear previous timeout on subsequent activate calls", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDelayedToggle({ activateDelay: 200 }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(100);
      result.current.activate({} as Event);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.flag).toBe(true);
  });

  it("should clear previous timeout on subsequent deactivate calls", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDelayedToggle({ deactivateDelay: 200 }),
    );

    act(() => {
      result.current.activate({} as Event);
      vi.advanceTimersByTime(200);
      result.current.deactivate({} as Event);
      vi.advanceTimersByTime(100);
      result.current.deactivate({} as Event);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.flag).toBe(false);
  });
});
