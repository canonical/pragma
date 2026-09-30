import type { Item } from "@canonical/ds-types";
import { describe, expect, it } from "vitest";
import { isInteractive } from "./isInteractive.js";

describe("isInteractive", () => {
  // The whole point of the predicate is that two independent flags disqualify a
  // node, so the truth table is the specification.
  it.each([
    { disabled: undefined, presentational: undefined, expected: true },
    { disabled: false, presentational: false, expected: true },
    { disabled: true, presentational: undefined, expected: false },
    { disabled: undefined, presentational: true, expected: false },
    { disabled: true, presentational: true, expected: false },
  ])(
    "is $expected for disabled=$disabled presentational=$presentational",
    ({ disabled, presentational, expected }) => {
      const item: Item = { url: "/a", disabled, presentational };
      expect(isInteractive(item)).toBe(expected);
    },
  );

  it("does not treat presentational as a stronger disabled", () => {
    // A separator is not "an item you may not choose"; it is not an item. The
    // two are readable apart on the node even though traversal skips both.
    const separator: Item = { key: "sep", presentational: true };
    expect(separator.disabled).toBeUndefined();
    expect(isInteractive(separator)).toBe(false);
  });
});
