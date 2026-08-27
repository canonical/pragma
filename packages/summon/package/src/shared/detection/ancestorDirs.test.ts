import * as path from "node:path";
import { describe, expect, it } from "vitest";
import ancestorDirs from "./ancestorDirs.js";

// Build inputs from the platform's real root so the assertions hold under
// POSIX and Windows path semantics alike.
const ROOT = path.parse(path.resolve("/")).root;

describe("ancestorDirs", () => {
  it("lists every directory from start to the filesystem root, nearest first", () => {
    const start = path.join(ROOT, "a", "b", "c");
    expect(ancestorDirs(start)).toEqual([
      start,
      path.join(ROOT, "a", "b"),
      path.join(ROOT, "a"),
      ROOT,
    ]);
  });

  it("handles the root itself", () => {
    expect(ancestorDirs(ROOT)).toEqual([ROOT]);
  });
});
