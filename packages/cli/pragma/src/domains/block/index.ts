/**
 * @module Block domain — CLI commands and operations.
 *
 * Commands: `pragma block list`, `pragma block lookup <name>`.
 * Operations: {@link lookupBlock}, {@link listBlocks}.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, lookupCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), lookupCommand(ctx)];
}

export { blockConfig } from "./blockConfig.js";
export { specs as mcpSpecs } from "./mcp/index.js";
export { listBlocks, lookupBlock } from "./operations/index.js";
