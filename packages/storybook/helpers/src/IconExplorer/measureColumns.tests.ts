import { describe, expect, it } from "vitest";
import { measureColumns } from "./IconExplorer.js";

/** A grid whose cells sit at the given row offsets. */
const gridOf = (tops: number[]): HTMLElement => {
  const grid = document.createElement("div");
  for (const top of tops) {
    const cell = document.createElement("div");
    Object.defineProperty(cell, "offsetTop", {
      value: top,
      configurable: true,
    });
    grid.append(cell);
  }
  return grid;
};

describe("measureColumns", () => {
  it("counts the cells sharing the first row's top", () => {
    expect(measureColumns(gridOf([0, 0, 0, 40, 40, 40]))).toBe(3);
  });

  it("counts a single full row", () => {
    expect(measureColumns(gridOf([0, 0, 0, 0]))).toBe(4);
  });

  it("counts one column when every cell is on its own row", () => {
    expect(measureColumns(gridOf([0, 20, 40]))).toBe(1);
  });

  it("handles a short last row", () => {
    expect(measureColumns(gridOf([0, 0, 40]))).toBe(2);
  });

  it("returns one for an empty or missing grid", () => {
    expect(measureColumns(null)).toBe(1);
    expect(measureColumns(gridOf([]))).toBe(1);
  });

  it("never returns zero when the first cell is out of line", () => {
    expect(measureColumns(gridOf([9, 0, 0]))).toBe(1);
  });
});
