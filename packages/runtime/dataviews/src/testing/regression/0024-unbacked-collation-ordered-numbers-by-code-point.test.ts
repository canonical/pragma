/**
 * Regression: a runtime with no data for the declared collation must still
 * order numbers numerically.
 *
 * Before the fix, a well-formed tag the runtime could not back — most tags on
 * a small-ICU build — fell back to code-unit comparison while the
 * declaration still promised numeric collation, so `node10` ordered before
 * `node2` on exactly the runtimes that lacked the data.
 */

import { describe, expect, it } from "vitest";
import orderNodesByName from "../../../testing/orderNodesByName.js";

describe("regression 0024 — an unbacked collation ordered numbers by code point", () => {
  it("orders digit runs by the number they spell when the tag has no data", () => {
    // "zxx" is well formed and no runtime carries collation data for it,
    // standing in for most tags on a small-ICU build.
    expect(
      orderNodesByName(
        [
          { id: "n10", name: "node10" },
          { id: "n2", name: "node2" },
          { id: "n1", name: "node1" },
        ],
        "zxx",
      ),
    ).toEqual(["n1", "n2", "n10"]);
  });
});
