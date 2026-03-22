/**
 * Create domain — generator commands for `pragma create`.
 *
 * PA.13 — selective inclusion: component (react/svelte/lit) + package.
 * Monorepo generator is excluded.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import { componentCommand, packageCommand } from "./commands/index.js";

export function commands(): CommandDefinition[] {
  return [componentCommand(), packageCommand()];
}

export { specs as mcpSpecs } from "./mcp/index.js";
