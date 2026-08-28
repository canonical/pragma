/**
 * The `?name` binding every generated lookup query shares.
 *
 * The unit under test is narrow but load-bearing: WHAT an entity's name is
 * decides which entities a `lookup` can address at all, and it must agree with
 * what the `list` story publishes. When it did not, `standard list` handed out
 * `react/component/tsdoc` and `standard lookup react/component/tsdoc` answered
 * ENTITY_NOT_FOUND — the two halves of the declared two-step grammar
 * disagreeing about the same entity.
 */

import { describe, expect, it } from "vitest";
import type { PackLookup } from "../types.js";
import {
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
} from "./buildLookupQuery.js";

/** A class-constrained lookup — the shape every bundled story declares. */
const CONSTRAINED: PackLookup = {
  source: "sparql",
  by: "cs:name",
  type: "cs:CodeStandard",
};

/** The one shape that keeps the strict binding: no class to vouch for `?uri`. */
const UNCONSTRAINED: PackLookup = { source: "sparql", by: "ds:name" };

describe("the shared ?name binding", () => {
  it("makes the `by` triple OPTIONAL and derives a name when a class vouches", () => {
    const query = buildLookupQuery(CONSTRAINED, "react/component/props");
    expect(query).toContain("?uri a cs:CodeStandard .");
    expect(query).toContain("OPTIONAL { ?uri cs:name ?byName . }");
    expect(query).toContain("BIND(COALESCE(?byName,");
  });

  it("derives dot-separated local names with slashes — the spelling `list` publishes", () => {
    // `cs:react.component.props` → `react/component/props`. Pinned because the
    // list story performs the SAME derivation to publish a row's name; a change
    // on one side without the other re-opens the unaddressable-name defect.
    expect(buildLookupQuery(CONSTRAINED, "x")).toContain(
      'REPLACE(REPLACE(STR(?uri), "^.*[#/]", ""), "\\\\.", "/")',
    );
  });

  it("still REQUIRES the `by` triple when the lookup constrains no class", () => {
    const query = buildLookupQuery(UNCONSTRAINED, "Button");
    expect(query).toContain("?uri ds:name ?name .");
    expect(query).not.toContain("OPTIONAL { ?uri ds:name");
    expect(query).not.toContain("COALESCE");
  });

  it("binds `?uri` before the BIND that reads it (SPARQL scoping)", () => {
    const query = buildLookupQuery(CONSTRAINED, "x");
    expect(query.indexOf("?uri a cs:CodeStandard .")).toBeLessThan(
      query.indexOf("BIND(COALESCE("),
    );
    const byIri = buildLookupByIriQuery(CONSTRAINED, "https://example.test/a");
    expect(
      byIri.indexOf("BIND(<https://example.test/a> AS ?uri)"),
    ).toBeLessThan(byIri.indexOf("BIND(COALESCE("));
  });

  it("uses the SAME binding for the addressable population as for the resolve", () => {
    // Miss-suggestions, glob expansion and `sample`'s draw pool all read this
    // query. A population wider or narrower than the resolve's is how a
    // suggested name could itself miss, and how the advertised
    // `react/component/*` glob expanded over a pool that contained no slashes.
    const names = buildLookupNamesQuery(CONSTRAINED);
    expect(names).toContain("OPTIONAL { ?uri cs:name ?byName . }");
    expect(names).toContain("BIND(COALESCE(?byName,");
    expect(buildLookupNamesQuery(UNCONSTRAINED)).toContain(
      "?uri ds:name ?name .",
    );
  });
});
