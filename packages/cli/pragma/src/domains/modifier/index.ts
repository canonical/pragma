/**
 * @module Modifier domain — CLI commands and operations.
 *
 * `modifier list` and `modifier lookup` are served by the bundled
 * `modifier` story pack (see `shared/stories/pack/bundled/modifierPack.ts`);
 * only `pragma modifier sample` remains a built-in command here until the
 * generic pack sample verb lands.
 * Operations: {@link lookupModifier}, {@link listModifiers} (kept as the
 * public API and the parity-test oracle).
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { sampleCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [sampleCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export { modifierConfig } from "./modifierConfig.js";
export {
  listModifiers,
  lookupModifier,
  sampleModifiers,
} from "./operations/index.js";
