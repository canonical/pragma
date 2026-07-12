import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as kernel from "./kernel.js";

/**
 * Collect every import/export specifier reachable from a source file by
 * walking relative specifiers (the compiled `.js` form maps back to the
 * sibling `.ts` source). Returns the set of visited source paths and every
 * non-relative specifier encountered along the way.
 */
const walkImportClosure = (
  entry: string,
): { visited: Set<string>; external: Set<string> } => {
  const visited = new Set<string>();
  const external = new Set<string>();
  const queue = [entry];
  const specifierPattern = /(?:from|import)\s+["']([^"']+)["']/g;
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || visited.has(file)) {
      continue;
    }
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(specifierPattern)) {
      const specifier = match[1];
      if (specifier === undefined) {
        continue;
      }
      if (!specifier.startsWith(".")) {
        external.add(specifier);
        continue;
      }
      queue.push(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")));
    }
  }
  return { visited, external };
};

describe("kernel entry", () => {
  const entry = resolve(import.meta.dirname, "kernel.ts");
  const closure = walkImportClosure(entry);

  it("reaches no node: builtin anywhere in its import closure", () => {
    const nodeSpecifiers = [...closure.external].filter((specifier) =>
      specifier.startsWith("node:"),
    );
    expect(nodeSpecifiers).toEqual([]);
  });

  it("never resolves the execution machinery modules", () => {
    const machinery = [...closure.visited].filter((file) =>
      /(?:interpreter|dry-run|driveSync)\.ts$/.test(file),
    );
    expect(machinery).toEqual([]);
  });

  it("exposes the task monad and effect constructors at runtime", () => {
    expect(typeof kernel.task).toBe("function");
    expect(typeof kernel.effect).toBe("function");
    expect(typeof kernel.readFileEffect).toBe("function");
    expect(typeof kernel.sequence).toBe("function");
  });
});
