import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { P } from "../../shared/prefixes.js";
import executeQuery from "./executeQuery.js";

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
      `SELECT ?name WHERE { ?c a ${P.ds}Component ; ${P.ds}name ?name } ORDER BY ?name`,
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
      `CONSTRUCT { ?c ${P.ds}name ?name } WHERE { ?c a ${P.ds}Component ; ${P.ds}name ?name }`,
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
      `ASK { ?c a ${P.ds}Component ; ${P.ds}name ?name }`,
    );
    expect(result.type).toBe("ask");
    if (result.type === "ask") {
      expect(result.result).toBe(true);
    }
  });

  it("throws PragmaError on invalid SPARQL", async () => {
    await expect(executeQuery(store, "SELECT INVALID SPARQL")).rejects.toThrow(
      PragmaError,
    );

    try {
      await executeQuery(store, "SELECT INVALID SPARQL");
    } catch (e) {
      expect((e as PragmaError).code).toBe("STORE_ERROR");
    }
  });
});
