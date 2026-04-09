import { describe, expect, it } from "vitest";
import resolveOrientation from "./resolveOrientation.js";

describe("resolveOrientation", () => {
  it("returns a fixed string value directly", () => {
    expect(resolveOrientation("horizontal", 0)).toBe("horizontal");
    expect(resolveOrientation("vertical", 5)).toBe("vertical");
  });

  it("calls function with depth and returns result", () => {
    const fn = (d: number): "horizontal" | "vertical" =>
      d === 0 ? "horizontal" : "vertical";
    expect(resolveOrientation(fn, 0)).toBe("horizontal");
    expect(resolveOrientation(fn, 1)).toBe("vertical");
    expect(resolveOrientation(fn, 2)).toBe("vertical");
  });
});
