import { describe, expect, it } from "vitest";
import getParentDir from "./getParentDir.js";

describe("getParentDir", () => {
  it("extracts parent from normal path", () => {
    expect(getParentDir("src/components/Button")).toBe("src/components");
  });

  it("returns '.' for root-level name", () => {
    expect(getParentDir("Button")).toBe(".");
  });

  it("extracts parent from deep path", () => {
    expect(getParentDir("src/lib/deep/Thing")).toBe("src/lib/deep");
  });
});
