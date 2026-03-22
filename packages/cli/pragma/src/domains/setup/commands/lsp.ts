/**
 * `pragma setup lsp` command definition.
 *
 * Installs the Terrazzo LSP VS Code extension.
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import runSetupTask from "../helpers/runSetupTask.js";
import setupLsp from "../operations/setupLsp.js";

const lspCommand: CommandDefinition = {
  path: ["setup", "lsp"],
  description: "Install the Terrazzo LSP VS Code extension",
  parameters: [
    {
      name: "dryRun",
      description: "Preview changes without writing",
      type: "boolean",
      default: false,
    },
    {
      name: "undo",
      description: "Reverse a previous setup",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma setup lsp",
      "pragma setup lsp --dry-run",
      "pragma setup lsp --undo",
    ],
  },
  execute: async (
    params: Record<string, unknown>,
    ctx,
  ): Promise<CommandResult> =>
    runSetupTask(setupLsp(ctx.cwd), {
      dryRun: params.dryRun === true,
      undo: params.undo === true,
      verbose: ctx.globalFlags.verbose,
      llm: ctx.globalFlags.llm,
      format: ctx.globalFlags.format,
    }),
};

export default lspCommand;
