import { act, renderHook } from "@testing-library/react";
import type { MutableRefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResizeObserver } from "../useResizeObserver/index.js";
import { useWindowDimensions } from "../useWindowDimensions/index.js";
import useWindowFitment, { computeArrowOffset } from "./useWindowFitment.js";

vi.mock("../useResizeObserver/index.js");
vi.mock("../useWindowDimensions/index.js");

/** Build a minimal DOMRect-like object for the fields computeArrowOffset reads. */
const makeRect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe("computeArrowOffset", () => {
  it("returns zero on the x axis when a top/bottom popup is centred on the target", () => {
    // Target centre x = 150; popup centre x = 150 → aligned.
    const target = makeRect(100, 0, 100, 20);
    const popup = makeRect(50, 30, 200, 40);

    expect(computeArrowOffset("bottom", target, popup)).toEqual({
      axis: "x",
      offset: 0,
    });
    expect(computeArrowOffset("top", target, popup)).toEqual({
      axis: "x",
      offset: 0,
    });
  });

  it("shifts the arrow toward a target left of the popup centre", () => {
    // Target centre x = 60; popup centre x = 150 → arrow shifts -90.
    const target = makeRect(40, 0, 40, 20);
    const popup = makeRect(50, 30, 200, 40);

    expect(computeArrowOffset("bottom", target, popup)).toEqual({
      axis: "x",
      offset: -90,
    });
  });

  it("shifts the arrow toward a target right of the popup centre", () => {
    // Target centre x = 240; popup centre x = 150 → arrow shifts +90.
    const target = makeRect(220, 0, 40, 20);
    const popup = makeRect(50, 30, 200, 40);

    expect(computeArrowOffset("bottom", target, popup)).toEqual({
      axis: "x",
      offset: 90,
    });
  });

  it("clamps the offset to the popup half-extent so the arrow stays on the edge", () => {
    // Target centre x = 500; popup centre x = 150; raw offset 350, half-extent 100.
    const target = makeRect(480, 0, 40, 20);
    const popup = makeRect(50, 30, 200, 40);

    expect(computeArrowOffset("bottom", target, popup)).toEqual({
      axis: "x",
      offset: 100,
    });
  });

  it("uses the y axis for left/right placements", () => {
    // Target centre y = 100; popup centre y = 60 → arrow shifts +40 on y.
    const target = makeRect(0, 80, 20, 40);
    const popup = makeRect(30, 10, 40, 100);

    expect(computeArrowOffset("right", target, popup)).toEqual({
      axis: "y",
      offset: 40,
    });
    expect(computeArrowOffset("left", target, popup)).toEqual({
      axis: "y",
      offset: 40,
    });
  });

  it("centres the arrow from the authoritative position, not the stale rect", () => {
    // Regression: when attached to an anchor, the popup's live rect lags one
    // frame behind the just-computed placement. The rect here still says the
    // popup is at left=0 (its old spot), but the authoritative position places
    // it at left=50 (popup centre x = 150, matching the target centre) — so the
    // offset must be 0, computed from the authoritative position, not -50 from
    // the stale rect.
    const target = makeRect(100, 0, 100, 20); // centre x = 150
    const staleRect = makeRect(0, 30, 200, 40); // stale left → centre x = 100
    const authoritative = { top: 30, left: 50 }; // real left → centre x = 150

    expect(
      computeArrowOffset("bottom", target, staleRect, authoritative),
    ).toEqual({ axis: "x", offset: 0 });

    // Without the authoritative position it would use the stale rect and drift.
    expect(computeArrowOffset("bottom", target, staleRect)).toEqual({
      axis: "x",
      offset: 50,
    });
  });
});

describe("useWindowFitment scroll positioning", () => {
  let target: HTMLButtonElement;
  let popup: HTMLDivElement;
  let targetTop: number;
  let viewport: EventTarget;
  let animationFrames: FrameRequestCallback[];

  beforeEach(() => {
    targetTop = 100;
    target = document.createElement("button");
    popup = document.createElement("div");
    document.body.append(target, popup);
    target.getBoundingClientRect = () => makeRect(100, targetTop, 80, 20);
    popup.getBoundingClientRect = () => makeRect(0, 0, 100, 60);

    vi.mocked(useResizeObserver).mockImplementation((element) =>
      element === popup
        ? { width: 100, height: 60 }
        : { width: 80, height: 20 },
    );
    vi.mocked(useWindowDimensions).mockReturnValue({
      windowWidth: 1024,
      windowHeight: 768,
      scrollWidth: 0,
      scrollHeight: 0,
    });

    viewport = new EventTarget();
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    animationFrames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    target.remove();
    popup.remove();
    vi.restoreAllMocks();
  });

  const renderOpenFitment = () => {
    const hook = renderHook(() =>
      useWindowFitment({
        isOpen: true,
        preferredDirections: ["block-end"],
      }),
    );
    (
      hook.result.current.targetRef as MutableRefObject<HTMLElement | null>
    ).current = target;
    (
      hook.result.current.popupRef as MutableRefObject<HTMLDivElement | null>
    ).current = popup;
    hook.rerender();
    return hook;
  };

  const flushAnimationFrame = () => {
    const callback = animationFrames.shift();
    if (callback) act(() => callback(performance.now()));
  };

  it("repositions on capture-phase ancestor scrolling", () => {
    const hook = renderOpenFitment();
    expect(hook.result.current.bestPosition?.position.top).toBe(120);

    targetTop = 240;
    const ancestor = document.createElement("div");
    ancestor.append(target);
    document.body.append(ancestor);
    act(() => ancestor.dispatchEvent(new Event("scroll")));
    flushAnimationFrame();

    expect(hook.result.current.bestPosition?.position.top).toBe(260);
    ancestor.remove();
  });

  it("repositions on visual viewport scrolling", () => {
    const hook = renderOpenFitment();
    targetTop = 180;
    act(() => viewport.dispatchEvent(new Event("scroll")));
    flushAnimationFrame();

    expect(hook.result.current.bestPosition?.position.top).toBe(200);
  });

  it("installs listeners only while open and cleans up pending frames", () => {
    const windowAdd = vi.spyOn(window, "addEventListener");
    const windowRemove = vi.spyOn(window, "removeEventListener");
    const viewportAdd = vi.spyOn(viewport, "addEventListener");
    const viewportRemove = vi.spyOn(viewport, "removeEventListener");

    const hook = renderHook(({ open }) => useWindowFitment({ isOpen: open }), {
      initialProps: { open: false },
    });
    expect(windowAdd).not.toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true,
    );

    hook.rerender({ open: true });
    expect(windowAdd).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true,
    );
    expect(viewportAdd).toHaveBeenCalledWith("scroll", expect.any(Function));
    act(() => viewport.dispatchEvent(new Event("scroll")));
    hook.unmount();

    expect(windowRemove).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true,
    );
    expect(viewportRemove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("remeasures when reopened after the trigger moved without a scroll event", () => {
    const hook = renderHook(
      ({ open }) =>
        useWindowFitment({
          isOpen: open,
          preferredDirections: ["block-end"],
        }),
      { initialProps: { open: true } },
    );
    (
      hook.result.current.targetRef as MutableRefObject<HTMLElement | null>
    ).current = target;
    (
      hook.result.current.popupRef as MutableRefObject<HTMLDivElement | null>
    ).current = popup;
    hook.rerender({ open: true });
    expect(hook.result.current.bestPosition?.position.top).toBe(120);

    hook.rerender({ open: false });
    targetTop = 240;
    hook.rerender({ open: true });

    expect(hook.result.current.bestPosition?.position.top).toBe(260);
  });

  it("keeps a fully off-screen trigger at its natural popup position", () => {
    targetTop = 900;
    const hook = renderOpenFitment();

    expect(hook.result.current.bestPosition).toMatchObject({
      position: { top: 920, left: 90 },
      fits: false,
      autoFitOffset: { top: 0, left: 0 },
    });
  });
});
