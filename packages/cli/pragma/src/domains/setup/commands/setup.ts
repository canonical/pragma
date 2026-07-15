/**
 * Wires the top-level `pragma setup` command.
 *
 * `setup` is one level more general than `create <thing>`: it configures the
 * whole local environment (completions, LSP, MCP). Unlike `create`, its steps
 * perform *read* effects whose results drive control flow — detecting AI
 * harnesses, checking what is already installed — so it must run for real and
 * report the real outcome. It therefore executes through {@link runSetupTask}
 * (real execution, streamed output) rather than the generator preview-then-
 * execute path, which would render a dry-run preview whose stubbed reads report
 * the wrong state (e.g. "no harnesses detected").
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import runSetupTask from "../helpers/runSetupTask.js";
import setupAll from "../operations/setupAll.js";

/**
 * Build the top-level `pragma setup` command definition.
 *
 * @returns The command definition for `pragma setup`.
 * @note Impure
 */
export default function buildSetupCommand(): CommandDefinition {
  return {
    path: ["setup"],
    description:
      "Configure this project's environment: completions, LSP, and MCP",
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
        name: "yes",
        description: "Skip all confirmation prompts",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma setup",
        "pragma setup --yes",
        "pragma setup --dry-run",
        "pragma setup --undo",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
      ctx,
    ): Promise<CommandResult> =>
      runSetupTask(setupAll(ctx.cwd), {
        dryRun: params.dryRun === true,
        undo: params.undo === true,
        yes: params.yes === true,
        verbose: ctx.globalFlags.verbose,
        llm: ctx.globalFlags.llm,
        format: ctx.globalFlags.format,
      }),
  };
}
