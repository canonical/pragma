import { describe, expect, it } from "vitest";
import listNiceTicks from "./listNiceTicks.js";

/** Only the ticks an axis draws. */
const readTicks = (from: number, to: number, count: number) =>
  listNiceTicks(from, to, count).ticks;

describe("listNiceTicks", () => {
  it("covers a count from zero in steps of one, two or five", () => {
    expect(readTicks(0, 7, 4)).toEqual([0, 2, 4, 6, 8]);
    expect(readTicks(0, 12, 4)).toEqual([0, 5, 10, 15]);
    expect(readTicks(0, 3, 4)).toEqual([0, 1, 2, 3]);
    expect(readTicks(0, 40, 4)).toEqual([0, 10, 20, 30, 40]);
  });

  it("starts at or below the lower end and ends at or above the upper", () => {
    expect(readTicks(3, 61, 5)).toEqual([0, 20, 40, 60, 80]);
    expect(readTicks(-7, 7, 4)).toEqual([-10, -5, 0, 5, 10]);
  });

  it("names the axis's two ends, its first and last ticks", () => {
    expect(listNiceTicks(3, 61, 5)).toEqual({
      ticks: [0, 20, 40, 60, 80],
      low: 0,
      high: 80,
    });
    expect(listNiceTicks(-7, 7, 4)).toMatchObject({ low: -10, high: 10 });
  });

  it("reads the ends in either order", () => {
    expect(listNiceTicks(12, 0, 4)).toEqual(listNiceTicks(0, 12, 4));
  });

  it("steps in fractions without drifting", () => {
    expect(listNiceTicks(0, 0.3, 3)).toEqual({
      ticks: [0, 0.1, 0.2, 0.3],
      low: 0,
      high: 0.3,
    });
  });

  it("gives a span of no width two ticks, one step apart", () => {
    expect(readTicks(0, 0, 4)).toEqual([0, 0.5]);
    expect(readTicks(8, 8, 4)).toEqual([8, 10]);
  });

  it("takes at least one step whatever count it is asked for", () => {
    expect(readTicks(0, 10, 0)).toEqual([0, 10]);
  });

  it("answers a span asked for more ticks than an axis carries with its ends", () => {
    expect(listNiceTicks(0, 10, 100_000)).toEqual({
      ticks: [0, 10],
      low: 0,
      high: 10,
    });
  });
});
