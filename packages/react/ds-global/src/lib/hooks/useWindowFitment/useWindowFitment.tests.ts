import { describe, expect, it } from "vitest";
import { computeArrowOffset } from "./useWindowFitment.js";

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
});
