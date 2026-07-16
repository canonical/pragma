import { describe, expect, it } from "vitest";
import getRuleset from "./getRuleset.js";

describe("getRuleset", () => {
  it("returns package-react for the react framework", () => {
    expect(getRuleset("library", "react")).toBe("package-react");
  });

  it("returns package-svelte for the svelte framework", () => {
    expect(getRuleset("library", "svelte")).toBe("package-svelte");
  });

  it("returns the package type when framework is none", () => {
    expect(getRuleset("tool-ts", "none")).toBe("tool-ts");
    expect(getRuleset("library", "none")).toBe("library");
  });

  it("returns base for css packages", () => {
    expect(getRuleset("css", "none")).toBe("base");
  });
});
