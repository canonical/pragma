/**
 * Regression: the fallback comparator orders other runs by code point.
 *
 * Before the fix, the digit-run fallback compared its non-digit runs, and
 * broke its ties, by UTF-16 code unit. The two orders disagree between a
 * character above U+FFFF and one from U+E000 to U+FFFF, so a runtime without
 * locale data ordered an emoji before a fullwidth tilde while a backend
 * comparing by code point, as the ruling for the fallback reads, put the
 * tilde first.
 */

import { describe, expect, it } from "vitest";
import orderNodesByName from "../../../testing/orderNodesByName.js";

describe("regression 0027 — the fallback ordered other runs by code unit", () => {
  it("orders a fullwidth tilde before an emoji when the tag has no data", () => {
    expect(
      orderNodesByName(
        [
          { id: "emoji", name: "\u{1F600}" },
          { id: "tilde", name: "\uFF5E" },
        ],
        "zxx",
      ),
    ).toEqual(["tilde", "emoji"]);
  });
});
