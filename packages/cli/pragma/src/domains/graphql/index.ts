/**
 * @module GraphQL domain barrel.
 *
 * Compiles TTL ontologies into GraphQL schema artifacts via the ke-graphql
 * pipeline, and serves them locally. Commands boot their own ke store —
 * from explicit TTL sources or, when none are given, the semantic packages
 * configured in `pragma.config.json` — so they run on the store-skip
 * pipeline path.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import { buildCommand, checkCommand, serveCommand } from "./commands/index.js";

/**
 * Returns all command definitions for the graphql domain.
 *
 * @returns The `graphql build`, `graphql check`, and `graphql serve`
 *   command definitions.
 */
export function commands(): CommandDefinition[] {
  return [buildCommand, checkCommand, serveCommand];
}

export { compileSchema } from "./operations/index.js";
