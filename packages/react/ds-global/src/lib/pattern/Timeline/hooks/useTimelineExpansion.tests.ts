import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTimelineExpansion } from "./useTimelineExpansion.js";

describe("useTimelineExpansion", () => {
  it("hides nothing below the initial visible count", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 10, initialVisible: 60 }),
    );
    expect(result.current).toMatchObject({
      topCount: 0,
      bottomCount: 10,
      hiddenCount: 0,
      indicatorPosition: null,
    });
  });

  it("collapses from the bottom by default", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 100, initialVisible: 60, step: 20 }),
    );
    expect(result.current).toMatchObject({
      topCount: 0,
      bottomCount: 60,
      hiddenCount: 40,
      indicatorPosition: "bottom",
    });
  });

  it("reveals a step on showMore", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 100, initialVisible: 60, step: 20 }),
    );
    act(() => result.current.showMore());
    expect(result.current).toMatchObject({ bottomCount: 80, hiddenCount: 20 });
    act(() => result.current.showMore());
    act(() => result.current.showMore());
    expect(result.current).toMatchObject({ bottomCount: 100, hiddenCount: 0 });
  });

  it("reveals everything on showAll", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 100, initialVisible: 60, step: 20 }),
    );
    act(() => result.current.showAll());
    expect(result.current).toMatchObject({ bottomCount: 100, hiddenCount: 0 });
  });

  it("splits top and bottom for the middle method", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({
        count: 100,
        method: "middle",
        initialVisible: 60,
        step: 20,
      }),
    );
    expect(result.current).toMatchObject({
      topCount: 30,
      bottomCount: 30,
      hiddenCount: 40,
      indicatorPosition: "middle",
    });
  });

  it("grows the bottom slice for the middle method", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({
        count: 100,
        method: "middle",
        initialVisible: 60,
        step: 20,
      }),
    );
    act(() => result.current.showMore());
    expect(result.current).toMatchObject({
      topCount: 30,
      bottomCount: 50,
      hiddenCount: 20,
      indicatorPosition: "middle",
    });
  });

  it("shows everything for the none method", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 100, method: "none" }),
    );
    expect(result.current).toMatchObject({
      topCount: 0,
      bottomCount: 100,
      hiddenCount: 0,
      indicatorPosition: null,
    });
  });

  it("caps the bottom slice at the list size", () => {
    const { result } = renderHook(() =>
      useTimelineExpansion({ count: 5, initialVisible: 60 }),
    );
    expect(result.current).toMatchObject({ bottomCount: 5, hiddenCount: 0 });
  });
});
