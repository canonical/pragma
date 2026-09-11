import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

describe("public surface", () => {
  it("exports exactly the public API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "applyWindow",
      "canonicalSlice",
      "columnTemplate",
      "createArraySource",
      "createChannel",
      "createCollectionCoordinator",
      "createDataViewsProvider",
      "createFieldInteraction",
      "createGridInteraction",
      "createIdentity",
      "createLocationBinding",
      "createMemoryLocation",
      "createOperation",
      "createPlatformLocation",
      "createPresentation",
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
      "isIdentity",
      "resolveColumns",
      "sizingEquals",
      "sliceEquals",
      "supportsSlice",
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
    expect(dataviews.createSelection().state.ids.size).toBe(0);
    expect(dataviews.applyWindow(["a"], { page: 1, size: 10 })).toEqual(["a"]);
    expect(dataviews.createRowModel([{ id: "a" }]).ids).toEqual(["a"]);
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
    const emptySlice = { filter: [], search: null, sort: [], group: null };
    const source = dataviews.createArraySource({
      rows: [{ id: "a" }],
      fields: ["id"],
    });
    expect(dataviews.supportsSlice(source.capabilities, emptySlice)).toEqual({
      status: "supported",
    });
    expect(dataviews.executeSlice([{ id: "a" }], emptySlice)).toEqual([
      { id: "a" },
    ]);
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
    expect(provider.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    expect(binding.issues.get()).toEqual([]);
    release();

    expect(
      dataviews
        .encodeQuery({
          schema,
          slice: provider.result.get().slice,
          window: { page: 2, size: 10 },
        })
        .toString(),
    ).toBe("status=failed&page=2&size=10");
    expect(
      dataviews.decodeQuery({
        schema,
        params: new URLSearchParams("status=failed&page=3"),
      }).window,
    ).toEqual({ page: 3, size: 50 });
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
