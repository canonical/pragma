/**
 * Standard domain — CLI commands and operations.
 *
 * Commands: `pragma standard list`, `pragma standard get <name>`,
 *           `pragma standard categories`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import {
  categoriesCommand,
  getCommand,
  listCommand,
} from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), getCommand(ctx), categoriesCommand(ctx)];
}

export {
  getStandard,
  listCategories,
  listStandards,
} from "./operations/index.js";
