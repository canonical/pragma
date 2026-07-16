/**
 * @module Token domain — CLI commands and operations.
 *
 * `token list` and `token lookup` are served by the bundled `token` story
 * pack (see `shared/stories/pack/bundled/tokenPack.ts`); `pragma tokens
 * add-config` and `pragma token sample` remain built-in commands here.
 * Operations: {@link lookupToken}, {@link listTokens} (kept as the public
 * API and the parity-test oracle), {@link resolveAddConfig}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { addConfigCommand, sampleCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [addConfigCommand(), sampleCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export type { AddConfigResult, TokenListFilters } from "./operations/index.js";
export {
  listTokens,
  lookupToken,
  resolveAddConfig,
  sampleTokens,
} from "./operations/index.js";
export { tokenConfig } from "./tokenConfig.js";
