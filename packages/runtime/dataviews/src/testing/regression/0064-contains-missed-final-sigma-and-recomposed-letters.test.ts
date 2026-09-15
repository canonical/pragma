/**
 * Regression: `contains` finds a word ending in capital sigma, and letters
 * that compose only once lowercased.
 *
 * Before the fix, the fold normalised to NFC and then lowercased. Lowercasing
 * picks the final sigma `ς` where a capital `Σ` ends a word, so `ΟΔΟΣ` folded
 * to `οδος` and was never found inside `ΟΔΟΣΤΡΩΜΑ`, which folds to
 * `οδοστρωμα`. And a lowercase letter may compose where its uppercase cannot:
 * `T` with a combining diaeresis has no precomposed form, `ẗ` does, so the
 * fold of one was not the fold of the other. The fold now reads final sigma
 * as sigma and normalises again after lowercasing.
 */

import { describe, expect, it } from "vitest";
import { declareSort } from "../../../testing/fixtures.js";
import { EMPTY_SLICE } from "../../lib/query/index.js";
import { createSchema } from "../../lib/schema/index.js";
import { executeSlice } from "../../lib/source/index.js";

const schema = createSchema([{ field: "name", kind: "text" }]);

const rows = [
  { id: "greek", name: "ΟΔΟΣΤΡΩΜΑ" },
  { id: "t-diaeresis", name: "T̈" },
];

/** The identities of the rows whose name contains the operand. */
const findContaining = (operand: string): readonly string[] =>
  executeSlice(
    rows,
    {
      ...EMPTY_SLICE,
      filter: [{ field: "name", operator: "contains", operands: [operand] }],
    },
    { schema, sort: declareSort(schema.fieldNames) },
  ).map((row) => row.id);

describe("regression 0064 — contains missed final sigma and recomposed letters", () => {
  it("finds a word ending in capital sigma inside a longer word", () => {
    expect(findContaining("ΟΔΟΣ")).toEqual(["greek"]);
  });

  it("finds a letter that composes only once lowercased", () => {
    expect(findContaining("ẗ")).toEqual(["t-diaeresis"]);
  });
});
