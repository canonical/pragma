/**
 * Pins the hand-written comparison in `isSupportedNodeVersion` to the range the
 * package actually declares.
 *
 * The implementation encodes `engines.node` as a chain of comparisons rather
 * than parsing it, so nothing structural stops the two drifting apart. This
 * suite closes that by building a SECOND, independent predicate directly from
 * the declared range string and requiring both to agree across a version grid.
 * A change to `engines.node` therefore moves the oracle and fails here until the
 * implementation is moved with it — which a table of hand-written expectations
 * could not do, since its cheapest repair is editing the expectations.
 */

import { describe, expect, it } from "vitest";
import { SUPPORTED_NODE_RANGE } from "../../../constants.js";
import { isSupportedNodeVersion } from "./isSupportedNodeVersion.js";

/**
 * Evaluate a version against a range of the form `>=22.18 <23 || >=23.6`.
 *
 * Deliberately naive and deliberately separate from the implementation: it is
 * an oracle, not a utility, and it throws on any comparator shape it was not
 * written for so a widened range fails loudly instead of silently passing.
 */
function satisfiesDeclaredRange(version: string, range: string): boolean {
  const rank = (major: number, minor: number) => major * 1_000_000 + minor;
  const [major = Number.NaN, minor = Number.NaN] = version.split(".").map(Number);

  return range.split("||").some((clause) =>
    clause
      .trim()
      .split(/\s+/)
      .every((comparator) => {
        // A comparator may be major-only (`<23`) or major.minor (`>=22.18`).
        const parsed = /^(>=|<)(\d+)(?:\.(\d+))?$/.exec(comparator);
        if (!parsed) throw new Error(`oracle cannot parse comparator: ${comparator}`);
        const [, operator, boundMajor, boundMinor] = parsed;
        const actual = rank(major, minor);
        const bound = rank(Number(boundMajor), Number(boundMinor ?? 0));
        return operator === ">=" ? actual >= bound : actual < bound;
      }),
  );
}

const GRID = [
  "20.19.0", "21.7.3",
  "22.0.0", "22.12.0", "22.17.9", "22.18.0", "22.18.1", "22.99.0",
  "23.0.0", "23.5.9", "23.6.0", "23.9.0",
  "24.0.0", "24.18.1", "25.0.0", "26.0.0",
];

describe("isSupportedNodeVersion — agrees with the declared engines range", () => {
  it.each(GRID)("matches the oracle for %s", (version) => {
    expect(isSupportedNodeVersion(version)).toBe(
      satisfiesDeclaredRange(version, SUPPORTED_NODE_RANGE),
    );
  });

  // The oracle is only trustworthy if it can disagree; prove it discriminates
  // rather than returning a constant.
  it("uses an oracle that actually discriminates", () => {
    const verdicts = GRID.map((v) => satisfiesDeclaredRange(v, SUPPORTED_NODE_RANGE));
    expect(verdicts).toContain(true);
    expect(verdicts).toContain(false);
  });

  it("fails closed on a version it cannot parse", () => {
    for (const bad of ["not-a-version", "", "v24.1.0", "24"]) {
      expect(isSupportedNodeVersion(bad)).toBe(false);
    }
  });
});
