import { describe, expect, it } from "vitest";
import listStoredIds from "./listStoredIds.js";

describe("listStoredIds", () => {
  it("lists the strings a stored list holds, once each, in order", () => {
    expect(listStoredIds(["b", 1, "a", null, "b"])).toEqual(["b", "a"]);
  });

  it("reads anything but a list as no ids", () => {
    expect(listStoredIds(undefined)).toEqual([]);
    expect(listStoredIds("a")).toEqual([]);
    expect(listStoredIds({ a: "a" })).toEqual([]);
  });
});
