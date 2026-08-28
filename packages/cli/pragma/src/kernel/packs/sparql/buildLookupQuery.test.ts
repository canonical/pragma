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
 *
 * The second half of this file is the ranking a name resolve ORDERS BY, pinned
 * as EMITTED TEXT with no store. That is deliberate: the store-backed suites
 * prove which block wins, and a store can only ever prove it for the entities it
 * holds — the emission is what says the rank is computed from a scope's declared
 * NAME rather than enumerated, that an asserted rank would take precedence over
 * the derived one, and that a story declaring no ranking is left exactly as it
 * was. None of those three survive as an assertion about one graph.
 */

import { describe, expect, it } from "vitest";
import type { PackLookup } from "../types.js";
import {
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
  buildNameResolveQuery,
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

/**
 * The shape the live `block` story declares: several classes, one of them
 * weighted below the rest, and a scope whose own name carries the hierarchy.
 * Copied from `pragma.conf.ts` rather than imported so a change THERE shows up
 * here as a failing assertion about emitted text, not as a silently different
 * query.
 */
const RANKED: PackLookup = {
  source: "graphql",
  by: "ds:name",
  types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
  weights: { "ds:Subcomponent": 0.6 },
  scopeWeight: {
    via: "ds:tier",
    by: "ds:name",
    falloff: 0.2,
    asserted: "ds:tierRank",
  },
};

describe("the ranking a name resolve orders by", () => {
  it("orders by the score and then by a key that cannot tie", () => {
    // Both halves matter. Without DESC(?score) the ranking is not read at all;
    // without the final STR(?uri) two equally-ranked entities are handed back
    // to the store's scan order, which is the defect one layer up.
    for (const query of [
      buildLookupQuery(RANKED, "Button"),
      buildNameResolveQuery(RANKED, "Button"),
    ]) {
      expect(query).toContain("ORDER BY DESC(?score) STR(?uri)");
    }
  });

  it("returns the rows it ranked instead of discarding them in the store", () => {
    // The lookup still ANSWERS with one entity — that arity is the tool's
    // contract. The limit is gone one layer lower, so the resolver can see what
    // it is choosing between and name it; under `LIMIT 1` the alternatives never
    // left the store and no surface could mention what it had not been told.
    for (const query of [
      buildLookupQuery(RANKED, "Button"),
      buildNameResolveQuery(RANKED, "Button"),
      buildLookupQuery(CONSTRAINED, "spacing.medium"),
    ]) {
      expect(query).not.toContain("LIMIT");
    }
  });

  it("multiplies the two factors rather than tiebreaking between them", () => {
    // The editorial ruling, in the one line that implements it. As a TIEBREAK,
    // the scope would decide before the type ever spoke and a global
    // SUBcomponent would outrank a whole component elsewhere; as a product it
    // does not (0.6 × 1 < 1 × 0.8).
    expect(buildNameResolveQuery(RANKED, "TextInput")).toContain(
      "BIND(IF(?rankType = 0 || ?rankScopeWeight = 0, 0, ?rankType * ?rankScopeWeight) AS ?score)",
    );
  });

  it("DERIVES the scope rank from the scope's declared name, never a list of scopes", () => {
    const query = buildNameResolveQuery(RANKED, "Button");
    // The depth is the separator count in the scope's OWN name. The live tiers
    // spell one scope `ds:apps_launchpad` and "Apps/Launchpad" — only the name
    // carries the slash — so reading the IRI would rank every tier at depth 1.
    expect(query).toContain("OPTIONAL { ?rankScope ds:name ?rankScopeName . }");
    expect(query).toContain(
      'BIND(STRLEN(?rankScopeName) - STRLEN(REPLACE(?rankScopeName, "/", "")) AS ?rankDepth)',
    );
    // No tier is NAMED anywhere in the query: a scope added upstream tomorrow
    // is ranked by the same expression, with no edit here or in the config.
    expect(query).not.toContain("apps_launchpad");
    expect(query).not.toContain("ds:global");
  });

  it("guards the depth-0 product the top scope always hits", () => {
    // oxigraph raises on `0.2 * 0`, and a raising BIND leaves its variable
    // unbound — so the ONE scope that is supposed to win is the one whose
    // weight silently disappears. Pinned as text because it reads like a
    // redundant branch and is not.
    expect(buildNameResolveQuery(RANKED, "Button")).toContain(
      "BIND(1 - IF(?rankDepth = 0, 0, 0.2 * ?rankDepth) AS ?rankDerived)",
    );
  });

  it("lets an ASSERTED rank take precedence over the derived one", () => {
    // The retirement path, stated in the query itself: the day the ontology
    // asserts the ranking, the derived depth stops being consulted and the
    // config declaration is deleted with no code change. Asserting the emitted
    // COALESCE is the only way to pin this — the shipped graph asserts no
    // `ds:tierRank` today, which is exactly the state this outlives.
    expect(buildNameResolveQuery(RANKED, "Button")).toContain(
      "BIND(COALESCE(?rankAsserted, IF(?rankDerived < 0, 0, ?rankDerived), 1) AS ?rankScopeWeight)",
    );
    // …and an entity in no scope at all scores a neutral 1, rather than
    // sinking below every entity that has one.
    const { scopeWeight, ...unscoped } = RANKED;
    expect(scopeWeight).toBeDefined();
    expect(buildNameResolveQuery(unscoped, "Button")).not.toContain(
      "?rankScopeWeight",
    );
  });

  it("weighs the LOWEST declared type, so a demotion is not cancelled", () => {
    // The same rule the MCP listing's `effectiveWeight` states in prose. Tested
    // lowest-first, so an entity in two weighted classes takes the demotion any
    // membership asked for.
    expect(buildNameResolveQuery(RANKED, "Button")).toContain(
      "BIND(IF(EXISTS { ?uri a ds:Subcomponent }, 0.6, 1) AS ?rankType)",
    );
  });

  it("leaves a story that declares NO ranking exactly as it was", () => {
    // Every other noun. The limit is still gone — a name reaching two entities
    // is answered with two on every story — but nothing else is added, and the
    // order stays the total `STR(?uri)` it already had.
    const query = buildLookupQuery(CONSTRAINED, "spacing.medium");
    expect(query).toContain("ORDER BY STR(?uri)");
    expect(query).not.toContain("?score");
    expect(query).not.toContain("?rankType");
    expect(query).not.toContain("LIMIT");
  });

  it("keeps the IRI-addressed forms at LIMIT 1, unranked", () => {
    // An IRI is one entity by construction, so there is nothing to rank and
    // nothing to discard. Ranking it would be pure cost on the hot path.
    const byIri = buildLookupByIriQuery(RANKED, "https://ds.canonical.com/a");
    expect(byIri).toContain("LIMIT 1");
    expect(byIri).not.toContain("?score");
  });

  it("does not PROJECT the score it orders by", () => {
    // `?score` is a ranking artefact, and the sparql path spreads its resolve
    // row straight into the entity — projecting it would put a stray number in
    // `--format json` and in the MCP payload.
    expect(buildNameResolveQuery(RANKED, "Button").split("\n")[0]).toBe(
      "SELECT ?uri ?name WHERE {",
    );
    expect(buildLookupQuery(RANKED, "Button").split("\n")[0]).not.toContain(
      "?score",
    );
  });
});
