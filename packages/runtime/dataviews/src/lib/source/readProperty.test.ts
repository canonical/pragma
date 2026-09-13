import { describe, expect, it } from "vitest";
import readProperty from "./readProperty.js";

describe("readProperty", () => {
  it("reads own properties only, so a prototype member is absent", () => {
    expect(readProperty({ id: "a" }, "id")).toBe("a");
    expect(readProperty({ id: "a" }, "toString")).toBeUndefined();
  });

  it("reads nothing off a value that is not an object", () => {
    expect(readProperty("plain", "id")).toBeUndefined();
    expect(readProperty(null, "id")).toBeUndefined();
    expect(readProperty(undefined, "id")).toBeUndefined();
  });
});
