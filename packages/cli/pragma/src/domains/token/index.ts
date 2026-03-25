/**
 * @module Token domain — CLI commands and operations.
 *
 * Commands: `pragma token list`, `pragma token lookup <name>`,
 *           `pragma tokens add-config`.
 * Operations: {@link lookupToken}, {@link listTokens}, {@link resolveAddConfig}.
 */

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

export { specs as mcpSpecs } from "./mcp/index.js";
export type { AddConfigResult, TokenListFilters } from "./operations/index.js";
export {
  listTokens,
  lookupToken,
  resolveAddConfig,
} from "./operations/index.js";
export {
  resolveTokenList,
  resolveTokenLookup,
  tokenEmptyError,
} from "./orchestration/index.js";
