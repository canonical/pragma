import { describe, expect, it } from "vitest";
import type { Slice } from "../query/types.js";
import supportsSlice from "./supportsSlice.js";
import type { SourceCapabilities, SourceRefusal } from "./types.js";

const emptySlice: Slice = { filter: [], search: null, sort: [], group: null };

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  ...emptySlice,
  ...overrides,
});

/** A constrained REST endpoint: asymmetric filters and one sort term. */
const rest: SourceCapabilities = {
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: ["name"],
  sort: ["name", "cpu"],
  sortTerms: 1,
  group: [],
  count: "filtered",
};

const refusalsOf = (support: ReturnType<typeof supportsSlice>) =>
  support.status === "unsupported" ? support.refusals : [];

const filterRefusal = (
  field: string,
  operator: SourceRefusal["operator"],
): SourceRefusal => ({
  part: "filter",
  field,
  operator,
  reason: `field "${field}" cannot be filtered with ${operator}`,
});

describe("supportsSlice", () => {
  it("supports a query built only from declared capabilities", () => {
    expect(
      supportsSlice(
        rest,
        slice({
          filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
          search: "web",
          sort: [{ field: "name", direction: "asc" }],
        }),
      ),
    ).toEqual({ status: "supported" });
  });

  it("supports the empty query", () => {
    expect(supportsSlice(rest, emptySlice)).toEqual({ status: "supported" });
  });

  it("refuses an undeclared filter field", () => {
    expect(
      supportsSlice(
        rest,
        slice({
          filter: [{ field: "zone", operator: "eq", operands: ["eu"] }],
        }),
      ),
    ).toEqual({
      status: "unsupported",
      refusals: [filterRefusal("zone", "eq")],
    });
  });

  it("refuses a field named for an Object.prototype member", () => {
    expect(
      supportsSlice(
        rest,
        slice({
          filter: [{ field: "toString", operator: "eq", operands: ["x"] }],
        }),
      ),
    ).toEqual({
      status: "unsupported",
      refusals: [filterRefusal("toString", "eq")],
    });
  });

  it("refuses an operator the field does not declare", () => {
    expect(
      refusalsOf(
        supportsSlice(
          rest,
          slice({
            filter: [{ field: "status", operator: "isSet", operands: [] }],
          }),
        ),
      ),
    ).toEqual([filterRefusal("status", "isSet")]);
  });

  it("refuses search when no field is declared searchable", () => {
    expect(
      refusalsOf(
        supportsSlice({ ...rest, search: [] }, slice({ search: "web" })),
      ),
    ).toEqual([
      {
        part: "search",
        field: null,
        operator: null,
        reason: "this source cannot search",
      },
    ]);
  });

  it("treats an empty search string as no search", () => {
    expect(
      supportsSlice({ ...rest, search: [] }, slice({ search: "" })),
    ).toEqual({ status: "supported" });
  });

  it("refuses multi-sort whole rather than truncating it", () => {
    expect(
      refusalsOf(
        supportsSlice(
          rest,
          slice({
            sort: [
              { field: "name", direction: "asc" },
              { field: "cpu", direction: "desc" },
            ],
          }),
        ),
      ),
    ).toEqual([
      {
        part: "sort",
        field: null,
        operator: null,
        reason: "this source executes at most 1 sort term",
      },
    ]);
  });

  it("counts the term budget in the plural above one", () => {
    expect(
      refusalsOf(
        supportsSlice(
          { ...rest, sortTerms: 2 },
          slice({
            sort: [
              { field: "name", direction: "asc" },
              { field: "cpu", direction: "desc" },
              { field: "name", direction: "desc" },
            ],
          }),
        ),
      )[0]?.reason,
    ).toBe("this source executes at most 2 sort terms");
  });

  it("reports a source that cannot sort at all in its own words", () => {
    expect(
      refusalsOf(
        supportsSlice(
          { ...rest, sortTerms: 0 },
          slice({ sort: [{ field: "name", direction: "asc" }] }),
        ),
      ),
    ).toEqual([
      {
        part: "sort",
        field: null,
        operator: null,
        reason: "this source cannot sort",
      },
    ]);
  });

  it("supports the empty ordering on a source that cannot sort", () => {
    expect(supportsSlice({ ...rest, sortTerms: 0 }, emptySlice)).toEqual({
      status: "supported",
    });
  });

  it("applies no term budget when the source declares none", () => {
    expect(
      supportsSlice(
        { ...rest, sortTerms: null },
        slice({
          sort: [
            { field: "name", direction: "asc" },
            { field: "cpu", direction: "desc" },
          ],
        }),
      ),
    ).toEqual({ status: "supported" });
  });

  it("refuses an unsortable field within the term budget", () => {
    expect(
      refusalsOf(
        supportsSlice(
          rest,
          slice({ sort: [{ field: "zone", direction: "asc" }] }),
        ),
      ),
    ).toEqual([
      {
        part: "sort",
        field: "zone",
        operator: null,
        reason: 'field "zone" cannot be sorted',
      },
    ]);
  });

  it("refuses grouping unless the field is declared groupable", () => {
    expect(supportsSlice(rest, slice({ group: "zone" }))).toEqual({
      status: "unsupported",
      refusals: [
        {
          part: "group",
          field: "zone",
          operator: null,
          reason: 'field "zone" cannot be grouped',
        },
      ],
    });
    expect(
      supportsSlice({ ...rest, group: ["zone"] }, slice({ group: "zone" })),
    ).toEqual({ status: "supported" });
  });

  it("collects every refusal of a query rather than the first", () => {
    expect(
      refusalsOf(
        supportsSlice(
          rest,
          slice({
            filter: [
              { field: "zone", operator: "eq", operands: ["eu"] },
              { field: "status", operator: "isSet", operands: [] },
            ],
            search: "web",
            sort: [{ field: "zone", direction: "asc" }],
            group: "zone",
          }),
        ),
      ).map((refusal) => refusal.part),
    ).toEqual(["filter", "filter", "sort", "group"]);
  });

  it("deduplicates refusals of one address through canonicalization", () => {
    expect(
      refusalsOf(
        supportsSlice(
          rest,
          slice({
            filter: [
              { field: "zone", operator: "eq", operands: ["eu"] },
              { field: "zone", operator: "eq", operands: ["us"] },
            ],
          }),
        ),
      ),
    ).toHaveLength(1);
  });

  it("hands back a frozen refusal list", () => {
    const refusals = refusalsOf(supportsSlice(rest, slice({ group: "zone" })));
    expect(Object.isFrozen(refusals)).toBe(true);
  });
});
