// =============================================================================
// Execution paths: local execution, @defer incremental
// delivery, drain-and-merge, the Relay format adapter, static extraction.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { parse } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  DS_REALISTIC_TTL,
  MINIMAL_TTL,
  PREFIXES,
} from "../../testing/index.js";
import {
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../compiler/index.js";
import type { CompilerContext } from "../shared/index.js";
import extractStatic from "./extractStatic.js";
import {
  executeLocal,
  isIncrementalResults,
  mergeIncremental,
  relayFormatAdapter,
} from "./incremental.js";
import type {
  IncrementalResults,
  InitialIncrementalResult,
  RelayLegacyPayload,
  SubsequentIncrementalResult,
} from "./types.js";

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

describe("executeLocal (in-process execution)", () => {
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

  it("executes plain documents against an incremental schema (v17 forbids execute() there)", async () => {
    const { result, context } = await setup(DS_REALISTIC_TTL, dsOptions);
    const execution = await executeLocal({
      schema: result.schema,
      source: `{ component(uri: "ds:global.component.button") { name } }`,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      expect(execution.errors).toBeUndefined();
      expect((execution.data?.component as Record<string, unknown>).name).toBe(
        "Button",
      );
    }
  });

  it("uses a pre-parsed document and skips its own parse", async () => {
    const { result, context } = await setup(MINIMAL_TTL);
    const document = parse(`{ thing(uri: "ex:widget") { name } }`);
    // The source is deliberately unparseable: if executeLocal honored the
    // document it succeeds; if it re-parsed `source` it would error.
    const execution = await executeLocal({
      schema: result.schema,
      source: "this is not valid graphql",
      document,
      contextValue: context,
    });
    expect(isIncrementalResults(execution)).toBe(false);
    if (!isIncrementalResults(execution)) {
      expect(execution.errors).toBeUndefined();
      expect(execution.data?.thing).toEqual({ name: "Widget" });
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

describe("relayFormatAdapter", () => {
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

// ---------------------------------------------------------------------------
// Unit-level coverage of the merge/translate branches, driven by hand-crafted
// v17 incremental payloads (the 2023 pending/incremental/completed shape).
// ---------------------------------------------------------------------------

const makeResults = (
  initialResult: InitialIncrementalResult,
  ...payloads: SubsequentIncrementalResult[]
): IncrementalResults => ({
  initialResult,
  subsequentResults: (async function* () {
    for (const payload of payloads) {
      yield payload;
    }
  })(),
});

const collect = async (
  gen: AsyncGenerator<RelayLegacyPayload, void, void>,
): Promise<RelayLegacyPayload[]> => {
  const out: RelayLegacyPayload[] = [];
  for await (const payload of gen) {
    out.push(payload);
  }
  return out;
};

describe("mergeIncremental (crafted payloads)", () => {
  it("merges deferred-fragment data into the initial tree", async () => {
    const merged = await mergeIncremental(
      makeResults(
        {
          data: { node: { name: "x" } },
          pending: [{ id: "0", path: ["node"], label: "frag" }],
        },
        {
          incremental: [{ id: "0", data: { extra: "y" } }],
          completed: [{ id: "0" }],
          hasNext: false,
        },
      ),
    );
    expect(merged.errors).toBeUndefined();
    expect(merged.data?.node).toEqual({ name: "x", extra: "y" });
  });

  it("pushes streamed items onto the array at the pending path", async () => {
    const merged = await mergeIncremental(
      makeResults(
        { data: { list: [0] }, pending: [{ id: "1", path: ["list"] }] },
        { incremental: [{ id: "1", items: [1, 2] }], hasNext: true },
        {
          incremental: [{ id: "1", items: [3] }],
          completed: [{ id: "1" }],
          hasNext: false,
        },
      ),
    );
    expect(merged.data?.list).toEqual([0, 1, 2, 3]);
  });

  it("collects errors from incremental entries and completed notices", async () => {
    const merged = await mergeIncremental(
      makeResults(
        {
          data: { a: { keep: true }, b: null },
          pending: [
            { id: "0", path: ["a"], label: "fa" },
            { id: "1", path: ["b"], label: "fb" },
          ],
        },
        {
          incremental: [
            { id: "0", data: { added: 1 }, errors: [{ message: "partial" }] },
          ],
          completed: [{ id: "1", errors: [{ message: "fragment failed" }] }],
          hasNext: false,
        },
      ),
    );
    expect(merged.errors).toHaveLength(2);
    expect(merged.data?.a).toEqual({ keep: true, added: 1 });
  });

  it("carries initial errors through and ignores unknown / null-data entries", async () => {
    // data === null short-circuits the merge; an unknown id has no pending;
    // the `?? null`/`?? []` defaults fire because data/pending are absent.
    const merged = await mergeIncremental(
      makeResults(
        { errors: [{ message: "seed" }] },
        { hasNext: true },
        {
          incremental: [{ id: "ghost", data: { ignored: true } }],
          hasNext: false,
        },
      ),
    );
    expect(merged.data).toBeNull();
    expect(merged.errors).toHaveLength(1);
  });

  it("registers a pending announced in a subsequent payload", async () => {
    const merged = await mergeIncremental(
      makeResults(
        { data: { node: { name: "x" } } },
        // pending "0" is announced here, not in the initial result.
        {
          pending: [{ id: "0", path: ["node"], label: "late" }],
          incremental: [{ id: "0", data: { extra: "y" } }],
          completed: [{ id: "0" }],
          hasNext: false,
        },
      ),
    );
    expect(merged.data?.node).toEqual({ name: "x", extra: "y" });
  });

  it("tolerates a pending path that walks through a non-object and a non-array items target", async () => {
    const merged = await mergeIncremental(
      makeResults(
        {
          // ["scalar","deeper"] walks into a string → defensive bail-out;
          // ["obj"] is an object, so items push finds a non-array container;
          // ["leaf"] resolves fully to null → the final-cursor guard bails.
          data: { scalar: "leaf", obj: { kind: "map" }, leaf: null },
          pending: [
            { id: "0", path: ["scalar", "deeper"] },
            { id: "1", path: ["obj"] },
            { id: "2", path: ["leaf"] },
          ],
        },
        {
          incremental: [
            { id: "0", data: { unreached: true } },
            { id: "1", items: [99] },
            { id: "2", data: { alsoUnreached: true } },
          ],
          completed: [{ id: "0" }, { id: "1" }, { id: "2" }],
          hasNext: false,
        },
      ),
    );
    expect(merged.errors).toBeUndefined();
    expect(merged.data?.scalar).toBe("leaf");
    expect(merged.data?.obj).toEqual({ kind: "map" });
    expect(merged.data?.leaf).toBeNull();
  });
});

describe("relayFormatAdapter (crafted payloads)", () => {
  it("emits the initial payload with errors, then a labelled deferred payload with is_final", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          {
            data: { node: { name: "x" } },
            errors: [{ message: "warn" }],
            pending: [{ id: "0", path: ["node"], label: "frag" }],
          },
          {
            incremental: [{ id: "0", data: { extra: "y" } }],
            completed: [{ id: "0" }],
            hasNext: false,
          },
        ),
      ),
    );
    expect(payloads[0]?.path).toBeUndefined();
    expect(payloads[0]?.errors).toHaveLength(1);
    const last = payloads[payloads.length - 1];
    expect(last?.path).toEqual(["node"]);
    expect(last?.label).toBe("frag");
    expect(last?.data).toEqual({ extra: "y" });
    expect(last?.extensions?.is_final).toBe(true);
  });

  it("indexes streamed items from the initial array length and flushes while hasNext", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          // No label on this pending → the label-omitting branches run.
          { data: { list: ["a"] }, pending: [{ id: "1", path: ["list"] }] },
          { incremental: [{ id: "1", items: ["b", "c"] }], hasNext: true },
          {
            incremental: [{ id: "1", items: ["d"] }],
            completed: [{ id: "1" }],
            hasNext: false,
          },
        ),
      ),
    );
    const streamed = payloads.slice(1);
    // initial array length is 1, so the first streamed item is index 1.
    expect(streamed.map((p) => p.path)).toEqual([
      ["list", 1],
      ["list", 2],
      ["list", 3],
    ]);
    expect(streamed.every((p) => p.label === undefined)).toBe(true);
    expect(streamed[streamed.length - 1]?.extensions?.is_final).toBe(true);
  });

  it("translates a completed-only error and a null deferred payload, keeping path/label", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          {
            data: { node: { name: "x" }, other: null },
            pending: [
              { id: "0", path: ["node"], label: "ok" },
              { id: "1", path: ["other"], label: "bad" },
            ],
          },
          {
            // entry.data === null → relay still buffers a null-data payload.
            incremental: [{ id: "0", data: null }],
            hasNext: true,
          },
          {
            completed: [{ id: "1", errors: [{ message: "fragment failed" }] }],
            hasNext: false,
          },
        ),
      ),
    );
    const nullData = payloads.find((p) => p.label === "ok");
    expect(nullData?.data).toBeNull();
    const failed = payloads.find((p) => p.label === "bad");
    expect(failed?.data).toBeNull();
    expect(failed?.errors).toHaveLength(1);
    expect(failed?.path).toEqual(["other"]);
  });

  it("flushes more than one trailing payload and marks only the last is_final", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          {
            data: { a: {}, b: {} },
            pending: [
              { id: "0", path: ["a"] },
              { id: "1", path: ["b"] },
            ],
          },
          {
            incremental: [
              { id: "0", data: { x: 1 } },
              { id: "1", data: { y: 2 } },
            ],
            completed: [{ id: "0" }, { id: "1" }],
            hasNext: false,
          },
        ),
      ),
    );
    const trailing = payloads.slice(1);
    expect(trailing).toHaveLength(2);
    expect(trailing[0]?.extensions?.is_final).toBeUndefined();
    expect(trailing[1]?.extensions?.is_final).toBe(true);
  });

  it("emits a synthetic is_final payload when everything was flushed before the final notice", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          { data: { node: {} }, pending: [{ id: "0", path: ["node"] }] },
          // Flushed during hasNext: true …
          { incremental: [{ id: "0", data: { x: 1 } }], hasNext: true },
          // … the final payload carries only completed bookkeeping.
          { completed: [{ id: "0" }], hasNext: false },
        ),
      ),
    );
    const last = payloads[payloads.length - 1];
    expect(last?.data).toBeNull();
    expect(last?.extensions?.is_final).toBe(true);
    // The flushed deferred payload came before the synthetic final.
    expect(payloads.some((p) => p.path?.[0] === "node")).toBe(true);
  });

  it("seeds the stream index at 0 when the initial result has no data and the path is absent", async () => {
    // initialResult.data is undefined → the `?? null` default and the
    // null-cursor guard in computeInitialIndex both run; index starts at 0.
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          { pending: [{ id: "1", path: ["missing"] }] },
          {
            incremental: [{ id: "1", items: ["only"] }],
            completed: [{ id: "1" }],
            hasNext: false,
          },
        ),
      ),
    );
    expect(payloads[0]?.data).toBeNull();
    const streamed = payloads.slice(1);
    expect(streamed[0]?.path).toEqual(["missing", 0]);
  });

  it("seeds the stream index at 0 when the path leads to a non-array value", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          {
            data: { box: { notAList: true } },
            pending: [{ id: "1", path: ["box"] }],
          },
          {
            incremental: [{ id: "1", items: ["x"] }],
            completed: [{ id: "1" }],
            hasNext: false,
          },
        ),
      ),
    );
    expect(payloads.slice(1)[0]?.path).toEqual(["box", 0]);
  });

  it("skips incremental entries whose id has no pending announcement", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          { data: { node: {} } },
          {
            incremental: [{ id: "ghost", data: { ignored: true } }],
            hasNext: false,
          },
        ),
      ),
    );
    // Only the initial payload plus the synthetic is_final; nothing buffered.
    const last = payloads[payloads.length - 1];
    expect(last?.extensions?.is_final).toBe(true);
    expect(
      payloads.some((p) => (p.data as { ignored?: boolean })?.ignored),
    ).toBe(false);
  });

  it("honors a pending announced in a subsequent payload, with labelled items and per-entry errors", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          { data: { feed: ["seed"] } },
          // The pending for "9" arrives in this subsequent payload, not the
          // initial result — the subsequent-pending loop registers it.
          {
            pending: [{ id: "9", path: ["feed"], label: "stream" }],
            incremental: [
              { id: "9", items: ["one"], errors: [{ message: "item warn" }] },
            ],
            hasNext: true,
          },
          {
            incremental: [
              {
                id: "9",
                data: { tail: 1 },
                errors: [{ message: "frag warn" }],
              },
            ],
            completed: [{ id: "9" }],
            hasNext: false,
          },
        ),
      ),
    );
    const labelled = payloads.filter((p) => p.label === "stream");
    expect(labelled.length).toBeGreaterThan(0);
    // The deferred-data payload carried entry.errors through.
    const withErrors = payloads.find((p) => p.errors !== undefined);
    expect(withErrors?.errors).toHaveLength(1);
    // The streamed item picked up the label too.
    const item = payloads.find((p) => p.path?.[1] === 1);
    expect(item?.label).toBe("stream");
  });

  it("emits a completed-error payload without path/label when the id was never announced", async () => {
    const payloads = await collect(
      relayFormatAdapter(
        makeResults(
          { data: { node: {} } },
          {
            completed: [
              { id: "unknown", errors: [{ message: "orphan failure" }] },
            ],
            hasNext: false,
          },
        ),
      ),
    );
    const failed = payloads.find((p) => p.errors !== undefined);
    expect(failed?.errors).toHaveLength(1);
    expect(failed?.path).toBeUndefined();
    expect(failed?.label).toBeUndefined();
    expect(failed?.extensions?.is_final).toBe(true);
  });
});

describe("extractStatic (build-time static extraction)", () => {
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

  it("fails loudly on non-enumerable variables", async () => {
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
