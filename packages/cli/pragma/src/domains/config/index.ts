/** @module Config domain -- tier, channel, and show commands for `pragma config`. */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { channelCommand, showCommand, tierCommand } from "./commands/index.js";

/**
 * Return all config command definitions.
 *
 * @param ctx - Pragma context providing cwd, store, and formatter selection.
 * @returns An array of CommandDefinitions for the config subcommands.
 */
export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [tierCommand(ctx), channelCommand(ctx), showCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export type { ConfigShowData } from "./operations/index.js";
export {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./operations/index.js";
