/**
 * Extended command context for pragma CLI commands.
 *
 * Extends `PragmaRuntime` with CLI-specific global flags so commands
 * access store, config, cwd, and output preferences uniformly via `ctx`.
 *
 * cli-core remains unaware of Store or FilterConfig.
 */

import type { GlobalFlags } from "@canonical/cli-core";
import type { PragmaRuntime } from "./runtime.js";

export interface PragmaContext extends PragmaRuntime {
  readonly globalFlags: GlobalFlags;
}
