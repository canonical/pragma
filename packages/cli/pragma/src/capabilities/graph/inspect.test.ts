/**
 * `graph inspect` over the block fixture graph.
 *
 * Resolves a prefixed name / absolute IRI and returns every predicate/object on
 * the subject, ordered by predicate. (The identical-content mirror with the MCP
 * resource read is asserted in the resources suite.)
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { graphModule } from "./index.js";

const DS = "https://ds.canonical.com/";
const inspectVerb = graphModule.verbs.find(
  (v) => verbKey(v.path) === "graph inspect",
) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
  }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("graph inspect", () => {
  it("resolves a prefixed name and groups triples by predicate", async () => {
    const result = (await inspectVerb.run(
      { uri: "ds:button" },
      rt,
    )) as InspectResult;
    expect(result.uri).toBe(`${DS}button`);
    expect(result.prefixed).toBe("ds:button");
    const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const typeGroup = result.groups.find((g) => g.predicate.value === rdfType);
    // The object is a NamedNode, so it compacts and stays addressable.
    expect(typeGroup?.objects[0]).toMatchObject({
      termType: "NamedNode",
      value: `${DS}Component`,
      prefixed: "ds:Component",
    });
    const summary = result.groups.find(
      (g) => g.predicate.value === `${DS}summary`,
    );
    expect(summary?.objects[0]).toMatchObject({
      termType: "Literal",
      value: "Primary action trigger with optional icon and label.",
    });
  });

  it("never compacts a literal, only a named node", async () => {
    // The lossy string view could not tell these apart, so a literal whose text
    // began with a namespace IRI was rewritten into something that read back as
    // an IRI. Reading ke's term view is what closes that: `ds:figmaLink` here
    // holds a STRING that starts with the `ds:` namespace.
    const result = (await inspectVerb.run(
      { uri: "ds:literalTrap" },
      rt,
    )) as InspectResult;
    const trap = result.groups.find(
      (g) => g.predicate.value === `${DS}figmaLink`,
    );
    expect(trap?.objects[0]?.termType).toBe("Literal");
    expect(trap?.objects[0]?.value).toBe(`${DS}not-an-iri`);
    expect(trap?.objects[0]?.prefixed).toBeUndefined();
  });

  it("carries inbound relations with a true count, capped by detail", async () => {
    // `ds:button.icon` is the OBJECT of `ds:hasSubcomponent` — the relation
    // lives on the other side of the arrow, so a subject-only read could never
    // surface who holds this subcomponent.
    const result = (await inspectVerb.run(
      { uri: "ds:button.icon" },
      rt,
    )) as InspectResult;
    const held = result.inbound.find(
      (g) => g.predicate.value === `${DS}hasSubcomponent`,
    );
    expect(held?.count).toBeGreaterThan(0);
    expect(held?.subjects[0]?.prefixed).toBe("ds:button");
  });

  it("inlines blank nodes as records rather than dead handles", async () => {
    const result = (await inspectVerb.run(
      { uri: "ds:blankHolder" },
      rt,
    )) as InspectResult;
    // The blank object itself is marked unreachable...
    const via = result.groups.find(
      (g) => g.predicate.value === `${DS}changeLog`,
    );
    expect(via?.objects[0]).toMatchObject({
      termType: "BlankNode",
      addressable: false,
    });
    // ...and its content is served as records instead. Asserted as a SET: the
    // order is content-derived (see the next case), never the input order.
    // Record VALUES are terms, not strings: a record's members are as much part
    // of the graph as the subject's own, and flattening them would reintroduce
    // the IRI-versus-literal ambiguity the term projection exists to close.
    const changes = result.nested["ds:changeLog"] ?? [];
    expect(changes).toHaveLength(2);
    expect(changes.map((row) => row["ds:changeType"]?.value).sort()).toEqual([
      "decision",
      "revision",
    ]);
    expect(changes[0]?.["ds:changeType"]?.termType).toBe("Literal");
    // `rdf:type` is hoisted to `type` rather than repeated as a field, and stays
    // a NamedNode — so the Turtle serializer can write it back as `a ds:X`.
    expect(changes[0]?.type).toMatchObject({
      termType: "NamedNode",
      prefixed: "ds:ChangeLogEntry",
    });
  });

  it("counts every inbound edge at summary while listing none", async () => {
    // The cap is what keeps a hub read bounded — this graph's worst is 335
    // inbound edges. `count` must stay the TRUE total at every level: a sample
    // silently passing for the whole set is how "1 implementation" becomes a
    // wrong answer. `ds:global` is the tier both fixture blocks point at.
    const summary = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "summary",
    });
    const result = (await inspectVerb.run(
      { uri: "ds:global" },
      summary.rt,
    )) as InspectResult;
    (await summary.rt.store.get()).store.dispose();

    const tier = result.inbound.find((g) => g.predicate.value === `${DS}tier`);
    expect(result.detail).toBe("summary");
    expect(tier?.count).toBe(2);
    expect(tier?.subjects).toEqual([]);
    expect(tier?.truncated).toBe(true);
    // Blank-node inlining is skipped at summary — it is the expensive half.
    expect(result.nested).toEqual({});
  });

  it("samples a roster instead of listing it, keeping the count exact", async () => {
    // A relation and a roster are not the same kind of edge. `ds:tier` here
    // fans in 22 deep — past the threshold — so the read shows exemplars and
    // says so, rather than paging a list verb's job through a resource read.
    // Listing rosters cost a `detailed` read 19.5 KB on one class of the real
    // graph and 20.9 KB on one tier.
    const detailed = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "detailed",
    });
    const result = (await inspectVerb.run(
      { uri: "ds:rosterHub" },
      detailed.rt,
    )) as InspectResult;
    (await detailed.rt.store.get()).store.dispose();

    const roster = result.inbound.find(
      (g) => g.predicate.value === `${DS}tier`,
    );
    expect(roster?.count).toBe(22);
    expect(roster?.sampled).toBe(true);
    expect(roster?.truncated).toBe(true);
    // Exemplars, not a page — far fewer than the 22 a listed relation would show.
    expect(roster?.subjects.length).toBeLessThan(10);
    expect(roster?.subjects.length).toBeGreaterThan(0);
  });

  it("lists a narrow relation in full, unsampled", async () => {
    // The counterpart: `ds:hasSubcomponent` fans in once, so every subject is
    // part of the answer and none of this bounding applies.
    const result = (await inspectVerb.run(
      { uri: "ds:button.icon" },
      rt,
    )) as InspectResult;
    const held = result.inbound.find(
      (g) => g.predicate.value === `${DS}hasSubcomponent`,
    );
    expect(held?.sampled).toBeUndefined();
    expect(held?.truncated).toBeUndefined();
    expect(held?.subjects).toHaveLength(held?.count ?? 0);
  });

  it("resolves the level from config when no flag is given", async () => {
    // A resource read carries no params, so config is the level it lands on.
    const configured = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      configDetail: "summary",
      detailOrigin: "project",
    });
    const result = (await inspectVerb.run(
      { uri: "ds:global" },
      configured.rt,
    )) as InspectResult;
    (await configured.rt.store.get()).store.dispose();
    expect(result.detail).toBe("summary");
  });

  it("orders nested records by content, not by blank-node label", async () => {
    // Oxigraph re-mints blank-node labels on every load, so ordering by them
    // made two reads of the same unchanged entity disagree.
    const first = (await inspectVerb.run(
      { uri: "ds:blankHolder" },
      rt,
    )) as InspectResult;
    const second = (await inspectVerb.run(
      { uri: "ds:blankHolder" },
      rt,
    )) as InspectResult;
    expect(first.nested).toEqual(second.nested);
  });

  it("resolves an absolute IRI to the same result", async () => {
    const byPrefixed = (await inspectVerb.run(
      { uri: "ds:button" },
      rt,
    )) as InspectResult;
    const byIri = (await inspectVerb.run(
      { uri: `${DS}button` },
      rt,
    )) as InspectResult;
    expect(byIri).toEqual(byPrefixed);
  });

  it("rejects an unknown subject with a not-found error", async () => {
    await expect(inspectVerb.run({ uri: "ds:nonesuch" }, rt)).rejects.toThrow(
      /not found/i,
    );
  });

  it("rejects an injection payload in the URI instead of embedding it", async () => {
    // A prefixed name whose local part tries to break out of the `<iri>` token:
    // resolveUri → assertSafeIri rejects the IRI-breaking characters (`>`, `}`,
    // whitespace) BEFORE any SPARQL is built, so the payload never reaches the
    // query text. It must surface as INVALID_INPUT, not a benign not-found.
    await expect(
      inspectVerb.run({ uri: 'ds:button> } INSERT { ?s ?p "x" } #' }, rt),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("bounds and losslessness the review surfaced", () => {
  it("counts EVERY inbound predicate exactly, whatever the exemplar bound", async () => {
    // One capped query answered counting and exhibiting at once, and answered
    // neither: a single LIMIT applies to the whole ordered result, so the first
    // predicate to fill it under-reported its own count AND every predicate
    // after it vanished — while `count` promised the true total. The roster hub
    // here fans in 22 deep, well past what any level exhibits.
    const result = (await inspectVerb.run(
      { uri: "ds:rosterHub" },
      rt,
    )) as InspectResult;
    const roster = result.inbound.find(
      (g) => g.predicate.value === `${DS}tier`,
    );
    expect(roster?.count).toBe(22);
    // Counted in full, exhibited in part — the two are now separate questions.
    expect(roster?.subjects.length).toBeLessThan(22);
    // And the quiet neighbour survives the noisy one. Under the single capped
    // query, a predicate ordered after one that filled the limit was dropped
    // from the answer entirely.
    const quiet = result.inbound.find(
      (g) => g.predicate.value === `${DS}hasSubcomponent`,
    );
    expect(quiet?.count).toBe(1);
    expect(quiet?.subjects[0]?.prefixed).toBe("ds:probe.quiet");
  });

  it("keeps a blank node reachable from two predicates under both", async () => {
    // Keyed by node alone, whichever `via` arrived first won and the second
    // edge disappeared — and Turtle filters the ordinary blank object out too,
    // so nothing was left to notice the loss by.
    const result = (await inspectVerb.run(
      { uri: "ds:doubleLinked" },
      rt,
    )) as InspectResult;
    expect(result.nested["ds:changeLog"]).toHaveLength(1);
    expect(result.nested["ds:usageNote"]).toHaveLength(1);
  });

  it("says nothing about addressability at a level that exhibits none", async () => {
    // At `summary` EVERY group is empty because the level shows no exemplars.
    // Concluding "none individually addressable" there libels subjects that are
    // perfectly nameable, so the group records what it WOULD have shown.
    const summary = await buildFixtureRuntime({
      ttl: BLOCK_TTL,
      prefixes: BLOCK_PREFIXES,
      detail: "summary",
    });
    const result = (await inspectVerb.run(
      { uri: "ds:global" },
      summary.rt,
    )) as InspectResult;
    (await summary.rt.store.get()).store.dispose();
    const tier = result.inbound.find((g) => g.predicate.value === `${DS}tier`);
    expect(tier?.exhibits).toBe(0);
    expect(tier?.count).toBeGreaterThan(0);
  });

  it("carries the prefix map the payload was compacted against", async () => {
    // A renderer that re-derives it from named nodes misses any prefix used
    // only by the subject, a nested record key, or a literal datatype — and
    // then emits compact names with no matching `@prefix`, i.e. invalid Turtle.
    const result = (await inspectVerb.run(
      { uri: "ds:button" },
      rt,
    )) as InspectResult;
    expect(result.prefixes.ds).toBe(DS);
  });

  it("keeps an RDF 1.2 literal direction rather than flattening it", async () => {
    const result = (await inspectVerb.run(
      { uri: "ds:directional" },
      rt,
    )) as InspectResult;
    const label = result.groups.find((g) => g.predicate.value === `${DS}name`);
    expect(label?.objects[0]).toMatchObject({
      termType: "Literal",
      language: "ar",
      direction: "rtl",
    });
  });
});
