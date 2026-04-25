import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import listDirectory from "./listDirectory.js";

describe("listDirectory", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-test-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("separates files and directories", async () => {
    writeFileSync(join(tmp, "file.txt"), "");
    mkdirSync(join(tmp, "subdir"));
    const result = await listDirectory(tmp);
    expect(result.files).toEqual(["file.txt"]);
    expect(result.directories).toEqual(["subdir"]);
  });

  it("returns empty arrays for empty directory", async () => {
    const result = await listDirectory(tmp);
    expect(result.files).toEqual([]);
    expect(result.directories).toEqual([]);
  });

  it("handles multiple entries", async () => {
    writeFileSync(join(tmp, "a.json"), "");
    writeFileSync(join(tmp, "b.txt"), "");
    mkdirSync(join(tmp, "src"));
    mkdirSync(join(tmp, "dist"));
    const result = await listDirectory(tmp);
    expect(result.files.sort()).toEqual(["a.json", "b.txt"]);
    expect(result.directories.sort()).toEqual(["dist", "src"]);
  });
});
