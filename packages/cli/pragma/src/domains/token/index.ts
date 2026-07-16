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
  sampleCommand,
} from "./commands/index.js";
import { TOKEN_READ_SURFACE_ENABLED } from "./featureFlag.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  if (!TOKEN_READ_SURFACE_ENABLED) {
    return [addConfigCommand()];
  }
  return [
    listCommand(ctx),
    lookupCommand(ctx),
    addConfigCommand(),
    sampleCommand(ctx),
  ];
}

export { TOKEN_READ_SURFACE_ENABLED } from "./featureFlag.js";
export { specs as mcpSpecs } from "./mcp/index.js";
export type { AddConfigResult, TokenListFilters } from "./operations/index.js";
export {
  listTokens,
  lookupToken,
  resolveAddConfig,
  sampleTokens,
} from "./operations/index.js";
export {
  resolveTokenList,
  resolveTokenLookup,
  tokenEmptyError,
} from "./orchestration/index.js";
export { tokenConfig } from "./tokenConfig.js";
