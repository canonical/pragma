import { describe, expect, it } from "vitest";
import getComponentName from "./getComponentName.js";

describe("getComponentName", () => {
  it("extracts name from simple path", () => {
    expect(getComponentName("src/components/Button")).toBe("Button");
  });

  it("extracts name from nested path", () => {
    expect(getComponentName("src/lib/components/deep/MyWidget")).toBe(
      "MyWidget",
    );
  });

  it("returns name when given just a name", () => {
    expect(getComponentName("Button")).toBe("Button");
  });
});
