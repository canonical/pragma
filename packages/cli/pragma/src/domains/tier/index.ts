/**
 * @module Tier domain — CLI commands and operations.
 *
 * Commands: `pragma tier list`.
 * Operations: {@link listTiers}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export { listTiers } from "./operations/index.js";
