import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

describe("public surface", () => {
  it("exports exactly the public API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "applyWindow",
      "canonicalSlice",
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
      "createSaveSession",
      "createSchema",
      "createSelection",
      "isIdentity",
      "resolveColumns",
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
  });
});
