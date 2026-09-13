import { describe, expect, it } from "vitest";
import { declare, declareSort } from "../../../testing/fixtures.js";
import {
  DEFAULT_WINDOW,
  type Query,
  type ResultWindow,
  type Slice,
} from "../query/index.js";
import refusalsOf from "./refusalsOf.js";
import type { SourceCapabilities } from "./types.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: [] };

const query = (
  slice: Partial<Slice> = {},
  window: Partial<ResultWindow> = {},
): Query => ({
  slice: { ...emptySlice, ...slice },
  window: { ...DEFAULT_WINDOW, ...window },
});

/** A source that can execute the whole fixture query. */
const permissive: SourceCapabilities = declare({
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: { fields: ["name"] },
  sort: declareSort(["cpu"], 2),
  group: { fields: ["status"], levels: 2, summaries: "counts", collapse: true },
});

describe("refusalsOf", () => {
  it("refuses nothing when every term is declared", () => {
    expect(
      refusalsOf(
        permissive,
        query(
          {
            filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
            search: "web",
            sort: [{ field: "cpu", direction: "asc" }],
            group: [{ field: "status" }],
          },
          { collapsed: [["failed"]] },
        ),
      ),
    ).toEqual([]);
  });

  it("freezes the refusals it collects", () => {
    expect(Object.isFrozen(refusalsOf(permissive, query()))).toBe(true);
  });

  it("refuses a filter on a field it does not declare", () => {
    expect(
      refusalsOf(
        permissive,
        query({
          filter: [{ field: "zone", operator: "eq", operands: ["eu-west"] }],
        }),
      ),
    ).toEqual([
      {
        part: "filter",
        code: "undeclared-field",
        field: "zone",
        operator: "eq",
        reason: 'field "zone" cannot be filtered',
      },
    ]);
  });

  it("refuses an operator it does not declare for a field it does", () => {
    expect(
      refusalsOf(
        permissive,
        query({
          filter: [{ field: "status", operator: "isSet", operands: [] }],
        }),
      ),
    ).toEqual([
      {
        part: "filter",
        code: "undeclared-operator",
        field: "status",
        operator: "isSet",
        reason: 'field "status" cannot be filtered with isSet',
      },
    ]);
  });

  it("reads a field declared with no operator as unfilterable", () => {
    const refusals = refusalsOf(
      declare({ filter: { cpu: [] } }),
      query({ filter: [{ field: "cpu", operator: "gte", operands: [1] }] }),
    );
    expect(refusals).toMatchObject([
      { code: "undeclared-field", field: "cpu" },
    ]);
  });

  it("refuses a search on a source that declares none", () => {
    expect(refusalsOf(declare({}), query({ search: "web" }))).toEqual([
      {
        part: "search",
        code: "undeclared-field",
        field: null,
        operator: null,
        reason: "this source cannot search",
      },
    ]);
  });

  it("refuses any ordering on a source declaring no sort terms", () => {
    expect(
      refusalsOf(
        declare({}),
        query({ sort: [{ field: "cpu", direction: "asc" }] }),
      ),
    ).toEqual([
      {
        part: "sort",
        code: "too-many-terms",
        field: null,
        operator: null,
        reason: "this source cannot sort",
      },
    ]);
  });

  it("refuses an over-long ordering whole rather than truncating it", () => {
    expect(
      refusalsOf(
        declare({ sort: declareSort(["cpu", "name"], 1) }),
        query({
          sort: [
            { field: "cpu", direction: "asc" },
            { field: "name", direction: "desc" },
          ],
        }),
      ),
    ).toEqual([
      {
        part: "sort",
        code: "too-many-terms",
        field: null,
        operator: null,
        reason: "this source orders by at most 1 term",
      },
    ]);
  });

  it("reports an unsortable field beside the term limit, not instead of it", () => {
    expect(
      refusalsOf(
        declare({ sort: declareSort(["cpu"], 1) }),
        query({
          sort: [
            { field: "cpu", direction: "asc" },
            { field: "zone", direction: "desc" },
          ],
        }),
      ).map((refusal) => [refusal.code, refusal.field]),
    ).toEqual([
      ["too-many-terms", null],
      ["undeclared-field", "zone"],
    ]);
  });

  it("counts a field spelled twice once against the term limit", () => {
    expect(
      refusalsOf(
        declare({ sort: declareSort(["cpu"], 1) }),
        query({
          sort: [
            { field: "cpu", direction: "asc" },
            { field: "cpu", direction: "desc" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("counts the term limit in the plural above one", () => {
    expect(
      refusalsOf(
        declare({
          sort: declareSort(["cpu", "name", "zone"], 2),
        }),
        query({
          sort: [
            { field: "cpu", direction: "asc" },
            { field: "name", direction: "desc" },
            { field: "zone", direction: "asc" },
          ],
        }),
      ),
    ).toMatchObject([{ reason: "this source orders by at most 2 terms" }]);
  });

  it("refuses an ordering term on a field it cannot sort", () => {
    expect(
      refusalsOf(
        declare({ sort: declareSort(["cpu"]) }),
        query({ sort: [{ field: "zone", direction: "asc" }] }),
      ),
    ).toEqual([
      {
        part: "sort",
        code: "undeclared-field",
        field: "zone",
        operator: null,
        reason: 'field "zone" cannot be sorted',
      },
    ]);
  });

  it("refuses any grouping on a source declaring no levels", () => {
    expect(
      refusalsOf(declare({}), query({ group: [{ field: "status" }] })),
    ).toEqual([
      {
        part: "group",
        code: "too-many-levels",
        field: null,
        operator: null,
        reason: "this source cannot group",
      },
    ]);
  });

  it("refuses a grouping nested deeper than it declares", () => {
    const shallow = declare({
      group: {
        fields: ["status", "zone"],
        levels: 1,
        summaries: "none",
        collapse: false,
      },
    });
    // Exactly as deep as declared is within the declaration.
    expect(
      refusalsOf(shallow, query({ group: [{ field: "status" }] })).filter(
        (refusal) => refusal.part === "group",
      ),
    ).toEqual([]);
    expect(
      refusalsOf(
        shallow,
        query({ group: [{ field: "status" }, { field: "zone" }] }),
      ),
    ).toEqual([
      {
        part: "group",
        code: "too-many-levels",
        field: null,
        operator: null,
        reason: "this source groups by at most 1 level",
      },
    ]);
  });

  it("counts the grouping levels in the plural above one", () => {
    const deeper = declare({
      group: {
        fields: ["status"],
        levels: 2,
        summaries: "none",
        collapse: false,
      },
    });
    expect(
      refusalsOf(
        deeper,
        query({
          group: [
            { field: "status" },
            { field: "status" },
            { field: "status" },
          ],
        }),
      ),
    ).toMatchObject([{ reason: "this source groups by at most 2 levels" }]);
  });

  it("refuses a grouping level on a field it cannot group", () => {
    expect(
      refusalsOf(permissive, query({ group: [{ field: "zone" }] })),
    ).toEqual([
      {
        part: "group",
        code: "undeclared-field",
        field: "zone",
        operator: null,
        reason: 'field "zone" cannot be grouped',
      },
    ]);
  });

  it("refuses a collapsed group on a source that cannot leave rows out", () => {
    expect(
      refusalsOf(declare({}), query({}, { collapsed: [["failed"]] })),
    ).toEqual([
      {
        part: "window",
        code: "unsupported-collapse",
        field: null,
        operator: null,
        reason: "this source cannot leave collapsed groups out of a page",
      },
    ]);
  });

  it("refuses a cursor on a source that pages by number", () => {
    expect(refusalsOf(declare({}), query({}, { cursor: "c1" }))).toEqual([
      {
        part: "window",
        code: "unreachable-page",
        field: null,
        operator: null,
        reason: "this source pages by number and reaches no page by token",
      },
    ]);
  });

  it("leaves a cursor alone on a source that pages by token", () => {
    expect(
      refusalsOf(
        declare({
          pagination: { kind: "cursor", backward: false, durable: true },
        }),
        query({}, { cursor: "c1" }),
      ),
    ).toEqual([]);
  });

  it("collects every refusal at once rather than the first", () => {
    expect(
      refusalsOf(
        declare({}),
        query(
          {
            filter: [{ field: "zone", operator: "eq", operands: ["eu"] }],
            search: "web",
            sort: [{ field: "cpu", direction: "asc" }],
            group: [{ field: "status" }],
          },
          { cursor: "c1", collapsed: [["failed"]] },
        ),
      ).map((refusal) => refusal.part),
    ).toEqual(["filter", "search", "sort", "group", "window", "window"]);
  });

  it("canonicalizes first, so one query always refuses the same way", () => {
    const respelled = refusalsOf(
      permissive,
      query({
        filter: [
          { field: "zone", operator: "eq", operands: ["b", "a"] },
          { field: "zone", operator: "eq", operands: ["a", "b"] },
        ],
      }),
    );
    expect(respelled).toHaveLength(1);
    expect(respelled[0]).toMatchObject({ field: "zone" });
  });
});
