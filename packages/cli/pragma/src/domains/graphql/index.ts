/**
 * @module GraphQL domain barrel.
 *
 * Compiles TTL ontologies into GraphQL schema artifacts via the
 * ke-graphql pipeline. Commands boot their own ke store from explicit
 * TTL sources, so they run on the store-skip pipeline path.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import { buildCommand, checkCommand } from "./commands/index.js";

/**
 * Returns all command definitions for the graphql domain.
 *
 * @returns An array of command definitions (`graphql build`, `graphql check`).
 */
export function commands(): CommandDefinition[] {
  return [buildCommand, checkCommand];
}

export { compileSchema } from "./operations/index.js";
