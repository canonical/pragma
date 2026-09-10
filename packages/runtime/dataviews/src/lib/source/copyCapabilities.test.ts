import { describe, expect, it } from "vitest";
import type { PredicateOperator } from "../query/types.js";
import copyCapabilities from "./copyCapabilities.js";
import type { SourceCapabilities } from "./types.js";

const declared = (
  filter: SourceCapabilities["filter"],
): SourceCapabilities => ({
  filter,
  search: ["name"],
  sort: ["cpu"],
  sortTerms: 1,
  group: [],
  count: "filtered",
});

describe("copyCapabilities", () => {
  it("reads a field declared without operators as filterable by none", () => {
    const copy = copyCapabilities(declared({ cpu: undefined }));
    expect(copy.filter.cpu).toEqual([]);
  });

  it("keeps the declared operators of a field that has them", () => {
    const copy = copyCapabilities(declared({ status: ["eq"] }));
    expect(copy.filter.status).toEqual(["eq"]);
  });

  it("does not change when the declaration is mutated afterwards", () => {
    const filter: Record<string, PredicateOperator[]> = { status: ["eq"] };
    const copy = copyCapabilities(declared(filter));
    filter.status?.push("isSet");
    expect(copy.filter.status).toEqual(["eq"]);
  });

  it("reads a field named for a prototype member as absent", () => {
    const copy = copyCapabilities(declared({ status: ["eq"] }));
    expect(copy.filter.toString).toBeUndefined();
  });
});
