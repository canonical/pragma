import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

const EMPTY_SLICE = dataviews.EMPTY_SLICE;

describe("public surface", () => {
  it("exports exactly the public API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "DEFAULT_WINDOW",
      "EMPTY_SLICE",
      "applyWindow",
      "areSortsEqual",
      "canonicalSlice",
      "collapseSortTerms",
      "columnTemplate",
      "createArraySource",
      "createChannel",
      "createCollectionCoordinator",
      "createColumnLayout",
      "createDataViewsProvider",
      "createFieldInteraction",
      "createGridInteraction",
      "createIdentity",
      "createLocationBinding",
      "createMemoryLocation",
      "createOperation",
      "createPlatformLocation",
      "createQuerySource",
      "createRelaySource",
      "createRowModel",
      "createRowScopes",
      "createSaveSession",
      "createSchema",
      "createSelection",
      "createSourceBinding",
      "decodeQuery",
      "displayEntries",
      "encodeQuery",
      "executeSlice",
      "isCalendarDate",
      "isIdentity",
      "readField",
      "resolveColumns",
      "sizingEquals",
      "sliceEquals",
      "supportsRequest",
    ]);
  });

  it("wires the barrel to working functions", () => {
    expect(dataviews.isIdentity(dataviews.createIdentity())).toBe(true);
    expect(dataviews.createCollectionCoordinator().state.result.status).toBe(
      "idle",
    );
    expect(
      dataviews.createSchema([{ field: "owner", kind: "flag" }]).fieldNames,
    ).toEqual(["owner"]);
    expect(dataviews.createChannel(0).get()).toBe(0);
    expect(dataviews.createSelection().state.get().ids.size).toBe(0);
    expect(dataviews.applyWindow(["a"], dataviews.DEFAULT_WINDOW)).toEqual([
      "a",
    ]);
    expect(dataviews.createRowModel({ rows: [{ id: "a" }] })).toMatchObject({
      status: "built",
      model: { ids: ["a"] },
    });
    expect(
      dataviews.columnTemplate(
        [{ id: "a", sizing: { kind: "fixed", px: 8 } }],
        null,
      ),
    ).toBe("8px");
    expect(
      dataviews.sizingEquals(
        { kind: "fixed", px: 8 },
        { kind: "fixed", px: 8 },
      ),
    ).toBe(true);
    const idSchema = dataviews.createSchema([{ field: "id", kind: "text" }]);
    const source = dataviews.createArraySource({
      rows: [{ id: "a" }],
      schema: idSchema,
    });
    expect(
      dataviews.supportsRequest(source.capabilities, {
        slice: EMPTY_SLICE,
        window: dataviews.DEFAULT_WINDOW,
      }),
    ).toEqual([]);
    expect(
      dataviews.executeSlice([{ id: "a" }], EMPTY_SLICE, {
        schema: idSchema,
        sort: source.capabilities.sort,
      }),
    ).toEqual([{ id: "a" }]);
  });

  it("wires the wire grammar and the location loop through the barrel", () => {
    const schema = dataviews.createSchema([
      { field: "status", kind: "choices", options: ["failed"] },
    ]);
    const provider = dataviews.createDataViewsProvider({ schema });
    const location = dataviews.createMemoryLocation({
      href: "/machines?status=failed",
    });
    const binding = dataviews.createLocationBinding({
      host: provider,
      location,
    });
    const release = binding.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    expect(binding.issues.get()).toEqual([]);
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

  it("keeps the virtual range out of the root, behind its own entry point", async () => {
    expect(dataviews).not.toHaveProperty("createVirtualRange");
    const virtualization = await import("./lib/virtualization/index.js");
    expect(Object.keys(virtualization)).toEqual(["createVirtualRange"]);
    const { readFileSync } = await import("node:fs");
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(manifest.exports["./virtualization"]).toEqual({
      types: "./dist/types/lib/virtualization/index.d.ts",
      import: "./dist/esm/lib/virtualization/index.js",
    });
  });

  it("keeps saved-view storage out of the root, behind its own entry point", async () => {
    expect(dataviews).not.toHaveProperty("createIndexedDBViewStore");
    const views = await import("./lib/views/index.js");
    expect(Object.keys(views)).toEqual(["createIndexedDBViewStore"]);
    const { readFileSync } = await import("node:fs");
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(manifest.exports["./views"]).toEqual({
      types: "./dist/types/lib/views/index.d.ts",
      import: "./dist/esm/lib/views/index.js",
    });
  });
});
