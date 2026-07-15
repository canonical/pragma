/** @module Setup domain -- commands for environment configuration (completions, LSP, MCP, skills). */

import type { CommandDefinition } from "@canonical/cli-core";
import {
  completionsCommand,
  lspCommand,
  mcpCommand,
  setupCommand,
  skillsCommand,
} from "./commands/index.js";

/**
 * Return all setup command definitions.
 *
 * The top-level `pragma setup` is a summon-generator-backed command (replacing
 * the former `setup all`); the granular `setup <step>` verbs remain for
 * targeted, scriptable configuration of a single concern.
 *
 * @returns An array of CommandDefinitions for the setup command and its verbs.
 */
export function commands(): CommandDefinition[] {
  return [
    setupCommand(),
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
