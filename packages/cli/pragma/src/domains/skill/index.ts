/** @module Skill domain -- CLI commands and operations for `pragma skill`. */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand } from "./commands/index.js";

/**
 * Return all skill command definitions.
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns An array of CommandDefinitions for the skill subcommands.
 */
export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export type { SkillListResult } from "./operations/index.js";
export { discoverSkills, listSkills } from "./operations/index.js";
