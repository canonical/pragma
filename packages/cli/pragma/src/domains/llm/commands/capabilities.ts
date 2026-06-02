import {
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
 * hints, discovery sequence, and output modes. No store needed.
 *
 * @returns A command definition for `capabilities`.
 */
export default function buildCapabilitiesCommand(): CommandDefinition {
  return {
    path: ["capabilities"],
    description:
      "Discover conventions, available tools, and discovery sequence",
    parameters: [],
    execute: async (): Promise<CommandResult> => {
      const data = buildCapabilitiesData();
      return createOutputResult(data, { plain: renderCapabilities });
    },
  };
}
