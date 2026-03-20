/**
 * `pragma setup mcp` command definition.
 *
 * Configures the pragma MCP server for detected AI harnesses.
 *
 * @see SU.02, HR.05 in B.15.SETUP / B.17.HARNESS
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import runSetupTask from "../helpers/runSetupTask.js";
import setupMcp from "../operations/setupMcp.js";

function resolveForceHarness(
  params: Record<string, unknown>,
): string | undefined {
  if (params.claudeCode === true) return "claude-code";
  if (params.cursor === true) return "cursor";
  if (params.windsurf === true) return "windsurf";
  return undefined;
}

const mcpCommand: CommandDefinition = {
  path: ["setup", "mcp"],
  description: "Configure pragma MCP server for AI harnesses",
  parameters: [
    {
      name: "dryRun",
      description: "Preview changes without writing",
      type: "boolean",
      default: false,
    },
    {
      name: "yes",
      description: "Skip confirmation prompts",
      type: "boolean",
      default: false,
    },
    {
      name: "claudeCode",
      description: "Configure for Claude Code only",
      type: "boolean",
      default: false,
    },
    {
      name: "cursor",
      description: "Configure for Cursor only",
      type: "boolean",
      default: false,
    },
    {
      name: "windsurf",
      description: "Configure for Windsurf only",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma setup mcp",
      "pragma setup mcp --claude-code",
      "pragma setup mcp --dry-run",
    ],
  },
  execute: async (
    params: Record<string, unknown>,
    ctx,
  ): Promise<CommandResult> =>
    runSetupTask(setupMcp(ctx.cwd, resolveForceHarness(params)), {
      dryRun: params.dryRun === true,
      yes: params.yes === true,
      verbose: ctx.globalFlags.verbose,
      llm: ctx.globalFlags.llm,
      format: ctx.globalFlags.format,
    }),
};

export default mcpCommand;
