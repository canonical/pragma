/**
 * Regression: a facet's value and a server-owned choice's applied set are
 * typed as narrowly as the values they can hold.
 *
 * Before the fix, a facet value was any boolean, though a flag field's
 * facet only ever lists `true`, so a reader had to handle a `false` no source
 * sends; and a choices field whose options are the server's applied a set of
 * strings and numbers, though such a field refuses every operand that is not
 * text, so an adapter had to handle a number it could never receive. Both are
 * now typed as what they hold, and the wider value is a compile error.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { FacetValue } from "../../lib/result/index.js";
import type { AppliedOf } from "../../lib/schema/index.js";

describe("regression 0075 — facet and server-owned option types wider than values", () => {
  it("types a facet value as text, a number or true, never false", () => {
    expectTypeOf<FacetValue["value"]>().toEqualTypeOf<string | number | true>();
    const refused: FacetValue = {
      // @ts-expect-error a flag's facet lists only the records that are set
      value: false,
      count: { kind: "exact", value: 1 },
    };
    expectTypeOf(refused).toEqualTypeOf<FacetValue>();
  });

  it("types a server-owned choice's applied set as text alone", () => {
    type Applied = AppliedOf<{
      readonly field: "region";
      readonly kind: "choices";
    }>;
    expectTypeOf<Applied>().toEqualTypeOf<ReadonlySet<string>>();
    // @ts-expect-error such a field refuses every operand that is not text
    const refused: Applied = new Set([42]);
    expectTypeOf(refused).toEqualTypeOf<Applied>();
  });
});
