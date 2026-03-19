/**
 * Config domain — CLI commands and operations.
 *
 * Commands: `pragma config tier`, `pragma config channel`, `pragma config show`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { channelCommand, showCommand, tierCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [tierCommand(ctx), channelCommand(ctx), showCommand(ctx)];
}

export type { ConfigShowData } from "./operations/index.js";
export {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./operations/index.js";
