/**
 * @module Standard domain — CLI commands and operations.
 *
 * Commands: `pragma standard list`, `pragma standard lookup <name>`,
 *           `pragma standard categories`.
 * Operations: {@link lookupStandard}, {@link listStandards}, {@link listCategories}.
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

export { specs as mcpSpecs } from "./mcp/index.js";
export {
  listCategories,
  listStandards,
  lookupStandard,
} from "./operations/index.js";
export {
  buildStandardFilters,
  resolveStandardList,
  resolveStandardLookup,
  standardEmptyError,
} from "./orchestration/index.js";
export { standardConfig } from "./standardConfig.js";
