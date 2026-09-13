import { describe, expect, it } from "vitest";
import createSizeIndex from "./createSizeIndex.js";

/** The offsets a plain running sum gives, for comparison. */
const runningOffsets = (sizes: readonly number[]): number[] => {
  const offsets = [0];
  let total = 0;
  for (const size of sizes) {
    total += size;
    offsets.push(total);
  }
  return offsets;
};

/** A deterministic sequence of sizes between 1 and 64. */
const pseudoRandomSizes = (count: number, seed: number): number[] => {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return 1 + (state % 64);
  });
};

describe("createSizeIndex", () => {
  it("answers an empty sequence with nothing", () => {
    const index = createSizeIndex([]);
    expect(index.offset(0)).toBe(0);
    expect(index.at(100)).toBe(0);
  });

  it("finds where each entry starts and which entry covers an offset", () => {
    const index = createSizeIndex([10, 20, 30]);
    expect([0, 1, 2, 3].map(index.offset)).toEqual([0, 10, 30, 60]);
    expect([0, 9.5, 10, 29, 30, 59].map(index.at)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("holds an offset outside the sequence to its ends", () => {
    const index = createSizeIndex([10, 20, 30]);
    expect(index.at(-5)).toBe(0);
    expect(index.at(1000)).toBe(2);
  });

  it("skips an entry that covers nothing", () => {
    expect(createSizeIndex([10, 0, 10]).at(10)).toBe(2);
  });

  it("replaces one size and moves every offset after it", () => {
    const index = createSizeIndex([10, 20, 30]);
    index.set(1, 5);
    expect(index.size(1)).toBe(5);
    expect([1, 2, 3].map(index.offset)).toEqual([10, 15, 45]);
    expect(index.at(15)).toBe(2);
  });

  it("has no size for a position outside the sequence, and sets none", () => {
    const index = createSizeIndex([10, 20]);
    expect(index.size(2)).toBeNaN();
    expect(index.size(-1)).toBeNaN();
    index.set(2, 5);
    index.set(-1, 5);
    expect(index.offset(2)).toBe(30);
    expect([0, 1].map(index.size)).toEqual([10, 20]);
  });

  it("agrees with a running sum through any series of replacements", () => {
    const sizes = pseudoRandomSizes(1000, 7);
    const index = createSizeIndex(sizes);
    for (const [step, size] of pseudoRandomSizes(200, 11).entries()) {
      const position = (step * 37) % sizes.length;
      sizes[position] = size;
      index.set(position, size);
    }
    const offsets = runningOffsets(sizes);
    for (let position = 0; position <= sizes.length; position += 1) {
      expect(index.offset(position)).toBe(offsets[position]);
    }
    for (let position = 0; position < sizes.length; position += 1) {
      const from = offsets[position] ?? Number.NaN;
      const to = offsets[position + 1] ?? Number.NaN;
      expect(index.at(from)).toBe(position);
      expect(index.at(to - 0.5)).toBe(position);
    }
  });
});
