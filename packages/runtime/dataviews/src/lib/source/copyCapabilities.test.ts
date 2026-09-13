import { describe, expect, it } from "vitest";
import {
  declareCapabilities,
  declareSorting,
} from "../../../testing/fixtures.js";
import type { PredicateOperator, SortTerm } from "../query/index.js";
import copyCapabilities from "./copyCapabilities.js";
import type { SourceCapabilities } from "./types.js";

const declared = (
  overrides: Partial<SourceCapabilities> = {},
): SourceCapabilities => declareCapabilities(overrides);

describe("copyCapabilities", () => {
  it("reads a field declared without operators as filterable by none", () => {
    const copy = copyCapabilities(declared({ filter: { cpu: undefined } }));
    expect(copy.filter.cpu).toEqual([]);
  });

  it("keeps the declared operators of a field that has them", () => {
    const copy = copyCapabilities(declared({ filter: { status: ["eq"] } }));
    expect(copy.filter.status).toEqual(["eq"]);
  });

  it("does not change when the declaration is mutated afterwards", () => {
    const filter: Record<string, PredicateOperator[]> = { status: ["eq"] };
    const copy = copyCapabilities(declared({ filter }));
    filter.status?.push("isSet");
    expect(copy.filter.status).toEqual(["eq"]);
  });

  it("reads a field named for a prototype member as absent", () => {
    const copy = copyCapabilities(declared({ filter: { status: ["eq"] } }));
    expect(copy.filter.toString).toBeUndefined();
  });

  it("copies the searchable fields, and keeps no search as none", () => {
    const fields = ["name"];
    const copy = copyCapabilities(declared({ search: { fields } }));
    fields.push("owner");
    expect(copy.search).toEqual({ fields: ["name"] });
    expect(copyCapabilities(declared()).search).toBeNull();
  });

  it("copies the whole ordering block, terms and all", () => {
    const fields = ["cpu"];
    const tiebreak: SortTerm[] = [{ field: "id", direction: "asc" }];
    const copy = copyCapabilities(
      declared({
        sort: {
          fields,
          terms: 2,
          default: [{ field: "cpu", direction: "desc" }],
          tiebreak,
          collation: "en-GB",
        },
      }),
    );
    fields.push("zone");
    tiebreak.push({ field: "name", direction: "asc" });
    expect(copy.sort).toEqual({
      fields: ["cpu"],
      terms: 2,
      default: [{ field: "cpu", direction: "desc" }],
      tiebreak: [{ field: "id", direction: "asc" }],
      collation: "en-GB",
    });
    expect(Object.isFrozen(copy.sort.tiebreak)).toBe(true);
  });

  it("keeps a named tiebreak as the word it was declared with", () => {
    expect(
      copyCapabilities(declared({ sort: declareSorting(["cpu"]) })).sort,
    ).toEqual({
      fields: ["cpu"],
      terms: null,
      default: [],
      tiebreak: "opaque",
      collation: null,
    });
  });

  it("copies the grouping block against a later mutation", () => {
    const fields = ["status"];
    const copy = copyCapabilities(
      declared({
        group: { fields, depth: 2, summaries: "counts", collapse: true },
      }),
    );
    fields.push("zone");
    expect(copy.group).toEqual({
      fields: ["status"],
      depth: 2,
      summaries: "counts",
      collapse: true,
    });
  });

  it("copies the three counts", () => {
    const copy = copyCapabilities(
      declared({
        counts: { visible: "exact", matched: "atLeast", total: "none" },
      }),
    );
    expect(copy.counts).toEqual({
      visible: "exact",
      matched: "atLeast",
      total: "none",
    });
  });

  it("copies a cursor pagination block with its two flags", () => {
    const copy = copyCapabilities(
      declared({
        pagination: { mode: "cursor", backward: true, durable: false },
      }),
    );
    expect(copy.pagination).toEqual({
      mode: "cursor",
      backward: true,
      durable: false,
    });
    expect(copyCapabilities(declared()).pagination).toEqual({ mode: "offset" });
  });

  it("copies each declared row operation", () => {
    const actions = { stop: { targets: "explicit" as const, limit: 10 } };
    const copy = copyCapabilities(declared({ actions }));
    expect(copy.actions.stop).toEqual({ targets: "explicit", limit: 10 });
    expect(Object.isFrozen(copy.actions.stop)).toBe(true);
    expect(copyCapabilities(declared()).actions).toEqual({});
  });

  it("freezes every part of the copy", () => {
    const copy = copyCapabilities(
      declared({
        filter: { status: ["eq"] },
        search: { fields: ["name"] },
        sort: declareSorting(["cpu"]),
      }),
    );
    expect(Object.isFrozen(copy)).toBe(true);
    expect(Object.isFrozen(copy.filter)).toBe(true);
    expect(Object.isFrozen(copy.filter.status)).toBe(true);
    expect(Object.isFrozen(copy.search)).toBe(true);
    expect(Object.isFrozen(copy.sort.fields)).toBe(true);
    expect(Object.isFrozen(copy.group)).toBe(true);
    expect(Object.isFrozen(copy.counts)).toBe(true);
    expect(Object.isFrozen(copy.pagination)).toBe(true);
    expect(Object.isFrozen(copy.selection)).toBe(true);
  });
});
