import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

describe("public surface", () => {
  it("exports exactly the public API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "applyWindow",
      "canonicalSlice",
      "columnTemplate",
      "createChannel",
      "createCollectionCoordinator",
      "createDataViewsProvider",
      "createFieldInteraction",
      "createGridInteraction",
      "createIdentity",
      "createMemoryLocation",
      "createOperation",
      "createPlatformLocation",
      "createPresentation",
      "createRowModel",
      "createRowScopes",
      "createSaveSession",
      "createSchema",
      "createSelection",
      "isIdentity",
      "resolveColumns",
      "sizingEquals",
      "sliceEquals",
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
  });
});
