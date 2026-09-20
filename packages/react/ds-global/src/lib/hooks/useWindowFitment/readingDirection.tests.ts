import { describe, expect, it } from "vitest";
import {
  MENU_PLACEMENT,
  MENU_ROOT_PLACEMENT,
  OVERLAY_PLACEMENT,
} from "./readingDirection.js";
import { resolveLogicalPlacement, toPlacement } from "./useWindowFitment.js";

describe("toPlacement", () => {
  it("coerces a bare logical side to a centred placement", () => {
    expect(toPlacement("inline-end")).toEqual({
      side: "inline-end",
      align: "center",
    });
    expect(toPlacement("block-start")).toEqual({
      side: "block-start",
      align: "center",
    });
  });

  it("passes a placement object through unchanged", () => {
    const placement = { side: "inline-end", align: "start" } as const;
    expect(toPlacement(placement)).toBe(placement);
  });
});

describe("resolveLogicalPlacement", () => {
  it("maps the inline axis by reading direction, block axis dir-invariant (LTR)", () => {
    const ltr = (side: Parameters<typeof toPlacement>[0]) =>
      resolveLogicalPlacement(toPlacement(side), "ltr").direction;
    expect(ltr("inline-start")).toBe("left");
    expect(ltr("inline-end")).toBe("right");
    expect(ltr("block-start")).toBe("top");
    expect(ltr("block-end")).toBe("bottom");
  });

  it("mirrors the inline axis in RTL, leaves the block axis untouched", () => {
    const rtl = (side: Parameters<typeof toPlacement>[0]) =>
      resolveLogicalPlacement(toPlacement(side), "rtl").direction;
    expect(rtl("inline-start")).toBe("right");
    expect(rtl("inline-end")).toBe("left");
    expect(rtl("block-start")).toBe("top");
    expect(rtl("block-end")).toBe("bottom");
  });

  it("passes the alignment through unmodified on an inline side", () => {
    expect(
      resolveLogicalPlacement({ side: "inline-end", align: "end" }, "ltr"),
    ).toEqual({ direction: "right", align: "end" });
    // An inline side's cross-axis is vertical, so alignment is dir-blind.
    expect(
      resolveLogicalPlacement({ side: "inline-end", align: "end" }, "rtl"),
    ).toEqual({ direction: "left", align: "end" });
  });

  it("mirrors start/end alignment on a block side in RTL", () => {
    // A block side's cross-axis is the READING axis, so `start` is the leading
    // edge: left in LTR, right in RTL. `end` is its counterpart.
    expect(
      resolveLogicalPlacement({ side: "block-end", align: "start" }, "ltr"),
    ).toEqual({ direction: "bottom", align: "start" });
    expect(
      resolveLogicalPlacement({ side: "block-end", align: "start" }, "rtl"),
    ).toEqual({ direction: "bottom", align: "end" });
    expect(
      resolveLogicalPlacement({ side: "block-start", align: "end" }, "rtl"),
    ).toEqual({ direction: "top", align: "start" });
  });

  it("leaves centre alignment alone on a block side in RTL", () => {
    // `center` is its own mirror.
    expect(
      resolveLogicalPlacement({ side: "block-end", align: "center" }, "rtl"),
    ).toEqual({ direction: "bottom", align: "center" });
  });

  it("headline: a leading-edge, top-aligned placement mirrors for free", () => {
    const placement = { side: "inline-end", align: "start" } as const;
    // LTR leading edge is the right; RTL leading edge is the left.
    expect(resolveLogicalPlacement(placement, "ltr")).toEqual({
      direction: "right",
      align: "start",
    });
    expect(resolveLogicalPlacement(placement, "rtl")).toEqual({
      direction: "left",
      align: "start",
    });
  });
});

describe("preset placements", () => {
  const resolve = (
    placements:
      | readonly Parameters<typeof toPlacement>[0][]
      | typeof MENU_PLACEMENT,
    dir: "ltr" | "rtl",
  ) => placements.map((p) => resolveLogicalPlacement(toPlacement(p), dir));

  it("MENU_ROOT_PLACEMENT opens below, aligned to the trigger's LEADING edge", () => {
    // LTR: the leading edge is the left one, so the popup's left edge meets the
    // trigger's left edge (`align: "start"`).
    expect(resolve(MENU_ROOT_PLACEMENT, "ltr")[0]).toEqual({
      direction: "bottom",
      align: "start",
    });
    // RTL: the leading edge is the RIGHT one, so the same logical placement must
    // resolve to a trailing (right-edge) physical alignment.
    expect(resolve(MENU_ROOT_PLACEMENT, "rtl")[0]).toEqual({
      direction: "bottom",
      align: "end",
    });
  });

  it("MENU_ROOT_PLACEMENT mirrors its whole fallback chain in RTL", () => {
    const ltr = resolve(MENU_ROOT_PLACEMENT, "ltr");
    const rtl = resolve(MENU_ROOT_PLACEMENT, "rtl");
    // Horizontal overflow → the opposite edge, mirrored.
    expect(ltr[1]).toEqual({ direction: "bottom", align: "end" });
    expect(rtl[1]).toEqual({ direction: "bottom", align: "start" });
    // Vertical overflow → flip above, alignment still mirrored.
    expect(ltr[2]).toEqual({ direction: "top", align: "start" });
    expect(rtl[2]).toEqual({ direction: "top", align: "end" });
    // The lateral last resorts keep their dir-blind (vertical) alignment while
    // the SIDE mirrors.
    expect(ltr[4]).toEqual({ direction: "right", align: "start" });
    expect(rtl[4]).toEqual({ direction: "left", align: "start" });
  });

  it("MENU_PLACEMENT prefers the lateral side, top-aligned, before flipping", () => {
    // Lateral (inline) sides come first; the vertical (block) fallbacks last.
    const ltr = resolve(MENU_PLACEMENT, "ltr");
    // First choice: attach to the leading edge (right in LTR), top-aligned.
    expect(ltr[0]).toEqual({ direction: "right", align: "start" });
    // Then flip the alignment on the SAME lateral side (vertical overflow).
    expect(ltr[1]).toEqual({ direction: "right", align: "end" });
    // Only then flip to the opposite lateral side.
    expect(ltr[2]).toEqual({ direction: "left", align: "start" });
    // The vertical fallbacks come last.
    expect(ltr.at(-2)).toEqual({ direction: "bottom", align: "center" });
    expect(ltr.at(-1)).toEqual({ direction: "top", align: "center" });
  });

  it("MENU_PLACEMENT mirrors to the left in RTL", () => {
    const rtl = resolve(MENU_PLACEMENT, "rtl");
    expect(rtl[0]).toEqual({ direction: "left", align: "start" });
    expect(rtl[2]).toEqual({ direction: "right", align: "start" });
  });

  it("OVERLAY_PLACEMENT resolves to [right, bottom, left, top] centred in LTR", () => {
    expect(resolve(OVERLAY_PLACEMENT, "ltr").map((p) => p.direction)).toEqual([
      "right",
      "bottom",
      "left",
      "top",
    ]);
  });
});
