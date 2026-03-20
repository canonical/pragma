import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { addConfigCommand, getCommand, listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), getCommand(ctx), addConfigCommand()];
}

export type { AddConfigResult, TokenListFilters } from "./operations/index.js";
export {
  getToken,
  listTokens,
  resolveAddConfig,
} from "./operations/index.js";
