import { describe, expect, it } from "vitest";
import getRuleset from "./getRuleset.js";

describe("getRuleset", () => {
  it("returns package-react when withReact is true", () => {
    expect(getRuleset("tool-ts", true)).toBe("package-react");
    expect(getRuleset("library", true)).toBe("package-react");
  });

  it("returns package type when withReact is false", () => {
    expect(getRuleset("tool-ts", false)).toBe("tool-ts");
    expect(getRuleset("library", false)).toBe("library");
  });

  it("returns base for css packages", () => {
    expect(getRuleset("css", false)).toBe("base");
  });
});
