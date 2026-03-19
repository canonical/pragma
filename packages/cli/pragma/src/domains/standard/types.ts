import type { Store } from "@canonical/ke";

export interface StandardCommandOptions {
  /** Override store (for testing). */
  readonly store?: Store;
}
