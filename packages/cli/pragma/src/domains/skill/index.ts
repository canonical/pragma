/**
 * Skill domain — CLI commands and operations.
 *
 * Commands: `pragma skill list`
 */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx)];
}

export { specs as mcpSpecs } from "./mcp/index.js";
export type { SkillListResult } from "./operations/index.js";
export { discoverSkills, listSkills } from "./operations/index.js";
