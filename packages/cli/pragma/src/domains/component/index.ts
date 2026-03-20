/**
 * Component domain — CLI commands and operations.
 *
 * Commands: `pragma component list`, `pragma component get <name>`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { getCommand, listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), getCommand(ctx)];
}

export { getComponent, listComponents } from "./operations/index.js";
