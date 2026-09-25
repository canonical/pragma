import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useWindowDimensions from "./useWindowDimensions.js";

describe("useWindowDimensions", () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalHeight,
    });
    vi.useRealTimers();
  });

  it("refreshes dimensions immediately when re-enabled after a closed resize", () => {
    vi.useFakeTimers();
    const hook = renderHook(
      ({ enabled }) =>
        useWindowDimensions({
          enabled,
          resizeDelay: 150,
          listenToScroll: false,
        }),
      { initialProps: { enabled: false } },
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 480,
    });

    hook.rerender({ enabled: true });
    expect(hook.result.current.windowWidth).toBe(640);
    expect(hook.result.current.windowHeight).toBe(480);
    expect(vi.getTimerCount()).toBe(0);
  });
});
