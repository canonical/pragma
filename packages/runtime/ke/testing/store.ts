import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "../src/store.js";
import type { Plugin, PrefixMap, Store, StoreConfig } from "../src/types.js";
import { PEOPLE_TTL } from "./fixtures.js";

/**
 * Options for creating a test store.
 */
export interface TestStoreOptions {
  /** TTL content to load. Defaults to PEOPLE_TTL. */
  ttl?: string | string[];
  /** Plugins to register. */
  plugins?: Plugin[];
  /** Prefix map to register. */
  prefixes?: PrefixMap;
  /** Whether to enable caching. */
  cache?: boolean;
}

/**
 * Result from createTestStore, includes cleanup function.
 */
export interface TestStoreResult {
  store: Store;
  tmpDir: string;
  cleanup: () => void;
}

/**
 * Create a test store from TTL string(s).
 *
 * Writes the TTL to a temp directory and creates a store from it.
 * Call cleanup() when done to remove temp files.
 */
export async function createTestStore(
  options: TestStoreOptions = {},
): Promise<TestStoreResult> {
  const ttlContent = options.ttl ?? PEOPLE_TTL;
  const ttlArray = Array.isArray(ttlContent) ? ttlContent : [ttlContent];

  // Create a unique temp directory
  const tmpDir = join(
    tmpdir(),
    `ke-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });

  // Write TTL files
  const filePaths: string[] = [];
  for (let i = 0; i < ttlArray.length; i++) {
    const filePath = join(tmpDir, `test-${i}.ttl`);
    writeFileSync(filePath, ttlArray[i], "utf-8");
    filePaths.push(filePath);
  }

  const config: StoreConfig = {
    sources: filePaths,
    plugins: options.plugins,
    prefixes: options.prefixes,
  };

  if (options.cache) {
    config.cache = join(tmpDir, ".cache.nq");
  }

  const store = await create(config);

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
