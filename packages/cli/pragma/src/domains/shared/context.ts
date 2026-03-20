/**
 * Extended command context for pragma CLI commands.
 *
 * Extends the framework-level CommandContext with pragma-specific
 * dependencies (store, config) so commands access them uniformly
 * via `ctx` rather than ad-hoc closure or lazy resolution.
 *
 * cli-core remains unaware of Store or FilterConfig.
 */

import type { CommandContext } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import type { FilterConfig } from "./types.js";

export interface PragmaContext extends CommandContext {
  readonly store: Store;
  readonly config: FilterConfig;
}
