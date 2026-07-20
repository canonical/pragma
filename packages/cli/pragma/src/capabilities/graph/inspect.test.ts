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
    const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const typeGroup = result.groups.find((g) => g.predicate === rdfType);
    expect(typeGroup?.objects).toContain(`${DS}Component`);
    const summary = result.groups.find((g) => g.predicate === `${DS}summary`);
    expect(summary?.objects[0]).toBe(
      "Primary action trigger with optional icon and label.",
    );
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
