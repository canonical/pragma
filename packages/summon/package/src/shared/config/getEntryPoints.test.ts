import { describe, expect, it } from "vitest";
import getEntryPoints from "./getEntryPoints.js";

describe("getEntryPoints", () => {
  it("returns src/ paths for tool-ts", () => {
    const entry = getEntryPoints("tool-ts", "none");
    expect(entry.module).toBe("src/index.ts");
    expect(entry.types).toBe("src/index.ts");
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });

  it("returns dist/esm paths for a plain library", () => {
    const entry = getEntryPoints("library", "none");
    expect(entry.module).toBe("dist/esm/index.js");
    expect(entry.types).toBe("dist/types/index.d.ts");
    expect(entry.files).toContain("dist");
    expect(entry.needsBuild).toBe(true);
  });

  it("returns dist/esm paths for a react library", () => {
    const entry = getEntryPoints("library", "react");
    expect(entry.module).toBe("dist/esm/index.js");
    expect(entry.types).toBe("dist/types/index.d.ts");
    expect(entry.needsBuild).toBe(true);
  });

  it("returns svelte-package dist/ paths for a svelte library", () => {
    const entry = getEntryPoints("library", "svelte");
    expect(entry.module).toBe("dist/index.js");
    expect(entry.types).toBe("dist/index.d.ts");
    expect(entry.files).toEqual([
      "dist",
      "!dist/**/*.test.*",
      "!dist/**/*.stories.*",
    ]);
    expect(entry.needsBuild).toBe(true);
  });

  it("returns src/index.css for css packages", () => {
    const entry = getEntryPoints("css", "none");
    expect(entry.module).toBe("src/index.css");
    expect(entry.types).toBeNull();
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });
});
