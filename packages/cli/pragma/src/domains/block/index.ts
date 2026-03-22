/**
 * Block domain — CLI commands and operations.
 *
 * Commands: `pragma block list`, `pragma block get <name>`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { getCommand, listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), getCommand(ctx)];
}

export { getBlock, listBlocks } from "./operations/index.js";
