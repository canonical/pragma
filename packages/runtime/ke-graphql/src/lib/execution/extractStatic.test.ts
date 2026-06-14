// =============================================================================
// Path B static extraction: variable-type enumeration, embeddable-class skip,
// and incremental drain-and-merge through extractStatic.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { type CompilerResult, compile, createStoreQueryFn } from "#compiler";
import type { CompilerContext } from "#shared";
import {
  BLANK_NODES_TTL,
  DS_REALISTIC_TTL,
  MINIMAL_TTL,
  PREFIXES,
} from "#testing";
import extractStatic from "./extractStatic.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const setup = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<{ result: CompilerResult; context: CompilerContext }> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(createStoreQueryFn(store), PREFIXES, options);
  return { result, context: result.createContext(store) };
};

describe("extractStatic variable enumeration", () => {
  it("accepts every uri-shaped variable type and skips embeddable classes", async () => {
    // BLANK_NODES_TTL has ex:Example as an embeddable (blank-node-only) class —
    // listEntityUris must skip it and enumerate only the named ex:Standard.
    const { result, context } = await setup(BLANK_NODES_TTL);
    const results = await extractStatic({
      schema: result.schema,
      mapped: result.mapped,
      context,
      queries: [
        {
          name: "ByStringReq",
          text: `query Q($uri: String!) { standard(uri: $uri) { title } }`,
          variables: { uri: "String!" },
        },
        {
          name: "ByString",
          text: `query Q($uri: String) { standard(uri: $uri) { title } }`,
          variables: { uri: "String" },
        },
        {
          name: "ByIdReq",
          text: `query Q($uri: ID!) { standard(uri: $uri) { title } }`,
          variables: { uri: "ID!" },
        },
        {
          name: "ById",
          text: `query Q($uri: ID) { standard(uri: $uri) { title } }`,
          variables: { uri: "ID" },
        },
      ],
    });
    // One named ex:Standard instance (ex:s1); the embeddable ex:Example is
    // never enumerated, so every uri query yields exactly one keyed entry.
    for (const prefix of ["ByStringReq", "ByString", "ByIdReq", "ById"]) {
      const keyed = [...results.keys()].filter((k) =>
        k.startsWith(`${prefix}:`),
      );
      expect(keyed).toEqual([`${prefix}:ex:s1`]);
    }
  });

  it("rejects a uri variable whose declared type is missing", async () => {
    // A key present with an undefined value drives the `?? ""` fallback, which
    // is not a uri-shaped type — extractStatic must fail loudly.
    const { result, context } = await setup(MINIMAL_TTL);
    await expect(
      extractStatic({
        schema: result.schema,
        mapped: result.mapped,
        context,
        queries: [
          {
            name: "Untyped",
            text: `query Q($uri: String!) { thing(uri: $uri) { name } }`,
            variables: { uri: undefined as unknown as string },
          },
        ],
      }),
    ).rejects.toThrow(/non-enumerable/);
  });
});

describe("extractStatic incremental drain-and-merge", () => {
  it("merges a deferred result into one complete entry", async () => {
    // An incremental schema + a @defer query make executeLocal return an
    // IncrementalResults stream; extractStatic must drain and merge it.
    const { result, context } = await setup(DS_REALISTIC_TTL, {
      incremental: true,
      mappings: {
        "ds:hasModifierFamily": { graphqlName: "modifierFamilies" },
        "ds:hasSubcomponent": { graphqlName: "subcomponents" },
        "ds:hasProperty": { graphqlName: "properties" },
        "ds:hasModifier": { graphqlName: "modifiers" },
      },
    });
    const results = await extractStatic({
      schema: result.schema,
      mapped: result.mapped,
      context,
      queries: [
        {
          name: "Deferred",
          text: `
            query Deferred {
              component(uri: "ds:global.component.button") {
                name
                ... on Component @defer(label: "summary") { summary }
              }
            }
          `,
        },
      ],
    });
    const merged = results.get("Deferred");
    expect(merged?.errors).toBeUndefined();
    const component = merged?.data?.component as Record<string, unknown>;
    expect(component.name).toBe("Button");
    expect(component.summary).toBe("Primary action trigger.");
  });
});
