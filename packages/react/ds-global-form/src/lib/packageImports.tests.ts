import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Publish-shape guard for the `#lib/*` subpath imports (see code-standards
 * CS.IMPORTS.1 / pragma-adrs N.05). `#lib` is used in SHIPPED code, so the
 * `imports` map must resolve to the published `dist/` artifact at runtime —
 * never to `src/`, which `files: ["dist"]` does not ship. A naïve
 * `"#lib/*": "./src/lib/*"` builds and tests green but throws
 * ERR_MODULE_NOT_FOUND for consumers of the packed package. This test asserts
 * the conditional map stays correct so that defect cannot silently return.
 */
// vitest runs from the package root, so resolve package.json from cwd.
const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);

describe("package #lib imports map (publish shape)", () => {
  const entry = pkg.imports?.["#lib/*"];

  it("defines the #lib/* subpath import", () => {
    expect(entry).toBeDefined();
  });

  it("is a conditional map (not a bare string that would ship src/)", () => {
    expect(typeof entry).toBe("object");
  });

  it("resolves the runtime (default) condition to the shipped dist/, not src/", () => {
    expect(entry.default).toBe("./dist/esm/lib/*");
    expect(entry.default).not.toContain("/src/");
  });

  it("resolves the development condition to live src/ for our own tooling", () => {
    expect(entry.development).toBe("./src/lib/*");
  });

  it("points the types condition at shipped declarations for external consumers", () => {
    expect(entry.types).toBe("./dist/types/lib/*");
    expect(entry.types).not.toContain("/src/");
  });

  it("only ships dist/ (so src/-targeted conditions would not resolve for consumers)", () => {
    expect(pkg.files).toEqual(["dist"]);
  });
});
