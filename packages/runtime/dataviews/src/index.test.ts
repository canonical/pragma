import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";
import * as bindings from "./lib/bindings/index.js";
import * as indexeddb from "./lib/indexeddb/index.js";
import * as virtualization from "./lib/virtualization/index.js";

const EMPTY_SLICE = dataviews.EMPTY_SLICE;

/** The package manifest, whose `exports` map names every entry point. */
const manifest = (): { readonly exports: Record<string, unknown> } =>
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("public surface", () => {
  it("exports exactly the application's runtime API from the root", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "DEFAULT_WINDOW",
      "EMPTY_SLICE",
      "createArraySource",
      "createCollection",
      "createDataViewsProvider",
      "createMemoryLocation",
      "createPage",
      "createPlatformLocation",
      "createQuerySource",
      "createRelaySource",
      "createSchema",
      "declareCapabilities",
      "decodeQuery",
      "encodeQuery",
      "readSlice",
    ]);
  });

  it("wires the barrel to working functions", () => {
    expect(
      dataviews.createSchema([{ field: "owner", kind: "flag" }]).fieldNames,
    ).toEqual(["owner"]);
    const ids = dataviews.createCollection({
      identify: (row: { readonly id: string }) => row.id,
      fields: [{ field: "id", kind: "text" }],
    });
    const source = dataviews.createArraySource({
      rows: [{ id: "a" }],
      collection: ids,
    });
    expect(dataviews.declareCapabilities(ids, {}).sort.terms).toBe(0);
    expect(dataviews.readSlice(ids, EMPTY_SLICE).filters).toEqual({});
    expect(dataviews.createPage({ rows: [] }).counts.total).toEqual({
      kind: "unknown",
    });
    const provider = dataviews.createDataViewsProvider({
      collection: ids,
      source,
    });
    expect(
      provider.refusals({
        slice: EMPTY_SLICE,
        window: dataviews.DEFAULT_WINDOW,
      }),
    ).toEqual([]);
    // Nothing runs until something observes; the first observer asks for
    // the first page and the array source answers at once.
    expect(provider.state.get().result.status).toBe("idle");
    const release = provider.observe();
    expect(provider.rows.get().ids).toEqual(["a"]);
    release();
  });

  it("wires the wire grammar and the location loop through the barrel", () => {
    const machines = dataviews.createCollection({
      identify: (row: { readonly id: string }) => row.id,
      fields: [{ field: "status", kind: "choices", options: ["failed"] }],
    });
    const { schema } = machines;
    const location = dataviews.createMemoryLocation({
      href: "/machines?status=failed",
    });
    const provider = dataviews.createDataViewsProvider({
      collection: machines,
      source: dataviews.createArraySource({ rows: [], collection: machines }),
      location,
    });
    const release = provider.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    expect(provider.issues.get()).toEqual([]);
    release();

    expect(
      dataviews
        .encodeQuery({
          schema,
          slice: provider.state.get().slice,
          window: { ...dataviews.DEFAULT_WINDOW, page: 2, size: 10 },
        })
        .toString(),
    ).toBe("status=failed&page=2&size=10");
    expect(
      dataviews.decodeQuery({
        schema,
        params: new URLSearchParams("status=failed&page=3"),
      }).window,
    ).toEqual({ ...dataviews.DEFAULT_WINDOW, page: 3 });
  });

  it("names every entry point in the manifest, and no other", () => {
    expect(Object.keys(manifest().exports).sort()).toEqual([
      ".",
      "./bindings",
      "./indexeddb",
      "./virtualization",
    ]);
    for (const entry of ["bindings", "indexeddb", "virtualization"]) {
      expect(manifest().exports[`./${entry}`]).toEqual({
        types: `./dist/types/lib/${entry}/index.d.ts`,
        import: `./dist/esm/lib/${entry}/index.js`,
      });
    }
  });

  it("hands framework bindings their shared machinery from ./bindings", () => {
    expect(Object.keys(bindings).sort()).toEqual([
      "areListsEqual",
      "areSizingsEqual",
      "areSlicesEqual",
      "buildColumnTemplate",
      "createColumnLayout",
      "createFilterInputs",
      "createGridInteraction",
      "createRowScopes",
      "isDataViewsProvider",
      "listDisplayEntries",
      "readProviderHost",
      "resolveColumns",
    ]);
    for (const name of Object.keys(bindings)) {
      expect(dataviews).not.toHaveProperty(name);
    }
    expect(bindings.isDataViewsProvider(undefined)).toBe(false);
    expect(
      bindings.buildColumnTemplate(
        [{ id: "a", sizing: { kind: "fixed", px: 8 } }],
        null,
      ),
    ).toBe("8px");
    expect(
      bindings.areSizingsEqual(
        { kind: "fixed", px: 8 },
        { kind: "fixed", px: 8 },
      ),
    ).toBe(true);
    expect(bindings.areSlicesEqual(EMPTY_SLICE, EMPTY_SLICE)).toBe(true);
    expect(
      bindings.listDisplayEntries({ rowIds: ["a"], status: null }),
    ).toEqual([
      { kind: "record", id: "record:a", index: 2, parent: null, rowId: "a" },
    ]);
  });

  it("keeps saved-view storage out of the root, behind ./indexeddb", () => {
    expect(dataviews).not.toHaveProperty("createIndexedDBViewStore");
    expect(Object.keys(indexeddb)).toEqual(["createIndexedDBViewStore"]);
  });

  it("keeps the virtual range out of the root, behind ./virtualization", () => {
    expect(dataviews).not.toHaveProperty("createVirtualRange");
    expect(Object.keys(virtualization)).toEqual(["createVirtualRange"]);
  });
});
