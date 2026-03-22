import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { readConfig, writeConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { channelFormatters } from "../formatters/index.js";
import { validateChannel } from "../operations/index.js";

/**
 * Build the `pragma config channel` command definition.
 *
 * Supports three modes: set a channel value, reset to default, or
 * query the current channel when no arguments are provided.
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns The command definition for `pragma config channel`.
 * @note Impure
 */
export default function buildChannelCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "channel"],
    description: "Set or reset the release channel",
    parameters: [
      {
        name: "value",
        description: "Channel (normal, experimental, prerelease)",
        type: "string",
        positional: true,
      },
      {
        name: "reset",
        description: "Reset channel to normal",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma config channel experimental",
        "pragma config channel --reset",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const reset = params.reset === true;
      const value = params.value as string | undefined;

      if (reset) {
        writeConfig(ctx.cwd, { channel: undefined });
        const format = selectFormatter(ctx, channelFormatters.reset);
        return createOutputResult("Reset channel to default.", {
          plain: format,
        });
      }

      if (!value) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, channelFormatters.query);
        return createOutputResult(config.channel, {
          plain: format,
        });
      }

      const channel = validateChannel(value);

      writeConfig(ctx.cwd, { channel });
      const format = selectFormatter(ctx, channelFormatters.set);
      return createOutputResult(
        { field: "channel", value: channel },
        { plain: format },
      );
    },
  };
}
