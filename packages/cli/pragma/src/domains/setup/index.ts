/**
 * Setup domain — CLI commands for environment configuration.
 *
 * Commands: `pragma setup all`, `pragma setup lsp`, `pragma setup mcp`,
 * `pragma setup completions`
 *
 * Setup commands do not require the ke store. They operate on the
 * local filesystem and AI harness configs only.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import {
  allCommand,
  completionsCommand,
  lspCommand,
  mcpCommand,
} from "./commands/index.js";

export function commands(): CommandDefinition[] {
  return [allCommand, lspCommand, mcpCommand, completionsCommand];
}

export {
  setupAll,
  setupCompletions,
  setupLsp,
  setupMcp,
} from "./operations/index.js";
