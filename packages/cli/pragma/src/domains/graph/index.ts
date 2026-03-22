/**
 * Graph domain — CLI commands and operations.
 *
 * Commands: `pragma graph query <sparql>`, `pragma graph inspect <uri>`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { inspectCommand, queryCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [queryCommand(ctx), inspectCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export { executeQuery, inspectUri } from "./operations/index.js";
