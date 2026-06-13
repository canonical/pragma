// =============================================================================
// Plugin integration (§9): createSchemaPlugin via createStore, store.api,
// sdlOutput writing, extensions (object + factory), standardVocabFields.
// =============================================================================

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestStore } from "@canonical/ke/testing";
import { GraphQLString, graphql } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import type { EntityValue, SchemaPluginApi } from "#compiler";
import { MINIMAL_TTL, PREFIXES } from "#testing";
import createSchemaPlugin from "./createSchemaPlugin.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

describe("createSchemaPlugin (§9)", () => {
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

  it("generates instance-level standard-vocab fields (EC.15)", async () => {
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
});
