import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import createStore from "../src/lib/createStore.js";
import type { SourceSpec, StoreConfig } from "../src/lib/types.js";
import { PEOPLE_TTL } from "./fixtures.js";
import type { TestStoreOptions, TestStoreResult } from "./types.js";

/**
 * Create a test store from TTL string(s), optionally with named graphs.
 *
 * Writes TTL to temp files and creates a store from them.
 * Call cleanup() when done to remove temp files and dispose the store.
 *
 * @note Impure — writes temp files, creates Oxigraph store, reads TTL.
 *
 * @example
 * ```ts
 * // Simple — default graph only
 * const { store, cleanup } = await createTestStore({ ttl: MY_TTL });
 *
 * // Named graphs — ontology in default, data in named graph
 * const { store, cleanup } = await createTestStore({
 *   ttl: ONTOLOGY_TTL,
 *   graphs: [
 *     { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
 *     { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
 *   ],
 * });
 * ```
 */
export default async function createTestStore(
  options: TestStoreOptions = {},
): Promise<TestStoreResult> {
  const tmpDir = join(
    tmpdir(),
    `ke-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });

  const sources: SourceSpec[] = [];
  let fileIndex = 0;

  // Write default graph TTL files (no graph assignment)
  const ttlContent = options.ttl ?? PEOPLE_TTL;
  const ttlArray = Array.isArray(ttlContent) ? ttlContent : [ttlContent];

  for (const ttl of ttlArray) {
    const filePath = join(tmpDir, `test-${fileIndex}.ttl`);
    writeFileSync(filePath, ttl, "utf-8");
    sources.push(filePath);
    fileIndex++;
  }

  // Write named graph TTL files (each assigned to its graph URI)
  if (options.graphs) {
    for (const graphSource of options.graphs) {
      const filePath = join(tmpDir, `test-${fileIndex}.ttl`);
      writeFileSync(filePath, graphSource.ttl, "utf-8");
      sources.push({
        patterns: [filePath],
        graph: graphSource.graph,
      });
      fileIndex++;
    }
  }

  const config: StoreConfig = {
    sources,
    plugins: options.plugins,
    prefixes: options.prefixes,
  };

  if (options.cache) {
    config.cache = join(tmpDir, ".cache.nq");
  }

  const store = await createStore(config);

  const cleanup = () => {
    store.dispose();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in tests
    }
  };

  return { store, tmpDir, cleanup };
}
