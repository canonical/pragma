/**
 * @module Block domain — CLI commands and operations.
 *
 * Commands: `pragma block list` (config-filtered, built-in), `pragma block
 * sample`. `block lookup` is served by the bundled `block` story pack
 * (see `shared/stories/pack/bundled/blockPack.ts`).
 * Operations: {@link lookupBlock} (kept as the public API and the
 * parity-test oracle), {@link listBlocks}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, sampleCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), sampleCommand(ctx)];
}

export { blockConfig } from "./blockConfig.js";
export { specs as mcpSpecs } from "./mcp/index.js";
export { listBlocks, lookupBlock, sampleBlocks } from "./operations/index.js";
export {
  blockEmptyError,
  buildBlockFilters,
  enrichBlocks,
  resolveBlockList,
} from "./orchestration/index.js";
