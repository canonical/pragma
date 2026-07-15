/**
 * Bare-core boot — pragma must serve the generic `graph`, `graphql`, and
 * `ontology` surfaces with zero semantic packages loaded. This pins the P0
 * invariant that the core no longer depends on the design-system packages:
 * a store booted with no packages resolves generic queries and each
 * generic operation returns cleanly instead of crashing.
 */

import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EX_NAMESPACE, GRAPHQL_CLEAN_TTL } from "#testing";
import inspectUri from "../graph/operations/inspectUri.js";
import compileSchema from "../graphql/operations/compileSchema.js";
import listOntologies from "../ontology/operations/listOntologies.js";
import { bootStore } from "./bootStore.js";
import { PREFIX_MAP, resolvePrefixes } from "./prefixes.js";

let store: Store;

beforeAll(async () => {
  // The `sources` override boots with zero resolved packages (bare core).
  const boot = await bootStore({ sources: [] });
  store = boot.store;
  expect(boot.packages).toEqual([]);
});

afterAll(() => store?.dispose());

describe("bare-core boot", () => {
  it("carries the generic core prefixes on the store", () => {
    expect(store.prefixes.rdf).toBe(PREFIX_MAP.rdf);
    expect(store.prefixes.owl).toBe(PREFIX_MAP.owl);
  });

  it("serves generic SPARQL without any packages loaded", async () => {
    const result = await store.query(
      "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }",
    );
    expect(result.type).toBe("select");
  });

  it("serves `ontology` — listOntologies returns cleanly, not a crash", async () => {
    await expect(listOntologies(store)).resolves.toEqual([]);
  });

  it("serves `graph` — inspecting an unknown URI reports not-found, not a crash", async () => {
    await expect(
      inspectUri(store, "https://example.org/nothing"),
    ).rejects.toMatchObject({ code: "ENTITY_NOT_FOUND" });
  });

  it("serves `graphql` — compiles a generic ontology with core-only prefixes", async () => {
    const outcome = await compileSchema({
      sources: [
        { content: GRAPHQL_CLEAN_TTL, format: "turtle", path: "x.ttl" },
      ],
      // Package-style prefix layered over the bare core — no DS packages.
      prefixes: resolvePrefixes([{ prefixes: { ex: EX_NAMESPACE } }]),
    });
    expect(outcome.status).toBe("ok");
    expect(outcome.compiled?.sdl).toContain("type Thing");
  });
});
