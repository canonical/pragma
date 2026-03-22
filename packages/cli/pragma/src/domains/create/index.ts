/** @module Create domain -- generator commands for `pragma create` (component and package). */

import type { CommandDefinition } from "@canonical/cli-core";
import { componentCommand, packageCommand } from "./commands/index.js";

/**
 * Return all create command definitions.
 *
 * @returns An array of CommandDefinitions for component and package generators.
 */
export function commands(): CommandDefinition[] {
  return [componentCommand(), packageCommand()];
}

export { specs as mcpSpecs } from "./mcp/index.js";
