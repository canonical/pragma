/**
 * @module Ontology domain barrel.
 *
 * Provides ontology listing, detailed schema inspection, and raw triple retrieval.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, showCommand } from "./commands/index.js";

/**
 * Returns all command definitions for the ontology domain.
 *
 * @param ctx - Pragma runtime context.
 * @returns An array of command definitions (`ontology list`, `ontology show`).
 */
export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), showCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export {
  listOntologies,
  showOntology,
  showOntologyRaw,
} from "./operations/index.js";
