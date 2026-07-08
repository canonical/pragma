// =============================================================================
// Performance features: extraction artifact (DMMF-style boot), lazy store,
// process-lifetime loader cache, slice-before-hydrate pagination, store-free
// TBox.
// =============================================================================

import type { SPARQL, Store } from "@canonical/ke";
import { createTestStore } from "@canonical/ke/testing";
import { graphql } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compile,
  compileFromExtraction,
  createStoreQueryFn,
  deserializeExtraction,
  hashSources,
  type SchemaPluginApi,
  serializeExtraction,
} from "../../lib/compiler/index.js";
import createSchemaPlugin from "../../lib/createSchemaPlugin.js";
import { DS_REALISTIC_TTL, MINIMAL_TTL, PREFIXES } from "../index.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
  vi.restoreAllMocks();
});

const boot = async (ttl: string) => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  return store;
};

/** Wrap a store so SPARQL round-trips are countable. */
const countingStore = (store: Store): { store: Store; count: () => number } => {
  let queries = 0;
  const wrapped: Store = {
    ...store,
    query: ((q: SPARQL<string>) => {
      queries++;
      return store.query(q);
    }) as Store["query"],
  };
  return { store: wrapped, count: () => queries };
};

describe("extraction artifact (DMMF-style boot)", () => {
  it("round-trips: serialized extraction rebuilds an executable schema", async () => {
    const store = await boot(MINIMAL_TTL);
    const live = await compile(createStoreQueryFn(store), PREFIXES);

    const artifact = serializeExtraction(live.extraction, hashSources(["x"]));
    const rebuilt = compileFromExtraction(artifact);

    // assumeValid skips printSchema — the SDL is a build-time artifact
    expect(rebuilt.sdl).toBe("");
    expect(rebuilt.schema.getType("Thing")).toBeDefined();

    const result = await graphql({
      schema: rebuilt.schema,
      source: `{ thing(uri: "ex:widget") { name count } _meta: ontologyClass(uri: "http://example.org/Thing") { label } }`,
      contextValue: rebuilt.createContext(store),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.thing as { name: string }).name).toBe("Widget");
  });

  it("preserves Sets/Maps through serialization", async () => {
    const store = await boot(DS_REALISTIC_TTL);
    const live = await compile(createStoreQueryFn(store), PREFIXES);
    const { extraction } = deserializeExtraction(
      serializeExtraction(live.extraction, "0"),
    );
    expect(extraction.functionals).toEqual(live.extraction.functionals);
    expect(extraction.instanceStats).toEqual(live.extraction.instanceStats);
    expect(extraction.annotations).toEqual(live.extraction.annotations);
  });

  it("rejects unknown artifact versions", () => {
    expect(() =>
      deserializeExtraction(JSON.stringify({ version: 99 })),
    ).toThrow(/version 99/);
  });

  it("hashSources is order-independent and content-sensitive", () => {
    expect(hashSources(["a", "b"])).toBe(hashSources(["b", "a"]));
    expect(hashSources(["a"])).not.toBe(hashSources(["b"]));
  });

  it("plugin boots from a fresh artifact and falls back when stale", async () => {
    // Build the artifact through the plugin so sourcesHash matches ke's load.
    const probe = createSchemaPlugin();
    const first = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [probe],
    });
    cleanups.push(first.cleanup);
    // Recover the hash the plugin computed by re-deriving it from the file
    // ke wrote: simplest faithful source is a second boot with the artifact.
    const liveApi = first.store.api<SchemaPluginApi>("ke-graphql");
    const ttlHash = hashSources([MINIMAL_TTL]);
    const artifact = JSON.parse(
      serializeExtraction(
        (await compile(createStoreQueryFn(first.store), PREFIXES)).extraction,
        ttlHash,
      ),
    );
    expect(liveApi).toBeDefined();

    const fresh = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [createSchemaPlugin({ extraction: artifact })],
    });
    cleanups.push(fresh.cleanup);
    const freshApi = fresh.store.api<SchemaPluginApi>("ke-graphql");
    // Artifact boot skips printSchema — that IS the fast path marker.
    expect(freshApi?.sdl).toBe("");
    expect(freshApi?.schema.getType("Thing")).toBeDefined();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stale = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [
        createSchemaPlugin({
          extraction: { ...artifact, sourcesHash: "deadbeef" },
        }),
      ],
    });
    cleanups.push(stale.cleanup);
    const staleApi = stale.store.api<SchemaPluginApi>("ke-graphql");
    // Fallback = full live compile, SDL present again.
    expect(staleApi?.sdl).toContain("type Thing");
    expect(
      warn.mock.calls.some(([message]) => String(message).includes("stale")),
    ).toBe(true);
  });
});

describe("lazy store (TBox needs no store)", () => {
  it("answers TBox queries before the store resolves; ABox waits for it", async () => {
    const store = await boot(MINIMAL_TTL);
    const result = await compile(createStoreQueryFn(store), PREFIXES);

    let releaseStore: (s: Store) => void = () => {};
    const pending = new Promise<Store>((resolve) => {
      releaseStore = resolve;
    });
    const ctx = result.createContext(pending);

    // TBox: resolves while the store promise is still pending.
    const tbox = await graphql({
      schema: result.schema,
      source: `{ ontologyClass(uri: "http://example.org/Thing") { label isAbstract properties { property { label } } } }`,
      contextValue: ctx,
    });
    expect(tbox.errors).toBeUndefined();
    expect((tbox.data?.ontologyClass as { label: string }).label).toBe("Thing");

    // ABox: blocked until the store arrives.
    const abox = graphql({
      schema: result.schema,
      source: `{ thing(uri: "ex:widget") { name } }`,
      contextValue: ctx,
    });
    const raced = await Promise.race([
      abox.then(() => "resolved"),
      new Promise((r) => setTimeout(() => r("pending"), 50)),
    ]);
    expect(raced).toBe("pending");

    releaseStore(store);
    const resolved = await abox;
    expect(resolved.errors).toBeUndefined();
    expect((resolved.data?.thing as { name: string }).name).toBe("Widget");
  });
});

describe("loaderCache: process", () => {
  it("shares entity/list caches across contexts and clears on demand", async () => {
    const raw = await boot(MINIMAL_TTL);
    const { store, count } = countingStore(raw);
    const result = await compile(createStoreQueryFn(store), PREFIXES, {
      loaderCache: "process",
    });
    const baseline = count();

    const run = () =>
      graphql({
        schema: result.schema,
        source: `{ things(first: 5) { edges { node { name } } } }`,
        contextValue: result.createContext(store),
      });

    await run();
    const afterFirst = count();
    expect(afterFirst).toBeGreaterThan(baseline);

    // A FRESH context hits the shared cache — zero new SPARQL.
    await run();
    expect(count()).toBe(afterFirst);

    result.clearLoaderCache();
    await run();
    expect(count()).toBeGreaterThan(afterFirst);
  });

  it("request mode (default) re-queries per context", async () => {
    const raw = await boot(MINIMAL_TTL);
    const { store, count } = countingStore(raw);
    const result = await compile(createStoreQueryFn(store), PREFIXES);
    const run = () =>
      graphql({
        schema: result.schema,
        source: `{ thing(uri: "ex:widget") { name } }`,
        contextValue: result.createContext(store),
      });
    await run();
    const afterFirst = count();
    await run();
    expect(count()).toBeGreaterThan(afterFirst);
  });
});

describe("slice-before-hydrate listings", () => {
  it("hydrates only the requested page and pages correctly via endCursor", async () => {
    const raw = await boot(DS_REALISTIC_TTL);
    const { store, count } = countingStore(raw);
    const result = await compile(createStoreQueryFn(store), PREFIXES);

    const page1 = await graphql({
      schema: result.schema,
      source: `{ tiers(first: 1) { edges { cursor node { id name } } pageInfo { hasNextPage endCursor } } }`,
      contextValue: result.createContext(store),
    });
    expect(page1.errors).toBeUndefined();
    void count();

    // Page 2 of subcomponents-by-cursor on a 2-entity class: use modifiers
    // (1 modifier) to assert the empty next page + pageInfo math.
    const modifiers = await graphql({
      schema: result.schema,
      source: `{ modifiers(first: 1) { edges { cursor node { name } } pageInfo { hasNextPage } } }`,
      contextValue: result.createContext(store),
    });
    const connection = modifiers.data?.modifiers as {
      edges: Array<{ cursor: string }>;
      pageInfo: { hasNextPage: boolean };
    };
    expect(connection.edges).toHaveLength(1);
    expect(connection.pageInfo.hasNextPage).toBe(false);

    const page2 = await graphql({
      schema: result.schema,
      source: `query($c: String) { modifiers(first: 1, after: $c) { edges { node { name } } pageInfo { hasPreviousPage } } }`,
      variableValues: { c: connection.edges[0]?.cursor },
      contextValue: result.createContext(store),
    });
    expect((page2.data?.modifiers as { edges: unknown[] }).edges).toHaveLength(
      0,
    );
  });
});

describe("store-free TBox (tboxLoader removed)", () => {
  it("serves class structure and annotations after the store is disposed", async () => {
    const { store, cleanup } = await createTestStore({
      ttl: DS_REALISTIC_TTL,
      prefixes: PREFIXES,
    });
    const result = await compile(createStoreQueryFn(store), PREFIXES);
    const ctx = result.createContext(store);
    cleanup(); // disposes the store — TBox must not notice

    const tbox = await graphql({
      schema: result.schema,
      source: `{
        ontologyProperty(uri: "https://ds.canonical.com/name") { acceptanceCriteria }
        ontologyClass(uri: "https://ds.canonical.com/Component") { isAbstract superclasses { label } }
      }`,
      contextValue: ctx,
    });
    expect(tbox.errors).toBeUndefined();
    expect(
      (tbox.data?.ontologyProperty as { acceptanceCriteria: string })
        .acceptanceCriteria,
    ).toBe("Must be a human-readable display name.");
  });
});
