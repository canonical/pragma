/** Boot-time state shared by CLI, MCP, and completions server. */

import type { Store } from "@canonical/ke";
import type { SchemaPluginApi } from "@canonical/ke-graphql";
import type { ConfigOrigins, PragmaConfig } from "#config";
import type { SemanticPackage } from "../semanticPackage.js";

/**
 * In-process GraphQL access to the loaded graph: the OWL-derived schema and
 * the per-request context factory. A narrowed view of ke-graphql's
 * {@link SchemaPluginApi} — execution happens locally via graphql-js, no
 * server and no HTTP are involved on this path.
 */
export type PragmaGraphqlApi = Pick<
  SchemaPluginApi,
  "schema" | "createContext"
>;

/**
 * Boot-time state shared by CLI, MCP, and completions server.
 *
 * Members:
 * - `store` — the ke triple store, loaded and ready for SPARQL queries.
 * - `config` — resolved pragma config (tier, channel).
 * - `origins` — per-field provenance for the merged config (which layer
 *   supplied each effective value), surfaced by the state payload.
 * - `cwd` — working directory used for config and source resolution.
 * - `packages` — resolved semantic packages (for diagnostics and skills).
 * - `graphql()` — compiles the OWL-derived GraphQL schema from the loaded
 *   store on first call and caches it for the runtime's lifetime (the store
 *   is immutable after boot). Compilation is deliberately lazy: it costs
 *   roughly as much as the store boot itself, so commands that never touch
 *   GraphQL never pay for it.
 * - `dispose()` — tears down the store and frees WASM memory. Must be
 *   called exactly once; calling operations after dispose is undefined.
 */
export interface PragmaRuntime {
  readonly store: Store;
  readonly config: PragmaConfig;
  readonly origins: ConfigOrigins;
  readonly cwd: string;
  readonly packages: readonly SemanticPackage[];
  /**
   * Lazily compiled in-process GraphQL schema for the loaded graph.
   *
   * @throws PragmaError with code STORE_ERROR when schema compilation fails.
   * @note Impure — the first call runs the ke-graphql compiler against the
   *   store (SPARQL extraction queries).
   */
  graphql(): Promise<PragmaGraphqlApi>;
  dispose(): void;
}
