// =============================================================================
// Plugin integration: createSchemaPlugin via createStore, store.api,
// sdlOutput writing, extensions (object + factory), standardVocabFields.
// =============================================================================

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestStore } from "@canonical/ke/testing";
import { GraphQLString, graphql } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compile,
  createStoreQueryFn,
  hashSources,
  type SchemaPluginApi,
  serializeExtraction,
} from "#compiler";
import type { EntityValue } from "#shared";
import { MINIMAL_TTL, PREFIXES } from "#testing";
import createSchemaPlugin from "./createSchemaPlugin.js";

// A TTL whose compile emits diagnostics of every severity without failing
// composition, plus at least one sourceless diagnostic so both arms of the
// log line's `(source)` suffix are taken: V006 (info, boolean property),
// V002 (warning, domainless property), three custom mappings onto one field
// name (M001 error, non-fatal), and a union range (X003 info, sourceless).
const DIAGNOSTIC_TTL = `
@prefix ex: <http://example.org/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ex:Thing a owl:Class ; rdfs:label "Thing" .
ex:Other a owl:Class ; rdfs:label "Other" .
ex:active a owl:DatatypeProperty ; rdfs:domain ex:Thing ; rdfs:range xsd:boolean ; rdfs:label "active" .
ex:foo a owl:DatatypeProperty ; rdfs:domain ex:Thing ; rdfs:range xsd:string ; rdfs:label "foo" .
ex:bar a owl:DatatypeProperty ; rdfs:domain ex:Thing ; rdfs:range xsd:string ; rdfs:label "bar" .
ex:baz a owl:DatatypeProperty ; rdfs:domain ex:Thing ; rdfs:range xsd:string ; rdfs:label "baz" .
ex:orphan a owl:DatatypeProperty ; rdfs:range xsd:string ; rdfs:label "orphan" .
ex:ref a owl:ObjectProperty ; rdfs:domain ex:Thing ; rdfs:range [ owl:unionOf ( ex:Thing ex:Other ) ] ; rdfs:label "ref" .
ex:w a ex:Thing ; ex:active "true" ; ex:foo "f" ; ex:bar "b" ; ex:baz "z" .
ex:o a ex:Other .
`;

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

describe("createSchemaPlugin", () => {
  it("compiles on onReady and exposes the api via store.api", async () => {
    const plugin = createSchemaPlugin();
    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    const api = store.api<SchemaPluginApi>("ke-graphql");
    expect(api).toBeDefined();
    expect(api?.schema.getType("Thing")).toBeDefined();
    expect(api?.sdl).toContain("type Thing");
    expect(api?.nameMap.toGraphQL("http://example.org/Thing")).toBe("Thing");

    // request-time context takes the store (PluginContext is not retained)
    const context = api?.createContext(store);
    const result = await graphql({
      schema: api?.schema as NonNullable<typeof api>["schema"],
      source: `{ thing(uri: "ex:widget") { name } }`,
      contextValue: context,
    });
    expect((result.data?.thing as { name: string }).name).toBe("Widget");
  });

  it("writes the SDL to sdlOutput", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ke-graphql-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const sdlPath = join(dir, "schema.graphql");
    const plugin = createSchemaPlugin({ sdlOutput: sdlPath });
    const { cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    expect(existsSync(sdlPath)).toBe(true);
    expect(readFileSync(sdlPath, "utf-8")).toContain(
      "type Thing implements Node",
    );
  });

  it("registers extensions in object form on types and Query", async () => {
    const plugin = createSchemaPlugin({
      extensions: {
        Thing: {
          shout: {
            type: GraphQLString,
            resolve: (source: EntityValue) => `${source.uri}!`,
          },
        },
        Query: {
          hello: { type: GraphQLString, resolve: () => "world" },
        },
      },
    });
    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    const api = store.api<SchemaPluginApi>("ke-graphql");
    const result = await graphql({
      schema: api?.schema as NonNullable<typeof api>["schema"],
      source: `{ hello thing(uri: "ex:widget") { shout } }`,
      contextValue: api?.createContext(store),
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.hello).toBe("world");
    expect((result.data?.thing as { shout: string }).shout).toBe("ex:widget!");
  });

  it("supports the extensions factory form receiving generated types", async () => {
    const plugin = createSchemaPlugin({
      extensions: (types) => ({
        Query: {
          firstThing: {
            type: types.type("Thing") as NonNullable<
              ReturnType<typeof types.type>
            >,
            resolve: async (_source, _args, ctx) => {
              const uris = await ctx.listLoader.load(
                "http://example.org/Thing",
              );
              return uris[0] ? ctx.entityLoader.load(uris[0]) : null;
            },
          },
        },
      }),
    });
    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    const api = store.api<SchemaPluginApi>("ke-graphql");
    const result = await graphql({
      schema: api?.schema as NonNullable<typeof api>["schema"],
      source: `{ firstThing { name } }`,
      contextValue: api?.createContext(store),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.firstThing as { name: string }).name).toBe("Widget");
  });

  it("reports C001/C002 extension conflicts as composition errors", async () => {
    const plugin = createSchemaPlugin({
      extensions: {
        NoSuchType: {
          x: { type: GraphQLString },
        },
      },
    });
    await expect(
      createTestStore({
        ttl: MINIMAL_TTL,
        prefixes: PREFIXES,
        plugins: [plugin],
      }),
    ).rejects.toThrow(/C001|composition failed/);
  });

  it("generates instance-level standard-vocab fields", async () => {
    const ttl = `${MINIMAL_TTL}
      <http://example.org/widget> <http://www.w3.org/2000/01/rdf-schema#label> "The Widget"@en .
    `;
    const plugin = createSchemaPlugin({
      standardVocabFields: {
        Thing: { "http://www.w3.org/2000/01/rdf-schema#label": "label" },
      },
    });
    const { store, cleanup } = await createTestStore({
      ttl,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    const api = store.api<SchemaPluginApi>("ke-graphql");
    const result = await graphql({
      schema: api?.schema as NonNullable<typeof api>["schema"],
      source: `{ thing(uri: "ex:widget") { label } }`,
      contextValue: api?.createContext(store),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.thing as { label: string }).label).toBe("The Widget");
  });

  it("logs diagnostics to the matching console channel by severity", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    cleanups.push(() => {
      error.mockRestore();
      warn.mockRestore();
      info.mockRestore();
    });
    const plugin = createSchemaPlugin({
      mappings: {
        "ex:foo": { graphqlName: "dup" },
        "ex:bar": { graphqlName: "dup" },
        "ex:baz": { graphqlName: "dup" },
      },
    });
    const { cleanup } = await createTestStore({
      ttl: DIAGNOSTIC_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("M001"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("V002"));
    expect(info).toHaveBeenCalledWith(expect.stringContaining("V006"));
    // The "(source)" suffix is appended only when a diagnostic carries a
    // source: V006 has one, the union diagnostic (X003) does not.
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/V006:.+\(.+\)$/));
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/X003:[^()]*$/));
  });

  it("boots from an extraction artifact given as a file path", async () => {
    // Derive a fresh artifact (matching sourcesHash) from a live compile.
    const probe = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
    });
    cleanups.push(probe.cleanup);
    const artifactJson = serializeExtraction(
      (await compile(createStoreQueryFn(probe.store), PREFIXES)).extraction,
      hashSources([MINIMAL_TTL]),
    );
    const dir = mkdtempSync(join(tmpdir(), "ke-graphql-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const artifactPath = join(dir, "extraction.json");
    writeFileSync(artifactPath, artifactJson, "utf-8");

    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [createSchemaPlugin({ extraction: artifactPath })],
    });
    cleanups.push(cleanup);
    const api = store.api<SchemaPluginApi>("ke-graphql");
    // Artifact boot skips printSchema — empty SDL is the fast-path marker.
    expect(api?.sdl).toBe("");
    expect(api?.schema.getType("Thing")).toBeDefined();
  });

  it("keeps using a fresh artifact across a reload (no fingerprint drift)", async () => {
    const probe = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
    });
    cleanups.push(probe.cleanup);
    const artifactJson = serializeExtraction(
      (await compile(createStoreQueryFn(probe.store), PREFIXES)).extraction,
      hashSources([MINIMAL_TTL]),
    );
    const dir = mkdtempSync(join(tmpdir(), "ke-graphql-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const artifactPath = join(dir, "extraction.json");
    writeFileSync(artifactPath, artifactJson, "utf-8");

    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [createSchemaPlugin({ extraction: artifactPath })],
    });
    cleanups.push(cleanup);
    // Cold boot uses the artifact (empty SDL = fast path).
    expect(store.api<SchemaPluginApi>("ke-graphql")?.sdl).toBe("");
    // ke re-invokes onLoad for every source on reload; the per-cycle reset
    // keeps the fingerprint stable, so the artifact stays fresh (the old
    // accumulating array would XOR to a drifted hash and force a live compile).
    await store.reload({ force: true });
    expect(store.api<SchemaPluginApi>("ke-graphql")?.sdl).toBe("");
  });

  it("recompiles on reload and keeps the api queryable", async () => {
    const plugin = createSchemaPlugin();
    const { store, cleanup } = await createTestStore({
      ttl: MINIMAL_TTL,
      prefixes: PREFIXES,
      plugins: [plugin],
    });
    cleanups.push(cleanup);
    await store.reload({ force: true });
    const api = store.api<SchemaPluginApi>("ke-graphql");
    expect(api?.schema.getType("Thing")).toBeDefined();
    const result = await graphql({
      schema: api?.schema as NonNullable<typeof api>["schema"],
      source: `{ thing(uri: "ex:widget") { name } }`,
      contextValue: api?.createContext(store),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data?.thing as { name: string }).name).toBe("Widget");
  });
});
