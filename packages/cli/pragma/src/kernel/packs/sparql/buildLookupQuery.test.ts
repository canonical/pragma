/**
 * The `?name` binding every generated lookup query shares.
 *
 * The unit under test is narrow but load-bearing: WHAT an entity's name is
 * decides which entities a `lookup` can address at all, and it must agree with
 * what the `list` story publishes. When it did not, `standard list` handed out
 * `react/component/tsdoc` and `standard lookup react/component/tsdoc` answered
 * ENTITY_NOT_FOUND — the two halves of the declared two-step grammar
 * disagreeing about the same entity.
 *
 * The agreement runs in BOTH directions, which is why the fallback is a
 * DECLARATION (`nameFallback: "iri"`) and not an inference from the presence of
 * a class constraint. A story whose list REQUIRES its `by` property publishes no
 * derived name, so deriving one for its lookup would make entities addressable
 * — and sampleable — under names the list never handed out. Both directions are
 * pinned below.
 */

import { describe, expect, it } from "vitest";
import type { PackLookup } from "../types.js";
import {
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
} from "./buildLookupQuery.js";

/** The one story that declares the fallback: `standard`, whose list derives names. */
const DERIVED: PackLookup = {
  source: "sparql",
  by: "cs:name",
  nameFallback: "iri",
  type: "cs:CodeStandard",
};

/**
 * A class-constrained lookup that does NOT declare the fallback — the shape
 * `block`/`token`/`tier`/`concept` declare, whose lists require the `by`
 * property.
 */
const CONSTRAINED: PackLookup = {
  source: "sparql",
  by: "ds:tokenId",
  type: "ds:Token",
};

/** No class to vouch for `?uri`: the strictest binding of the three. */
const UNCONSTRAINED: PackLookup = { source: "sparql", by: "ds:name" };

describe("the shared ?name binding", () => {
  it("makes the `by` triple OPTIONAL and derives a name when the story declares it", () => {
    const query = buildLookupQuery(DERIVED, "react/component/props");
    expect(query).toContain("?uri a cs:CodeStandard .");
    expect(query).toContain("OPTIONAL { ?uri cs:name ?byName . }");
    expect(query).toContain("BIND(COALESCE(?byName,");
  });

  it("derives dot-separated local names with slashes — the spelling `list` publishes", () => {
    // `cs:react.component.props` → `react/component/props`. Pinned because the
    // list story performs the SAME derivation to publish a row's name; a change
    // on one side without the other re-opens the unaddressable-name defect.
    expect(buildLookupQuery(DERIVED, "x")).toContain(
      'REPLACE(REPLACE(STR(?uri), "^.*[#/]", ""), "\\\\.", "/")',
    );
  });

  it("REQUIRES the `by` triple for a class-constrained story that declares no fallback", () => {
    // The narrowing this option exists for. `token list` requires `ds:tokenId`,
    // so a `ds:Token` without one is a row the list never publishes — inferring
    // a derived name from the class constraint alone made it addressable under
    // a name no surface ever handed out.
    const query = buildLookupQuery(CONSTRAINED, "spacing.medium");
    expect(query).toContain("?uri a ds:Token .");
    expect(query).toContain("?uri ds:tokenId ?name .");
    expect(query).not.toContain("COALESCE");
  });

  it("still REQUIRES the `by` triple when the lookup constrains no class", () => {
    const query = buildLookupQuery(UNCONSTRAINED, "Button");
    expect(query).toContain("?uri ds:name ?name .");
    expect(query).not.toContain("OPTIONAL { ?uri ds:name");
    expect(query).not.toContain("COALESCE");
  });

  it("ignores a fallback declared without a class to vouch for it", () => {
    // The schema rejects the pairing outright; this is the builders' own guard,
    // because a derived name with no class constraint leaves `?uri` bound by
    // nothing and scans the whole graph.
    const query = buildLookupQuery(
      { ...UNCONSTRAINED, nameFallback: "iri" },
      "Button",
    );
    expect(query).toContain("?uri ds:name ?name .");
    expect(query).not.toContain("COALESCE");
  });

  it("binds `?uri` before the BIND that reads it (SPARQL scoping)", () => {
    const query = buildLookupQuery(DERIVED, "x");
    expect(query.indexOf("?uri a cs:CodeStandard .")).toBeLessThan(
      query.indexOf("BIND(COALESCE("),
    );
    const byIri = buildLookupByIriQuery(DERIVED, "https://example.test/a");
    expect(
      byIri.indexOf("BIND(<https://example.test/a> AS ?uri)"),
    ).toBeLessThan(byIri.indexOf("BIND(COALESCE("));
  });

  it("keeps the `by` value a LABEL on the IRI-addressed form", () => {
    // An IRI names the entity by itself, so a class constraint is already a
    // sufficient existence check and the `by` triple is a label to project.
    // Unchanged by the fallback option: a `ds:Token` reached by its IRI still
    // resolves whether or not it carries a `ds:tokenId`.
    const byIri = buildLookupByIriQuery(CONSTRAINED, "https://example.test/a");
    expect(byIri).toContain("OPTIONAL { ?uri ds:tokenId ?name . }");
    expect(byIri).not.toContain("COALESCE");
    // With no class to vouch for it, the triple is the only existence check
    // between a typo'd IRI and an empty entity, so it stays required.
    expect(
      buildLookupByIriQuery(UNCONSTRAINED, "https://example.test/a"),
    ).toContain("  ?uri ds:name ?name .");
  });

  it("uses the SAME binding for the addressable population as for the resolve", () => {
    // Miss-suggestions, glob expansion and `sample`'s draw pool all read this
    // query. A population wider or narrower than the resolve's is how a
    // suggested name could itself miss, and how the advertised
    // `react/component/*` glob expanded over a pool that contained no slashes.
    const names = buildLookupNamesQuery(DERIVED);
    expect(names).toContain("OPTIONAL { ?uri cs:name ?byName . }");
    expect(names).toContain("BIND(COALESCE(?byName,");
    // And the narrowing reaches the draw pool too: an unnamed `ds:Token` is not
    // a candidate `token sample` can draw.
    expect(buildLookupNamesQuery(CONSTRAINED)).toContain(
      "?uri ds:tokenId ?name .",
    );
    expect(buildLookupNamesQuery(CONSTRAINED)).not.toContain("COALESCE");
    expect(buildLookupNamesQuery(UNCONSTRAINED)).toContain(
      "?uri ds:name ?name .",
    );
  });
});
