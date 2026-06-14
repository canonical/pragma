import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import resolveConfiguredGraphs from "./resolveConfiguredGraphs.js";

describe("resolveConfiguredGraphs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-rcg-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolves the default semantic packages' TTL graphs", async () => {
    // No pragma.config.json in the temp dir → mergeAndParseRefs falls back to
    // the default packages, which resolve from node_modules in the workspace.
    const graphs = await resolveConfiguredGraphs(dir);

    expect(graphs.length).toBeGreaterThan(0);
    expect(graphs[0]).toMatchObject({ format: "turtle" });
    expect(typeof graphs[0]?.content).toBe("string");
  });
});
