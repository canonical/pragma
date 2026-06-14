import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import resolveSourceFiles from "./resolveSourceFiles.js";

describe("resolveSourceFiles", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-graphql-sources-"));
    writeFileSync(join(dir, "a.ttl"), "# a");
    writeFileSync(join(dir, "b.ttl"), "# b");
    writeFileSync(join(dir, "notes.txt"), "ignore me");
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "nested", "c.ttl"), "# c");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolves relative literal paths against cwd", () => {
    const files = resolveSourceFiles(["a.ttl"], dir);
    expect(files).toEqual([join(dir, "a.ttl")]);
  });

  it("keeps absolute literal paths", () => {
    const files = resolveSourceFiles([join(dir, "b.ttl")], dir);
    expect(files).toEqual([join(dir, "b.ttl")]);
  });

  it("skips missing literal paths", () => {
    const files = resolveSourceFiles(["missing.ttl"], dir);
    expect(files).toEqual([]);
  });

  it("expands glob patterns", () => {
    const files = resolveSourceFiles(["*.ttl"], dir);
    expect(files.sort()).toEqual([join(dir, "a.ttl"), join(dir, "b.ttl")]);
  });

  it("expands recursive glob patterns", () => {
    const files = resolveSourceFiles(["**/*.ttl"], dir);
    expect(files.sort()).toEqual([
      join(dir, "a.ttl"),
      join(dir, "b.ttl"),
      join(dir, "nested", "c.ttl"),
    ]);
  });

  it("combines multiple patterns in order", () => {
    const files = resolveSourceFiles(["b.ttl", "nested/*.ttl"], dir);
    expect(files).toEqual([join(dir, "b.ttl"), join(dir, "nested", "c.ttl")]);
  });
});
