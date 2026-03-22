/**
 * Standard domain — CLI commands and operations.
 *
 * Commands: `pragma standard list`, `pragma standard lookup <name>`,
 *           `pragma standard categories`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import {
  categoriesCommand,
  listCommand,
  lookupCommand,
} from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), lookupCommand(ctx), categoriesCommand(ctx)];
}

export {
  listCategories,
  listStandards,
  lookupStandard,
} from "./operations/index.js";
