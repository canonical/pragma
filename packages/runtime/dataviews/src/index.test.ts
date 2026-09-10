import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

describe("public surface", () => {
  it("exports exactly the public API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "canonicalSlice",
      "createCollectionCoordinator",
      "createFieldInteraction",
      "createIdentity",
      "createOperation",
      "createSaveSession",
      "isIdentity",
      "sliceEquals",
    ]);
  });

  it("wires the barrel to working functions", () => {
    expect(dataviews.isIdentity(dataviews.createIdentity())).toBe(true);
    expect(dataviews.createCollectionCoordinator().state.result.status).toBe(
      "idle",
    );
    expect(
      dataviews.createSaveSession({
        initial: 0,
        equals: (a: number, b: number) => a === b,
      }).state.dirty,
    ).toBe(false);
  });

  it("keeps save attempts one-shot", () => {
    const save = dataviews.createSaveSession({
      initial: 0,
      equals: (a: number, b: number) => a === b,
    });
    save.edit(1);
    const attempt = save.beginSave();
    if (attempt === null) {
      throw new Error("expected a save attempt");
    }
    save.saveCompleted(attempt);
    save.saveCompleted(attempt);
    expect(save.state.baseline).toBe(1);
  });
});
