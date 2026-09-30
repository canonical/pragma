/**
 * The definitions query contract: the one variables builder that the
 * server prepare step, the prefetch seam, and the explorer's hook all
 * share — `/definitions` (no term) and `/definitions/:term` are the SAME
 * operation, switched by `$hasTerm`, so the builder's exact output is the
 * fulfilment key for every SSR-warmed render.
 */

import { describe, expect, it } from "vitest";
import {
  definitionsExplorerVariables,
  definitionsRouteEntry,
  readTermParam,
} from "./definitionsQuery.js";

describe("readTermParam", () => {
  it("returns undefined for the term-less explorer ({} params)", () => {
    expect(readTermParam({})).toBeUndefined();
  });

  it("returns the decoded term string", () => {
    expect(readTermParam({ term: "ds:UIBlock" })).toBe("ds:UIBlock");
  });

  it("asserts the shape: a present-but-malformed term throws", () => {
    expect(() => readTermParam({ term: 42 })).toThrow(/non-empty string/);
    expect(() => readTermParam({ term: "" })).toThrow(/non-empty string/);
  });
});

describe("definitionsExplorerVariables", () => {
  it("maps a term to { uri: term, hasTerm: true }", () => {
    expect(definitionsExplorerVariables("ds:UIBlock")).toEqual({
      uri: "ds:UIBlock",
      hasTerm: true,
    });
  });

  it("maps no term to the degenerate { uri: '', hasTerm: false }", () => {
    expect(definitionsExplorerVariables(undefined)).toEqual({
      uri: "",
      hasTerm: false,
    });
  });
});

describe("definitionsRouteEntry", () => {
  it("carries the compiled operation text", () => {
    expect(definitionsRouteEntry.query.params.text).toContain(
      "query DefinitionsExplorerQuery",
    );
  });

  it("derives variables from route params through the one builder", () => {
    expect(definitionsRouteEntry.variables({ term: "ds:UIBlock" }, {})).toEqual(
      definitionsExplorerVariables("ds:UIBlock"),
    );
    expect(definitionsRouteEntry.variables({}, {})).toEqual(
      definitionsExplorerVariables(undefined),
    );
  });
});
