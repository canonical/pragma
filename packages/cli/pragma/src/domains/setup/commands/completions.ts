import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import type { ShellId } from "../helpers/detectShell.js";
import runSetupTask from "../helpers/runSetupTask.js";
import setupCompletions from "../operations/setupCompletions.js";

/**
 * Map boolean shell flags to a ShellId.
 *
 * @param params - Command parameters containing optional shell flags.
 * @returns The forced ShellId, or undefined to auto-detect.
 */
function resolveForceShell(
  params: Record<string, unknown>,
): ShellId | undefined {
  if (params.zsh === true) return "zsh";
  if (params.bash === true) return "bash";
  if (params.fish === true) return "fish";
  return undefined;
}

/**
 * `pragma setup completions` command definition.
 *
 * Installs shell completion scripts for bash, zsh, or fish.
 * Auto-detects the shell unless overridden with --zsh, --bash, or --fish.
 *
 * @note Impure
 */
const completionsCommand: CommandDefinition = {
  path: ["setup", "completions"],
  description: "Install shell completion scripts",
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
    {
      name: "zsh",
      description: "Force zsh completions",
      type: "boolean",
      default: false,
    },
    {
      name: "bash",
      description: "Force bash completions",
      type: "boolean",
      default: false,
    },
    {
      name: "fish",
      description: "Force fish completions",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma setup completions",
      "pragma setup completions --zsh",
      "pragma setup completions --dry-run",
      "pragma setup completions --undo",
    ],
  },
  execute: async (
    params: Record<string, unknown>,
    ctx,
  ): Promise<CommandResult> =>
    runSetupTask(setupCompletions(resolveForceShell(params)), {
      dryRun: params.dryRun === true,
      undo: params.undo === true,
      verbose: ctx.globalFlags.verbose,
      llm: ctx.globalFlags.llm,
      format: ctx.globalFlags.format,
    }),
};

export default completionsCommand;
