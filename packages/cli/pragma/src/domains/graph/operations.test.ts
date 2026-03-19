import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import { executeQuery, inspectUri } from "./operations.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("executeQuery", () => {
  it("executes a SELECT query and returns bindings", async () => {
    const result = await executeQuery(
      store,
      'SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name',
    );
    expect(result.type).toBe("select");
    if (result.type === "select") {
      const names = result.bindings.map((b) => b.name);
      expect(names).toContain("Button");
      expect(names).toContain("Card");
    }
  });

  it("executes a CONSTRUCT query and returns triples", async () => {
    const result = await executeQuery(
      store,
      'CONSTRUCT { ?c ds:name ?name } WHERE { ?c a ds:Component ; ds:name ?name }',
    );
    expect(result.type).toBe("construct");
    if (result.type === "construct") {
      expect(result.triples.length).toBeGreaterThan(0);
      const names = result.triples.map((t) => t.object);
      expect(names).toContain("Button");
    }
  });

  it("executes an ASK query and returns boolean", async () => {
    const result = await executeQuery(
      store,
      "ASK { ?c a ds:Component ; ds:name ?name }",
    );
    expect(result.type).toBe("ask");
    if (result.type === "ask") {
      expect(result.result).toBe(true);
    }
  });

  it("throws PragmaError on invalid SPARQL", async () => {
    await expect(
      executeQuery(store, "SELECT INVALID SPARQL"),
    ).rejects.toThrow(PragmaError);

    try {
      await executeQuery(store, "SELECT INVALID SPARQL");
    } catch (e) {
      expect((e as PragmaError).code).toBe("STORE_ERROR");
    }
  });
});

describe("inspectUri", () => {
  it("returns grouped triples for a known URI", async () => {
    const result = await inspectUri(store, "ds:button");
    expect(result.uri).toBe("https://ds.canonical.com/button");
    expect(result.groups.length).toBeGreaterThan(0);

    const predicates = result.groups.map((g) => g.predicate);
    expect(predicates).toContain(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    );
  });

  it("resolves prefixed URIs", async () => {
    const result = await inspectUri(store, "ds:button");
    expect(result.uri).toBe("https://ds.canonical.com/button");
  });

  it("accepts full URIs", async () => {
    const result = await inspectUri(
      store,
      "https://ds.canonical.com/button",
    );
    expect(result.uri).toBe("https://ds.canonical.com/button");
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it("groups objects by predicate", async () => {
    const result = await inspectUri(store, "ds:button");
    const modifierGroup = result.groups.find((g) =>
      g.predicate.includes("modifier"),
    );
    // Button has two modifiers (importance, density)
    if (modifierGroup) {
      expect(modifierGroup.objects.length).toBe(2);
    }
  });

  it("throws PragmaError.notFound for unknown URI", async () => {
    await expect(
      inspectUri(store, "ds:nonexistent_entity"),
    ).rejects.toThrow(PragmaError);

    try {
      await inspectUri(store, "ds:nonexistent_entity");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(
      inspectUri(store, "unknown:something"),
    ).rejects.toThrow(PragmaError);

    try {
      await inspectUri(store, "unknown:something");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });
});
