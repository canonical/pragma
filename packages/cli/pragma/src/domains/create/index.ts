/** @module Create domain -- generator commands for `pragma create` (component, package, application). */

import type { CommandDefinition } from "@canonical/cli-core";
import {
  applicationCommand,
  componentCommand,
  packageCommand,
} from "./commands/index.js";

/**
 * Return all create command definitions.
 *
 * @returns An array of CommandDefinitions for the component, package, and
 *   application generators.
 */
export function commands(): CommandDefinition[] {
  return [componentCommand(), packageCommand(), applicationCommand()];
}

export { specs as mcpSpecs } from "./mcp/index.js";
