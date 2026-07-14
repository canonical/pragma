/**
 * Wires the top-level `pragma setup` command to the setup generator.
 *
 * `setup` is bridged the same way `create <thing>` is — through
 * {@link executeGenerator} — so it inherits the rich prompt UI, `--yes`,
 * `--dry-run`, and machine-readable output. The command injects the project
 * root (`ctx.cwd`) as the generator's `root` answer, since the environment
 * steps write to absolute paths derived from it.
 */

import {
  type CommandDefinition,
  executeGenerator,
  type ParameterDefinition,
  promptToParameter,
} from "@canonical/cli-core";
import { setupGenerator } from "../generator.js";

/**
 * Build the top-level `pragma setup` command definition.
 *
 * @returns The command definition for `pragma setup`.
 */
export default function buildSetupCommand(): CommandDefinition {
  const promptParams = setupGenerator.prompts.map(promptToParameter);

  const execParams: ParameterDefinition[] = [
    {
      name: "dryRun",
      description: "Preview without applying",
      type: "boolean",
    },
    { name: "yes", description: "Skip confirmation prompts", type: "boolean" },
  ];

  return {
    path: ["setup"],
    description:
      "Configure this project's environment: completions, LSP, and MCP",
    parameters: [...promptParams, ...execParams],
    execute: async (params, commandCtx) =>
      executeGenerator(
        setupGenerator,
        { ...params, root: commandCtx.cwd },
        commandCtx,
      ),
    meta: {
      examples: setupGenerator.meta.examples ?? [],
    },
  };
}
