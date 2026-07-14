import {
  type CommandContext,
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import renderCapabilities from "../formatters/capabilities.js";
import { buildCapabilitiesData } from "../mcp/specs.js";

/**
 * Builds the `pragma capabilities` command definition.
 *
 * Returns a static system map: conventions, tool catalog with behavioral
 * hints, discovery sequence, and output modes. No store needed. Honours
 * `--format json` by emitting the structured payload so agents can parse it.
 *
 * @returns A command definition for `capabilities`.
 */
export default function buildCapabilitiesCommand(): CommandDefinition {
  return {
    path: ["capabilities"],
    description:
      "Discover conventions, available tools, and discovery sequence",
    parameters: [],
    execute: async (
      _params: Record<string, unknown>,
      ctx: CommandContext,
    ): Promise<CommandResult> => {
      const data = buildCapabilitiesData();
      const asJson = ctx?.globalFlags?.format === "json";
      return createOutputResult(data, {
        plain: (value) =>
          asJson ? JSON.stringify(value, null, 2) : renderCapabilities(value),
      });
    },
  };
}
