/**
 * Regression: a runtime that cannot collate still orders numbers
 * numerically.
 *
 * Before the fix, every exception from resolving a declared collation was
 * read as a malformed tag, so a runtime with no `Intl.Collator`, or one
 * whose collator failed for any other reason, fell back to code unit and
 * ordered `node10` before `node2`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import orderNodesByName from "../../../testing/orderNodesByName.js";

/** The ids of two nodes, ordered by name under a tag. */
const orderUnder = (collation: string): readonly string[] =>
  orderNodesByName(
    [
      { id: "n10", name: "node10" },
      { id: "n2", name: "node2" },
    ],
    collation,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("regression 0026 — a missing collator ordered numbers by code point", () => {
  it("orders by digit runs where the runtime has no Intl.Collator", () => {
    // Each case names its own tag: resolved comparisons are cached per tag.
    vi.stubGlobal("Intl", {});
    expect(orderUnder("en-x-nocollator")).toEqual(["n2", "n10"]);
  });

  it("orders by digit runs where the runtime has no Intl at all", () => {
    vi.stubGlobal("Intl", undefined);
    expect(orderUnder("en-x-nointl")).toEqual(["n2", "n10"]);
  });

  it("orders by digit runs where the collator fails for a reason other than the tag", () => {
    vi.stubGlobal("Intl", {
      Collator: Object.assign(function Collator() {}, {
        supportedLocalesOf: () => {
          throw new TypeError("collation data could not be loaded");
        },
      }),
    });
    expect(orderUnder("en-x-brokencollator")).toEqual(["n2", "n10"]);
  });
});
