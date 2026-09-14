import { describe, expect, it } from "vitest";
import compareDigitRuns from "./compareDigitRuns.js";

/**
 * The comparator as first written: each string split into runs by regular
 * expression. The scan that replaced it, for speed, must order exactly as
 * this does.
 */
const compareBySplitting = (a: string, b: string): number => {
  const compareByCodePoint = (x: string, y: string): number => {
    const left = Array.from(x, (character) => character.codePointAt(0) ?? 0);
    const right = Array.from(y, (character) => character.codePointAt(0) ?? 0);
    for (let at = 0; at < Math.min(left.length, right.length); at += 1) {
      const order = (left.at(at) ?? 0) - (right.at(at) ?? 0);
      if (order !== 0) {
        return Math.sign(order);
      }
    }
    return Math.sign(left.length - right.length);
  };
  const left = a.match(/\d+|\D+/g) ?? [];
  const right = b.match(/\d+|\D+/g) ?? [];
  for (let at = 0; at < Math.min(left.length, right.length); at += 1) {
    const run = left.at(at) ?? "";
    const other = right.at(at) ?? "";
    const order =
      /^\d/.test(run) && /^\d/.test(other)
        ? Math.sign(
            run.replace(/^0+/, "").length - other.replace(/^0+/, "").length,
          ) ||
          compareByCodePoint(run.replace(/^0+/, ""), other.replace(/^0+/, ""))
        : compareByCodePoint(run, other);
    if (order !== 0) {
      return order;
    }
  }
  return Math.sign(left.length - right.length) || compareByCodePoint(a, b);
};

/**
 * Strings of up to twelve characters drawn from digits, zeros, letters of
 * both cases, an accent, a hyphen, a space, a fullwidth tilde, an emoji, and
 * lone surrogate halves beside a private-use character — the last ones ordering
 * one way by code point and the other by UTF-16 unit —
 * from a fixed seed: the same cases
 * on every run, long digit runs followed by more runs among them.
 */
const listSampleStrings = (count: number): readonly string[] => {
  const alphabet = [
    "0",
    "0",
    "1",
    "2",
    "9",
    "a",
    "b",
    "A",
    "é",
    "-",
    " ",
    "\uFF5E",
    "\u{1F600}",
    "\uD83D",
    "\uDE00",
    "\uE000",
  ];
  let seed = 7;
  const drawNext = (bound: number): number => {
    seed = (seed * 48271) % 2147483647;
    return seed % bound;
  };
  return Array.from({ length: count }, () =>
    Array.from(
      { length: drawNext(13) },
      () => alphabet.at(drawNext(alphabet.length)) ?? "",
    ).join(""),
  );
};

/** A list sorted by the comparator. */
const sortRuns = (values: readonly string[]): readonly string[] =>
  [...values].sort(compareDigitRuns);

describe("compareDigitRuns", () => {
  it("orders digit runs by the number they spell", () => {
    expect(sortRuns(["item10", "item2", "item1"])).toEqual([
      "item1",
      "item2",
      "item10",
    ]);
    expect(sortRuns(["v1.10", "v1.9", "v1.2"])).toEqual([
      "v1.2",
      "v1.9",
      "v1.10",
    ]);
  });

  it("compares numbers too long for a double without losing a digit", () => {
    expect(
      compareDigitRuns("n12345678901234567890", "n12345678901234567891"),
    ).toBeLessThan(0);
    expect(compareDigitRuns("n100000000000000000000", "n99")).toBeGreaterThan(
      0,
    );
    // Equal after their leading zeros, a long run hands on to the runs after it.
    expect(
      compareDigitRuns("n0000000000000000000012b", "n12a"),
    ).toBeGreaterThan(0);
  });

  it("orders other runs by code point, not as a locale would", () => {
    expect(sortRuns(["b", "Z", "a"])).toEqual(["Z", "a", "b"]);
    expect(sortRuns(["éclair", "eclair", "fig"])).toEqual([
      "eclair",
      "fig",
      "éclair",
    ]);
  });

  it("places a digit run against other text by its first character", () => {
    // "-" is below every digit and "a" above, so a number sits between them.
    expect(sortRuns(["a", "5", "-"])).toEqual(["-", "5", "a"]);
  });

  it("orders a prefix before the longer string it begins", () => {
    expect(sortRuns(["item1a", "item1", "item"])).toEqual([
      "item",
      "item1",
      "item1a",
    ]);
  });

  it("orders by code point where UTF-16 units disagree", () => {
    // U+FF5E is below U+1F600 by code point, above its lead surrogate by unit.
    expect(compareDigitRuns("\uFF5E", "\u{1F600}")).toBeLessThan(0);
    expect(compareDigitRuns("a\u{1F600}b", "a\uFF5Eb")).toBeGreaterThan(0);
    // An astral character is one code point: a string it ends is the shorter.
    expect(compareDigitRuns("x\u{1F600}", "x\u{1F600}y")).toBeLessThan(0);
    // A first run of other text decides by code point before any digit run.
    expect(compareDigitRuns("\uFF5E01", "\u{1F600}1")).toBeLessThan(0);
  });

  it("orders malformed text one way, reading a pair as one code point", () => {
    // A lone high half is its own code point; after a shared high half the
    // pair decides, so the three below sort alike from either end.
    const pair = "\uD83D\uDE00";
    const loneThenPrivate = "\uD83D\uE000";
    const privateUse = "\uE000";
    expect(sortRuns([pair, loneThenPrivate, privateUse])).toEqual([
      loneThenPrivate,
      privateUse,
      pair,
    ]);
    expect(sortRuns([privateUse, loneThenPrivate, pair])).toEqual([
      loneThenPrivate,
      privateUse,
      pair,
    ]);
    // Lone high halves that match leave the units after them to decide.
    expect(compareDigitRuns("\uD83Da", "\uD83Db")).toBeLessThan(0);
  });

  it("breaks a tie the runs leave by code point, so the order is total", () => {
    expect(compareDigitRuns("a02", "a2")).toBeLessThan(0);
    expect(compareDigitRuns("a2", "a02")).toBeGreaterThan(0);
    expect(compareDigitRuns("a2", "a2")).toBe(0);
    expect(compareDigitRuns("", "")).toBe(0);
    expect(compareDigitRuns("", "0")).toBeLessThan(0);
    // Runs that tie over strings one of which begins the other: the shorter.
    expect(compareDigitRuns("a0", "a00")).toBeLessThan(0);
    expect(compareDigitRuns("a00", "a0")).toBeGreaterThan(0);
  });

  it("sorts one way whatever order the values arrive in", () => {
    const values = ["x10", "x9", "x09", "X9", "x", "9", "x9a", "", "x0"];
    const expected = sortRuns(values);
    for (let turn = 0; turn < values.length; turn += 1) {
      const rotated = [...values.slice(turn), ...values.slice(0, turn)];
      expect(sortRuns(rotated)).toEqual(expected);
      expect(sortRuns([...rotated].reverse())).toEqual(expected);
    }
  });

  it("orders every pair of a large sample exactly as splitting into runs does", () => {
    // Collected, then asserted once: a matcher per pair would cost more than
    // the comparisons it checks.
    const samples = listSampleStrings(160);
    const mismatches: string[] = [];
    for (const a of samples) {
      for (const b of samples) {
        const scanned = compareDigitRuns(a, b);
        const split = compareBySplitting(a, b);
        if (scanned !== split) {
          mismatches.push(
            `${JSON.stringify(a)} against ${JSON.stringify(b)}: ${scanned}, not ${split}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("is antisymmetric and transitive over the sample", () => {
    const samples = listSampleStrings(40);
    const violations: string[] = [];
    for (const a of samples) {
      for (const b of samples) {
        if (compareDigitRuns(a, b) !== (-compareDigitRuns(b, a) || 0)) {
          violations.push(`not antisymmetric: ${JSON.stringify([a, b])}`);
        }
        for (const c of samples) {
          if (
            compareDigitRuns(a, b) <= 0 &&
            compareDigitRuns(b, c) <= 0 &&
            compareDigitRuns(a, c) > 0
          ) {
            violations.push(`not transitive: ${JSON.stringify([a, b, c])}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
