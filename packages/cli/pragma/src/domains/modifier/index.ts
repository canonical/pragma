/**
 * @module Modifier domain — CLI commands and operations.
 *
 * Commands: `pragma modifier list`, `pragma modifier lookup <name>`.
 * Operations: {@link lookupModifier}, {@link listModifiers}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, lookupCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), lookupCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export { listModifiers, lookupModifier } from "./operations/index.js";
export {
  modifierEmptyError,
  resolveModifierList,
  resolveModifierLookup,
} from "./orchestration/index.js";
