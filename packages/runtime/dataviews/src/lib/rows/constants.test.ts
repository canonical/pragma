import { describe, expect, it } from "vitest";
import { EMPTY_ROW_MODEL } from "./constants.js";

describe("EMPTY_ROW_MODEL", () => {
  it("holds no entries and addresses no identity", () => {
    expect(EMPTY_ROW_MODEL.entries).toEqual([]);
    expect(EMPTY_ROW_MODEL.ids).toEqual([]);
    expect(EMPTY_ROW_MODEL.byId("anything")).toBeUndefined();
  });

  it("is frozen, so the collections sharing it cannot change it", () => {
    expect(Object.isFrozen(EMPTY_ROW_MODEL)).toBe(true);
    expect(Object.isFrozen(EMPTY_ROW_MODEL.entries)).toBe(true);
    expect(Object.isFrozen(EMPTY_ROW_MODEL.ids)).toBe(true);
  });
});
