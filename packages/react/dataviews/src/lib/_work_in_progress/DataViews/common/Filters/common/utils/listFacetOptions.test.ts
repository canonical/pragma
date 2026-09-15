import type { Count } from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import listFacetOptions from "./listFacetOptions.js";

const ONE: Count = { kind: "exact", value: 1 };

describe("listFacetOptions", () => {
  it("lists each value once as its text, in the facet's order", () => {
    expect(
      listFacetOptions({
        kind: "values",
        values: [
          { value: "eu", count: ONE },
          { value: 42, count: ONE },
          { value: "42", count: ONE },
          { value: "us", count: ONE },
        ],
      }),
    ).toEqual(["eu", "42", "us"]);
  });

  it("lists neither the empty text nor a flag's value", () => {
    expect(
      listFacetOptions({
        kind: "values",
        values: [
          { value: "", count: ONE },
          { value: true, count: ONE },
          { value: "ap", count: ONE },
        ],
      }),
    ).toEqual(["ap"]);
  });

  it("lists nothing for a range, or for no facet", () => {
    expect(listFacetOptions({ kind: "range", min: 1, max: 4 })).toEqual([]);
    expect(listFacetOptions(undefined)).toEqual([]);
  });
});
