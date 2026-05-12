/** Boot-time state shared by CLI, MCP, and completions server. */

import type { Store } from "@canonical/ke";
import type { PragmaConfig } from "#config";
import type { SemanticPackage } from "../semanticPackage.js";

/**
 * Boot-time state shared by CLI, MCP, and completions server.
 *
 * Five members:
 * - `store` — the ke triple store, loaded and ready for SPARQL queries.
 * - `config` — resolved pragma config (tier, channel).
 * - `cwd` — working directory used for config and source resolution.
 * - `packages` — resolved semantic packages (for diagnostics and skills).
 * - `dispose()` — tears down the store and frees WASM memory. Must be
 *   called exactly once; calling operations after dispose is undefined.
 */
export interface PragmaRuntime {
  readonly store: Store;
  readonly config: PragmaConfig;
  readonly cwd: string;
  readonly packages: readonly SemanticPackage[];
  dispose(): void;
}
