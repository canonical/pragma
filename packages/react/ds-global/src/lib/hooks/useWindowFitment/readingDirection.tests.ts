import { describe, expect, it } from "vitest";
import {
  getReadingDirectionMenuPlacement,
  getReadingDirectionPlacement,
} from "./readingDirection.js";
import { toPlacement } from "./useWindowFitment.js";

describe("toPlacement", () => {
  it("coerces a bare direction to a centred placement", () => {
    expect(toPlacement("right")).toEqual({ direction: "right", align: "center" });
    expect(toPlacement("bottom")).toEqual({
      direction: "bottom",
      align: "center",
    });
  });

  it("passes a placement object through unchanged", () => {
    const placement = { direction: "right", align: "start" } as const;
    expect(toPlacement(placement)).toBe(placement);
  });
});

describe("getReadingDirectionMenuPlacement", () => {
  it("opens to the trigger's leading edge, top-aligned, on LTR", () => {
    const placements = getReadingDirectionMenuPlacement("ltr");
    // First choice: attach to the right, top-aligned (right-start).
    expect(placements[0]).toEqual({ direction: "right", align: "start" });
    // Then bottom-aligned on the same side (vertical-axis flip).
    expect(placements[1]).toEqual({ direction: "right", align: "end" });
    // Then flip the side to the left (side-axis flip), top-aligned first.
    expect(placements[2]).toEqual({ direction: "left", align: "start" });
  });

  it("mirrors to the left on RTL", () => {
    const placements = getReadingDirectionMenuPlacement("rtl");
    expect(placements[0]).toEqual({ direction: "left", align: "start" });
    expect(placements[2]).toEqual({ direction: "right", align: "start" });
  });

  it("defaults to LTR", () => {
    expect(getReadingDirectionMenuPlacement()).toEqual(
      getReadingDirectionMenuPlacement("ltr"),
    );
  });

  it("is distinct from the centred overlay placement (which is arrow-bearing)", () => {
    // The tooltip/popover placement is bare directions (all centred); the menu
    // placement carries explicit alignment.
    const overlay = getReadingDirectionPlacement("ltr");
    expect(overlay.every((entry) => typeof entry === "string")).toBe(true);
    const menu = getReadingDirectionMenuPlacement("ltr");
    expect(menu.some((entry) => entry.align !== "center")).toBe(true);
  });
});
