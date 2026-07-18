/**
 * @module Token domain — CLI commands and operations.
 *
 * `token list` and `token lookup` are served by the bundled `token` story
 * pack (see `shared/stories/pack/bundled/tokenPack.ts`); `pragma tokens
 * add-config` remains a built-in command here. `pragma token sample` is part
 * of the token **read** surface and, like the bundled pack's read verbs, is
 * gated behind {@link TOKEN_READ_SURFACE_ENABLED}: while the flag is off (no
 * token data in the ontology) it is not registered. `tokens add-config`
 * (scaffolding, not store data) is always registered.
 * Operations: {@link lookupToken}, {@link listTokens} (kept as the public
 * API and the parity-test oracle), {@link resolveAddConfig}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { addConfigCommand, sampleCommand } from "./commands/index.js";
import { TOKEN_READ_SURFACE_ENABLED } from "./featureFlag.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  if (!TOKEN_READ_SURFACE_ENABLED) {
    return [addConfigCommand()];
  }
  return [addConfigCommand(), sampleCommand(ctx)];
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
export { tokenConfig } from "./tokenConfig.js";
