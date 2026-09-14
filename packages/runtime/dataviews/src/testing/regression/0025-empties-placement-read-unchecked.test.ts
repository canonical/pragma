/**
 * Regression: a placement of empty values is checked.
 *
 * Before the fix, a JavaScript author's placement other than `first` or
 * `last` was carried into the declaration unchecked, and silently read as
 * last, so a typo placed empties where the source did not.
 */

import { describe, expect, it } from "vitest";
import { createCollection } from "../../lib/collection/index.js";
import {
  type CapabilityDeclaration,
  declareCapabilities,
} from "../../lib/source/index.js";

const collection = createCollection({
  identify: (row: { readonly id: string }) => row.id,
  fields: [{ field: "cores", kind: "number" }],
});

type Declaration = CapabilityDeclaration<typeof collection.schema.fields>;

describe("regression 0025 — a placement of empty values read unchecked", () => {
  it("refuses a placement that is neither first nor last", () => {
    expect(() =>
      declareCapabilities(collection, {
        sort: { fields: ["cores"], terms: 1, empties: { cores: "top" } },
      } as unknown as Declaration),
    ).toThrow(
      'empty values of "cores" are placed "top", which is neither first nor last',
    );
  });

  it("refuses a placement a JavaScript author left empty or null", () => {
    for (const placement of [null, ""]) {
      expect(() =>
        declareCapabilities(collection, {
          sort: { fields: ["cores"], terms: 1, empties: { cores: placement } },
        } as unknown as Declaration),
      ).toThrow("which is neither first nor last");
    }
  });
});
