import { describe, expect, it } from "vitest";
import {
  exactly,
  FACETED_ROWS,
  FACETED_SCHEMA,
} from "../../../testing/fixtures.js";
import { EMPTY_SLICE, type Slice } from "../query/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import readFacets from "./readFacets.js";
import selectRows from "./selectRows.js";

/** The definitions of the named fields, as a source resolves a request's facets. */
const findDefinitions = (
  ...fields: readonly string[]
): readonly SchemaFieldDefinition[] =>
  fields.map((field) => {
    const definition = FACETED_SCHEMA.findField(field);
    if (definition === undefined) {
      throw new Error(`no field ${field}`);
    }
    return definition;
  });

const readFacetsOver = (slice: Slice, ...fields: readonly string[]) =>
  readFacets(
    FACETED_ROWS,
    slice,
    findDefinitions(...fields),
    { schema: FACETED_SCHEMA, searchFields: ["name"] },
    selectRows(
      FACETED_ROWS,
      slice,
      { schema: FACETED_SCHEMA, searchFields: ["name"] },
      null,
    ),
  );

describe("readFacets", () => {
  it("counts each choice value in the field's order, declared options first", () => {
    expect(readFacetsOver(EMPTY_SLICE, "status")).toEqual({
      status: {
        kind: "values",
        // An option no record holds is not listed; values the options do
        // not list follow them, by code unit; a value that is no choice is
        // not counted.
        values: [
          { value: "running", count: exactly(1) },
          { value: "failed", count: exactly(2) },
          { value: "archived", count: exactly(1) },
          { value: "unlisted", count: exactly(1) },
        ],
      },
    });
  });

  it("counts a flag field's set records as one value, and none when none is set", () => {
    // Set as isSet reads it: false is a value, null and absent are not.
    expect(readFacetsOver(EMPTY_SLICE, "owner")).toEqual({
      owner: { kind: "values", values: [{ value: true, count: exactly(2) }] },
    });
    expect(
      readFacetsOver(
        {
          ...EMPTY_SLICE,
          filter: [
            { field: "status", operator: "isAny", operands: ["failed"] },
          ],
        },
        "owner",
      ),
    ).toEqual({ owner: { kind: "values", values: [] } });
  });

  it("bounds a number by the finite numbers the records hold", () => {
    expect(readFacetsOver(EMPTY_SLICE, "cpu")).toEqual({
      cpu: { kind: "range", min: 4, max: 32 },
    });
    expect(
      readFacetsOver({ ...EMPTY_SLICE, search: "no such name" }, "cpu"),
    ).toEqual({ cpu: { kind: "range", min: null, max: null } });
  });

  it("bounds a date by the text the records hold, as a date bound compares it", () => {
    expect(readFacetsOver(EMPTY_SLICE, "updated")).toEqual({
      updated: {
        kind: "range",
        // A Date and epoch milliseconds are no text a bound can reach, so
        // neither is offered.
        min: "2025-12-31",
        max: "2026-01-02",
      },
    });
  });

  it("lifts a field's own predicates, and keeps every other restriction", () => {
    const restricted: Slice = {
      ...EMPTY_SLICE,
      filter: [
        { field: "status", operator: "isAny", operands: ["failed"] },
        { field: "cpu", operator: "gte", operands: [8] },
      ],
    };
    expect(readFacetsOver(restricted, "status", "cpu")).toEqual({
      // Over at least eight cores, whatever the status.
      status: {
        kind: "values",
        values: [
          { value: "failed", count: exactly(2) },
          { value: "unlisted", count: exactly(1) },
        ],
      },
      // Over failed machines, whatever their cores.
      cpu: { kind: "range", min: 8, max: 16 },
    });
  });

  it("computes over the records the search selects", () => {
    expect(readFacetsOver({ ...EMPTY_SLICE, search: "TA" }, "status")).toEqual({
      status: {
        kind: "values",
        values: [
          { value: "failed", count: exactly(1) },
          { value: "unlisted", count: exactly(1) },
        ],
      },
    });
  });

  it("refuses a text field, which has no facet", () => {
    expect(() => readFacetsOver(EMPTY_SLICE, "name")).toThrow(
      'text field "name" has no facet',
    );
  });
});
