/**
 * @module Graph domain barrel.
 *
 * Provides raw SPARQL querying and URI inspection against the ke store.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { inspectCommand, queryCommand } from "./commands/index.js";

/**
 * Returns all command definitions for the graph domain.
 *
 * @param ctx - Pragma runtime context.
 * @returns An array of command definitions (`graph query`, `graph inspect`).
 */
export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [queryCommand(ctx), inspectCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export { executeQuery, inspectUri } from "./operations/index.js";
