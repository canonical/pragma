/** @module Setup domain -- commands for environment configuration (completions, LSP, MCP, skills). */

import type { CommandDefinition } from "@canonical/cli-core";
import {
  allCommand,
  completionsCommand,
  lspCommand,
  mcpCommand,
  skillsCommand,
} from "./commands/index.js";

/**
 * Return all setup command definitions.
 *
 * @returns An array of CommandDefinitions for the setup subcommands.
 */
export function commands(): CommandDefinition[] {
  return [
    allCommand,
    lspCommand,
    mcpCommand,
    completionsCommand,
    skillsCommand(),
  ];
}

export {
  setupAll,
  setupCompletions,
  setupLsp,
  setupMcp,
  setupSkills,
} from "./operations/index.js";
