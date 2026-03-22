/**
 * Ontology domain — CLI commands and operations.
 *
 * Commands: `pragma ontology list`, `pragma ontology show <prefix>`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, showCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), showCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export {
  listOntologies,
  showOntology,
  showOntologyRaw,
} from "./operations/index.js";
