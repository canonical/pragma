/**
 * Test store bridge — createTestStore, PragmaTestStoreOptions.
 *
 * Wraps `@canonical/ke/testing` with pragma's default prefix map
 * pre-configured so test authors do not need to repeat PREFIX_MAP.
 */

import type { TestStoreOptions, TestStoreResult } from "@canonical/ke/testing";
import { createTestStore as keCreateTestStore } from "@canonical/ke/testing";
import { PREFIX_MAP } from "../domains/shared/prefixes.js";

/** Options for creating a test store, with pragma prefixes pre-applied. */
interface PragmaTestStoreOptions extends Omit<TestStoreOptions, "prefixes"> {
  prefixes?: TestStoreOptions["prefixes"];
}

/**
 * Create a test ke store with pragma's default prefix map.
 *
 * @param options - Optional overrides; additional prefixes are merged
 *   on top of the default PREFIX_MAP.
 * @returns The test store result from ke/testing.
 *
 * @note Impure
 */
async function createTestStore(
  options: PragmaTestStoreOptions = {},
): Promise<TestStoreResult> {
  return keCreateTestStore({
    ...options,
    prefixes: {
      ...PREFIX_MAP,
      ...options.prefixes,
    },
  });
}

export type { PragmaTestStoreOptions };
export { createTestStore };
