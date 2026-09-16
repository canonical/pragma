/**
 * An axis over a narrow span of very large numbers stepped by one from a
 * multiple past the integers a number counts exactly, where adding one
 * changes nothing: the loop that placed the ticks could never reach its end,
 * so drawing the range of such a field hung the page. A span no round step
 * can divide is answered with its own two ends instead.
 */

import { describe, expect, it } from "vitest";
import { listNiceTicks } from "../../lib/utils/index.js";

describe("an axis of huge numbers", () => {
  it("answers a span past the exact integers with its own ends", () => {
    const axis = listNiceTicks(1e17, 1e17 + 16, 5);
    expect(axis).toEqual({
      ticks: [1e17, 1e17 + 16],
      low: 1e17,
      high: 1e17 + 16,
    });
  });

  it("answers a span of numbers that are not finite with its own ends", () => {
    expect(listNiceTicks(0, Number.POSITIVE_INFINITY, 4)).toEqual({
      ticks: [0, Number.POSITIVE_INFINITY],
      low: 0,
      high: Number.POSITIVE_INFINITY,
    });
    expect(listNiceTicks(Number.NEGATIVE_INFINITY, 4, 4)).toEqual({
      ticks: [Number.NEGATIVE_INFINITY, 4],
      low: Number.NEGATIVE_INFINITY,
      high: 4,
    });
    // Nothing is ordered against a number that is none: the ends come back
    // as they were given, and no tick is invented between them.
    const notANumber = listNiceTicks(Number.NaN, 4, 4);
    expect(notANumber.ticks).toHaveLength(2);
    expect(notANumber.ticks.at(1)).toBeNaN();
  });

  it("still steps a span it can divide", () => {
    expect(listNiceTicks(0, 12, 4).ticks).toEqual([0, 5, 10, 15]);
  });
});
