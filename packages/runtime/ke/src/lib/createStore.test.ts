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
import type {
  AskResult,
  ConstructResult,
  SelectResult,
} from "./types.js";

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
      onLoad(source, _ctx) {
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

describe("Plugin lifecycle — onReady", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("calls onReady with a working PluginContext after sources are loaded", async () => {
    let readyCount = 0;
    const plugin = definePlugin({
      name: "ready-tracker",
      async onReady(ctx) {
        // Plugin can query the fully loaded store
        const result = await ctx.query(
          sparql`ASK { ?s <http://schema.org/name> "Alice" }`,
        );
        expect(result.type).toBe("ask");
        expect((result as AskResult).result).toBe(true);
        readyCount++;
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    expect(readyCount).toBe(1);
  });

  it("can inject triples via ctx.update() in onReady", async () => {
    const plugin = definePlugin({
      name: "injector",
      onReady(ctx) {
        ctx.update(`
          INSERT DATA {
            <http://example.org/injected> <http://example.org/by> "plugin" .
          }
        `);
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    const { store } = testResult;

    const result = await store.query(
      sparql`ASK { <http://example.org/injected> <http://example.org/by> "plugin" }`,
    );
    expect((result as AskResult).result).toBe(true);
  });

  it("can inject triples via ctx.load() in onReady", async () => {
    const plugin = definePlugin({
      name: "loader",
      onReady(ctx) {
        ctx.load(
          `@prefix ex: <http://example.org/> . ex:loaded ex:via "ctx.load" .`,
          { graph: "urn:test:injected" },
        );
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    const { store } = testResult;

    const result = await store.query(
      sparql`ASK { <http://example.org/loaded> <http://example.org/via> "ctx.load" }`,
    );
    expect((result as AskResult).result).toBe(true);
  });
});

describe("Plugin lifecycle — onReload", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("calls onReload after store.reload()", async () => {
    let reloadCount = 0;
    const plugin = definePlugin({
      name: "reload-tracker",
      onReload(_ctx) {
        reloadCount++;
      },
    });

    testResult = await createTestStore({
      ttl: MINIMAL_TTL,
      plugins: [plugin],
    });
    expect(reloadCount).toBe(0);

    await testResult.store.reload({ force: true });
    expect(reloadCount).toBe(1);

    await testResult.store.reload({ force: true });
    expect(reloadCount).toBe(2);
  });
});

describe("Plugin lifecycle — onDispose", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("calls onDispose when the store is disposed", async () => {
    let disposed = false;
    const plugin = definePlugin({
      name: "dispose-tracker",
      onDispose() {
        disposed = true;
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    expect(disposed).toBe(false);

    testResult.store.dispose();
    expect(disposed).toBe(true);
  });

  it("runs onDispose in reverse plugin order (LIFO)", async () => {
    const order: string[] = [];

    const pluginA = definePlugin({
      name: "a",
      onDispose() {
        order.push("a");
      },
    });

    const pluginB = definePlugin({
      name: "b",
      onDispose() {
        order.push("b");
      },
    });

    testResult = await createTestStore({ plugins: [pluginA, pluginB] });
    testResult.store.dispose();

    expect(order).toEqual(["b", "a"]);
  });
});

describe("Plugin API — store.api()", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  it("returns the API exposed by onReady", async () => {
    interface CountApi {
      getTotal(): number;
    }

    const plugin = definePlugin<CountApi>({
      name: "counter",
      async onReady(ctx) {
        const result = (await ctx.query(
          sparql`SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }`,
        )) as SelectResult;
        const total = Number.parseInt(result.bindings[0]!.count!, 10);
        return { getTotal: () => total };
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    const api = testResult.store.api<CountApi>("counter");

    expect(api).toBeDefined();
    expect(api!.getTotal()).toBeGreaterThan(0);
  });

  it("refreshes the API after reload", async () => {
    let callCount = 0;
    interface MyApi {
      getCallCount(): number;
    }

    const plugin = definePlugin<MyApi>({
      name: "call-counter",
      onReady(_ctx) {
        callCount++;
        const snapshot = callCount;
        return { getCallCount: () => snapshot };
      },
      onReload(_ctx) {
        callCount++;
        const snapshot = callCount;
        return { getCallCount: () => snapshot };
      },
    });

    testResult = await createTestStore({
      ttl: MINIMAL_TTL,
      plugins: [plugin],
    });

    expect(testResult.store.api<MyApi>("call-counter")!.getCallCount()).toBe(1);

    await testResult.store.reload({ force: true });

    expect(testResult.store.api<MyApi>("call-counter")!.getCallCount()).toBe(2);
  });

  it("returns undefined for unknown plugin names", async () => {
    testResult = await createTestStore();
    expect(testResult.store.api("nonexistent")).toBeUndefined();
  });

  it("backward compat: plugins without new hooks still work", async () => {
    const queries: string[] = [];
    const plugin = definePlugin({
      name: "legacy",
      onQuery(queryStr) {
        queries.push(queryStr);
      },
    });

    testResult = await createTestStore({ plugins: [plugin] });
    await testResult.store.query(
      sparql`ASK { ?s ?p ?o }`,
    );

    expect(queries.length).toBe(1);
    expect(testResult.store.api("legacy")).toBeUndefined();
  });
});
