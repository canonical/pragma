/**
 * columnTemplate builds the one geometry publication every row consumes.
 * Each case is mutation-tested: changing a track's shape, the measured
 * branch fails one of these assertions.
 */
import { describe, expect, it } from "vitest";
import columnTemplate from "./columnTemplate.js";
import type { ColumnToSize, ResolvedColumn } from "./types.js";

const fixed = (id: string, px: number): ColumnToSize => ({
  id,
  sizing: { kind: "fixed", px },
});

const flex = (
  id: string,
  weight: number,
  minPx: number,
  maxPx?: number,
): ColumnToSize => ({
  id,
  sizing: { kind: "flex", weight, minPx, maxPx },
});

/** A solved vector, as the caller that already ran the solver holds it. */
const solved = (...widths: readonly (readonly [string, number])[]) =>
  widths.map(([id, width]): ResolvedColumn => ({ id, width }));

describe("columnTemplate", () => {
  it("publishes no tracks for a table with no columns", () => {
    expect(columnTemplate([], null)).toBe("none");
    expect(columnTemplate([], [])).toBe("none");
  });

  it("publishes declarative tracks before a width is measured", () => {
    expect(
      columnTemplate([fixed("select", 40), flex("name", 2, 120)], null),
    ).toBe("40px minmax(120px, 2fr)");
  });

  it("caps a bounded flexible column declaratively", () => {
    expect(columnTemplate([flex("status", 1, 80, 200)], null)).toBe(
      "minmax(80px, 200px)",
    );
  });

  it("publishes the solver's resolved vector once a width is measured", () => {
    expect(
      columnTemplate(
        [fixed("select", 40), flex("name", 1, 100)],
        solved(["select", 40], ["name", 260]),
      ),
    ).toBe("40px 260px");
  });
});
