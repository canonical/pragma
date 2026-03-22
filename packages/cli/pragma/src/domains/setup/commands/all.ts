/**
 * `pragma setup all` command definition.
 *
 * Runs all setup steps (completions, lsp, mcp) as a single
 * composed Task with confirmation gates.
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import runSetupTask from "../helpers/runSetupTask.js";
import setupAll from "../operations/setupAll.js";

const allCommand: CommandDefinition = {
  path: ["setup", "all"],
  description: "Run all setup steps (completions, lsp, mcp)",
  parameters: [
    {
      name: "dryRun",
      description: "Preview changes without writing",
      type: "boolean",
      default: false,
    },
    {
      name: "yes",
      description: "Skip all confirmation prompts",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma setup all",
      "pragma setup all --yes",
      "pragma setup all --dry-run",
    ],
  },
  execute: async (
    params: Record<string, unknown>,
    ctx,
  ): Promise<CommandResult> =>
    runSetupTask(setupAll(ctx.cwd), {
      dryRun: params.dryRun === true,
      yes: params.yes === true,
      verbose: ctx.globalFlags.verbose,
      llm: ctx.globalFlags.llm,
      format: ctx.globalFlags.format,
    }),
};

export default allCommand;
