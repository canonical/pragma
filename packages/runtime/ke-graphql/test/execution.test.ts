// =============================================================================
// Execution paths (KG.20/KG.21): local execution, @defer incremental
// delivery, drain-and-merge, the Relay format adapter, static extraction.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { storeQueryFn } from "../src/compiler/index.js";
import {
  type CompilerContext,
  type CompilerResult,
  compile,
  executeLocal,
  extractStatic,
  isIncrementalResults,
  mergeIncremental,
  relayFormatAdapter,
} from "../src/index.js";
import { DS_REALISTIC_TTL, MINIMAL_TTL, PREFIXES } from "./fixtures.js";

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
  const result = await compile(storeQueryFn(store), PREFIXES, options);
  return { result, context: result.createContext(store) };
};

const DEFERRED_QUERY = `
  query ButtonQuery {
    component(uri: "ds:global.component.button") {
      name
      ... DeferredSummary @defer(label: "summary")
    }
  }
  fragment DeferredSummary on Component {
    summary
    tier { name }
  }
`;

const dsOptions = {
  incremental: true,
  mappings: {
    "ds:hasModifierFamily": { graphqlName: "modifierFamilies" },
    "ds:hasSubcomponent": { graphqlName: "subcomponents" },
    "ds:hasProperty": { graphqlName: "properties" },
    "ds:hasModifier": { graphqlName: "modifiers" },
  },
};

describe("executeLocal (KG.20 Path A)", () => {
  it("executes plain documents to a single result", async () => {
    const { result, context } = await setup(MINIMAL_TTL);
    const execution = await executeLocal({
      schema: result.schema,
      source: `{ thing(uri: "ex:widget") { name count } }`,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      expect(execution.errors).toBeUndefined();
      expect(execution.data?.thing).toEqual({ name: "Widget", count: 42 });
    }
  });

  it("returns errors for syntax errors without throwing", async () => {
    const { result, context } = await setup(MINIMAL_TTL);
    const execution = await executeLocal({
      schema: result.schema,
      source: "{ not valid graphql",
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      expect(execution.errors?.length).toBeGreaterThan(0);
    }
  });

  it("produces incremental results for @defer documents", async () => {
    const { result, context } = await setup(DS_REALISTIC_TTL, dsOptions);
    const execution = await executeLocal({
      schema: result.schema,
      source: DEFERRED_QUERY,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(true);
    if (isIncrementalResults(execution)) {
      const merged = await mergeIncremental(execution);
      expect(merged.errors).toBeUndefined();
      const component = merged.data?.component as Record<string, unknown>;
      expect(component.name).toBe("Button");
      expect(component.summary).toBe("Primary action trigger.");
      expect((component.tier as { name: string }).name).toBe("global");
    }
  });
});

describe("relayFormatAdapter (KG.21)", () => {
  it("translates v17 payloads to the Relay legacy shape", async () => {
    const { result, context } = await setup(DS_REALISTIC_TTL, dsOptions);
    const execution = await executeLocal({
      schema: result.schema,
      source: DEFERRED_QUERY,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(true);
    if (!isIncrementalResults(execution)) {
      return;
    }
    const payloads = [];
    for await (const payload of relayFormatAdapter(execution)) {
      payloads.push(payload);
    }
    // initial payload: plain data, no path
    expect(payloads[0]?.path).toBeUndefined();
    expect((payloads[0]?.data?.component as Record<string, unknown>).name).toBe(
      "Button",
    );
    // deferred payload: path + label, is_final on the last
    const deferred = payloads.slice(1);
    expect(deferred.length).toBeGreaterThan(0);
    const last = deferred[deferred.length - 1];
    expect(last?.path).toEqual(["component"]);
    expect(last?.label).toBe("summary");
    expect(last?.extensions?.is_final).toBe(true);
    expect((last?.data as Record<string, unknown>).summary).toBe(
      "Primary action trigger.",
    );
  });
});

describe("extractStatic (KG.20 Path B)", () => {
  it("runs nullary queries once and uri queries per entity", async () => {
    const { result, context } = await setup(MINIMAL_TTL);
    const results = await extractStatic({
      schema: result.schema,
      mapped: result.mapped,
      context,
      queries: [
        {
          name: "AllThings",
          text: `{ things(first: 10) { edges { node { name } } } }`,
        },
        {
          name: "ThingQuery",
          text: `query ThingQuery($uri: String!) { thing(uri: $uri) { name } }`,
          variables: { uri: "String!" },
        },
      ],
    });
    expect(results.get("AllThings")).toBeDefined();
    const perEntity = [...results.keys()].filter((k) =>
      k.startsWith("ThingQuery:"),
    );
    expect(perEntity).toEqual(["ThingQuery:ex:widget"]);
    const widget = results.get("ThingQuery:ex:widget");
    expect((widget?.data?.thing as { name: string }).name).toBe("Widget");
  });

  it("fails loudly on non-enumerable variables (KG.20 pagination constraint)", async () => {
    const { result, context } = await setup(MINIMAL_TTL);
    await expect(
      extractStatic({
        schema: result.schema,
        mapped: result.mapped,
        context,
        queries: [
          {
            name: "Paginated",
            text: `query P($after: String) { things(after: $after) { edges { cursor } } }`,
            variables: { after: "String" },
          },
        ],
      }),
    ).rejects.toThrow(/non-enumerable/);
  });
});
