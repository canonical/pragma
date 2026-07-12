import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { runTask } from "@canonical/task";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { channelFormatters } from "../formatters/index.js";
import { validateChannel } from "../operations/index.js";
import { setChannelTask } from "../tasks/index.js";
import { resolveConfigScope, SCOPE_PARAMETERS } from "./configScope.js";

/**
 * Build the `pragma config channel` command definition.
 *
 * Supports three modes: set a channel value, reset to default, or
 * query the current channel when no arguments are provided.
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns The command definition for `pragma config channel`.
 * @note - Impure — validates channel and writes config to disk.
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
      ...SCOPE_PARAMETERS,
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
      const scope = resolveConfigScope(params);
      const reset = params.reset === true;
      const value = params.value as string | undefined;

      if (reset) {
        const result = await runTask(setChannelTask(ctx.cwd, undefined, scope));
        const format = selectFormatter(ctx, channelFormatters.reset);
        return createOutputResult(
          { field: "channel", path: result.path },
          { plain: format },
        );
      }

      if (!value) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, channelFormatters.query);
        return createOutputResult(config.channel, {
          plain: format,
        });
      }

      const channel = validateChannel(value);

      const result = await runTask(setChannelTask(ctx.cwd, channel, scope));
      const format = selectFormatter(ctx, channelFormatters.set);
      return createOutputResult(
        { field: "channel", value: channel, path: result.path },
        { plain: format },
      );
    },
  };
}
