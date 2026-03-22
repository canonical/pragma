import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import {
  addConfigCommand,
  listCommand,
  lookupCommand,
} from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), lookupCommand(ctx), addConfigCommand()];
}

export type { AddConfigResult, TokenListFilters } from "./operations/index.js";
export {
  listTokens,
  lookupToken,
  resolveAddConfig,
} from "./operations/index.js";
