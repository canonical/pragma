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
    const changes = result.nested["ds:changeLog"] ?? [];
    expect(changes).toHaveLength(2);
    expect(changes.map((row) => row["ds:changeType"]).sort()).toEqual([
      "decision",
      "revision",
    ]);
    // `rdf:type` is hoisted to `type` rather than repeated as a field.
    expect(changes[0]?.type).toBe("ds:ChangeLogEntry");
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
