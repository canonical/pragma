/**
 * `pragma setup lsp` command definition.
 *
 * Configures VS Code for the Terrazzo LSP.
 *
 * @see SU.01 in B.15.SETUP
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import runSetupTask from "../helpers/runSetupTask.js";
import setupLsp from "../operations/setupLsp.js";

const lspCommand: CommandDefinition = {
  path: ["setup", "lsp"],
  description: "Configure VS Code for Terrazzo LSP",
  parameters: [
    {
      name: "dryRun",
      description: "Preview changes without writing",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: ["pragma setup lsp", "pragma setup lsp --dry-run"],
  },
  execute: async (
    params: Record<string, unknown>,
    ctx,
  ): Promise<CommandResult> =>
    runSetupTask(setupLsp(ctx.cwd), {
      dryRun: params.dryRun === true,
      verbose: ctx.globalFlags.verbose,
      llm: ctx.globalFlags.llm,
      format: ctx.globalFlags.format,
    }),
};

export default lspCommand;
