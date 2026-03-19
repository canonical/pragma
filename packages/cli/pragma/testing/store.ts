/**
 * Test store bridge — wraps @canonical/ke/testing with pragma's
 * default prefix map pre-configured.
 */

import type { TestStoreOptions, TestStoreResult } from "@canonical/ke/testing";
import { createTestStore as keCreateTestStore } from "@canonical/ke/testing";
import { PREFIX_MAP } from "../src/lib/domains/shared/prefixes.js";

interface PragmaTestStoreOptions extends Omit<TestStoreOptions, "prefixes"> {
  prefixes?: TestStoreOptions["prefixes"];
}

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

export { createTestStore };
export type { PragmaTestStoreOptions };
