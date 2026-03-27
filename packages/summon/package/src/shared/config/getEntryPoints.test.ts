import { describe, expect, it } from "vitest";
import getEntryPoints from "./getEntryPoints.js";

describe("getEntryPoints", () => {
  it("returns src/ paths for tool-ts", () => {
    const entry = getEntryPoints("tool-ts");
    expect(entry.module).toBe("src/index.ts");
    expect(entry.types).toBe("src/index.ts");
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });

  it("returns dist/ paths for library", () => {
    const entry = getEntryPoints("library");
    expect(entry.module).toBe("dist/esm/index.js");
    expect(entry.types).toBe("dist/types/index.d.ts");
    expect(entry.files).toContain("dist");
    expect(entry.needsBuild).toBe(true);
  });

  it("returns src/index.css for css packages", () => {
    const entry = getEntryPoints("css");
    expect(entry.module).toBe("src/index.css");
    expect(entry.types).toBeNull();
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });
});
