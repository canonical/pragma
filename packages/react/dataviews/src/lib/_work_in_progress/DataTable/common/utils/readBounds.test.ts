/** The bounds a resize is held to come from the declared sizing alone. */
import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../../types.js";
import readBounds from "./readBounds.js";
import readSizing from "./readSizing.js";

const name: DataTableColumn = { id: "name", header: "Name" };

describe("readBounds", () => {
  it("holds a flexible column to its declared minimum and maximum", () => {
    expect(
      readBounds({ kind: "flex", weight: 1, minPx: 120, maxPx: 240 }),
    ).toEqual({ min: 120, max: 240 });
  });

  it("leaves a flexible column without a maximum unbounded above", () => {
    expect(readBounds({ kind: "flex", weight: 1, minPx: 120 })).toEqual({
      min: 120,
      max: Number.POSITIVE_INFINITY,
    });
    // The default sizing is flexible too, with its 96px minimum.
    expect(readBounds(readSizing(name))).toEqual({
      min: 96,
      max: Number.POSITIVE_INFINITY,
    });
  });

  it("lets a fixed column go anywhere from zero", () => {
    expect(readBounds({ kind: "fixed", px: 80 })).toEqual({
      min: 0,
      max: Number.POSITIVE_INFINITY,
    });
  });
});
