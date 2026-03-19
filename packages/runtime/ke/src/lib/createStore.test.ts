import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import createTestStore from "../../testing/createTestStore.js";
import {
  MINIMAL_TTL,
  ORGANIZATIONS_TTL,
  PEOPLE_TTL,
} from "../../testing/fixtures.js";
import { registerMatchers } from "../../testing/registerMatchers.js";
import type { TestStoreResult } from "../../testing/types.js";
import createStore from "./createStore.js";
import definePlugin from "./definePlugin.js";
import { sparql } from "./sparql.js";
import type { AskResult, ConstructResult, SelectResult } from "./types.js";

registerMatchers();

describe("Store creation", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("creates a store from a TTL source", async () => {
    testResult = await createTestStore();
    const { store } = testResult;
    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s <http://schema.org/name> ?name }`,
    );
    expect(result.type).toBe("select");
    expect(result.bindings.length).toBeGreaterThan(0);
  });

  it("creates a store from multiple TTL sources", async () => {
    testResult = await createTestStore({
      ttl: [PEOPLE_TTL, ORGANIZATIONS_TTL],
    });
    const { store } = testResult;
    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s a <http://schema.org/Organization> ; <http://schema.org/name> ?name }`,
    );
    expect(result.type).toBe("select");
    expect(result.bindings.length).toBe(2);
  });

  it("creates a store with minimal TTL", async () => {
    testResult = await createTestStore({ ttl: MINIMAL_TTL });
    const { store } = testResult;
    const result = await store.query(
      sparql`ASK { <http://example.org/subject> <http://example.org/predicate> "object" }`,
    );
    expect(result.type).toBe("ask");
    expect(result.result).toBe(true);
  });
});

describe("SPARQL query execution", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("executes a SELECT query and returns bindings", async () => {
    testResult = await createTestStore();
    const { store } = testResult;
    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s <http://schema.org/name> ?name } ORDER BY ?name`,
    );
    expect(result.type).toBe("select");
    const selectResult = result as SelectResult;
    expect(selectResult.variables).toContain("name");
    expect(selectResult.bindings.length).toBe(3);
    expect(selectResult.bindings.map((b) => b.name)).toContain("Alice");
    expect(selectResult.bindings.map((b) => b.name)).toContain("Bob");
    expect(selectResult.bindings.map((b) => b.name)).toContain("Charlie");
  });

  it("executes a CONSTRUCT query and returns triples", async () => {
    testResult = await createTestStore();
    const { store } = testResult;
    const result = await store.query(
      sparql`CONSTRUCT { ?s <http://schema.org/name> ?name } WHERE { ?s <http://schema.org/name> ?name }`,
    );
    expect(result.type).toBe("construct");
    const constructResult = result as ConstructResult;
    expect(constructResult.triples.length).toBeGreaterThan(0);
    expect(constructResult).toContainTriple({
      predicate: "http://schema.org/name",
      object: "Alice",
    });
  });

  it("executes an ASK query and returns boolean", async () => {
    testResult = await createTestStore();
    const { store } = testResult;

    const trueResult = await store.query(
      sparql`ASK { ?s <http://schema.org/name> "Alice" }`,
    );
    expect(trueResult.type).toBe("ask");
    expect((trueResult as AskResult).result).toBe(true);

    const falseResult = await store.query(
      sparql`ASK { ?s <http://schema.org/name> "NonExistent" }`,
    );
    expect(falseResult.type).toBe("ask");
    expect((falseResult as AskResult).result).toBe(false);
  });
});

describe("Cache", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("creates a cache file on first load", async () => {
    testResult = await createTestStore({ cache: true });
    const { tmpDir } = testResult;
    const cachePath = join(tmpDir, ".cache.nq");
    expect(existsSync(cachePath)).toBe(true);
  });

  it("loads from cache on second creation", async () => {
    // First: create store with cache
    testResult = await createTestStore({ cache: true });
    const { tmpDir, store: store1 } = testResult;

    // Verify first store works
    const result1 = await store1.query(
      sparql`ASK { ?s <http://schema.org/name> "Alice" }`,
    );
    expect((result1 as AskResult).result).toBe(true);

    // Dispose first store
    store1.dispose();

    // Second: create store from same cache
    const cachePath = join(tmpDir, ".cache.nq");
    const store2 = await createStore({
      sources: [], // No sources — should load from cache
      cache: cachePath,
    });

    const result2 = await store2.query(
      sparql`ASK { ?s <http://schema.org/name> "Alice" }`,
    );
    expect((result2 as AskResult).result).toBe(true);

    store2.dispose();
  });
});

describe("Plugin hooks", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("calls onLoad for each source", async () => {
    const loadedSources: string[] = [];
    const plugin = definePlugin({
      name: "load-tracker",
      onLoad(source) {
        loadedSources.push(source.path);
      },
    });

    testResult = await createTestStore({
      ttl: [PEOPLE_TTL, ORGANIZATIONS_TTL],
      plugins: [plugin],
    });

    expect(loadedSources.length).toBe(2);
  });

  it("calls onQuery and allows query modification", async () => {
    const plugin = definePlugin({
      name: "query-modifier",
      onQuery(queryStr) {
        // Add a LIMIT clause to all queries
        if (!queryStr.includes("LIMIT")) {
          return `${queryStr} LIMIT 1`;
        }
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    const { store } = testResult;

    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s <http://schema.org/name> ?name }`,
    );
    expect(result.type).toBe("select");
    expect((result as SelectResult).bindings.length).toBe(1);
  });

  it("calls onResult and allows result modification", async () => {
    const plugin = definePlugin({
      name: "result-modifier",
      onResult(result) {
        if (result.type === "select") {
          return {
            ...result,
            bindings: result.bindings.map((b) => ({
              ...b,
              modified: "true",
            })),
          };
        }
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    const { store } = testResult;

    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s <http://schema.org/name> ?name }`,
    );
    expect(result.type).toBe("select");
    const selectResult = result as SelectResult;
    for (const binding of selectResult.bindings) {
      expect(binding.modified).toBe("true");
    }
  });
});

describe("Prefix expansion", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("expands registered prefixes in queries", async () => {
    testResult = await createTestStore({
      prefixes: {
        schema: "http://schema.org/",
      },
    });
    const { store } = testResult;

    const result = await store.query(
      sparql`SELECT ?name WHERE { ?s schema:name ?name }`,
    );
    expect(result.type).toBe("select");
    expect((result as SelectResult).bindings.length).toBeGreaterThan(0);
  });

  it("exposes registered prefixes as readonly", async () => {
    testResult = await createTestStore({
      prefixes: {
        schema: "http://schema.org/",
        ex: "http://example.org/",
      },
    });
    const { store } = testResult;

    expect(store.prefixes.schema).toBe("http://schema.org/");
    expect(store.prefixes.ex).toBe("http://example.org/");
  });
});

describe("Reload", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("reloads the store from sources", async () => {
    testResult = await createTestStore({ ttl: MINIMAL_TTL });
    const { store, tmpDir } = testResult;

    // Verify initial data
    const before = await store.query(
      sparql`ASK { <http://example.org/subject> <http://example.org/predicate> "object" }`,
    );
    expect((before as AskResult).result).toBe(true);

    // Modify the source file
    const filePath = join(tmpDir, "test-0.ttl");
    writeFileSync(
      filePath,
      `@prefix ex: <http://example.org/> . ex:newSubject ex:newPredicate "newObject" .`,
      "utf-8",
    );

    // Reload
    await store.reload({ force: true });

    // Verify new data
    const after = await store.query(
      sparql`ASK { <http://example.org/newSubject> <http://example.org/newPredicate> "newObject" }`,
    );
    expect((after as AskResult).result).toBe(true);
  });
});
