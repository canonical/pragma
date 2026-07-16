import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { runTask } from "@canonical/task/node";
import { readConfig } from "#config";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { detailFormatters } from "../formatters/index.js";
import { validateDetail } from "../operations/index.js";
import { setDetailTask } from "../tasks/index.js";
import { resolveConfigScope, SCOPE_PARAMETERS } from "./configScope.js";

/**
 * Build the `pragma config detail` command definition.
 *
 * Supports three modes: set a default disclosure level, reset to default,
 * or query the current level when no arguments are provided. Levels are
 * pack-defined names (conventionally `summary`, `digest`, `detailed`);
 * a configured level unknown to a given noun is ignored for that noun.
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns The command definition for `pragma config detail`.
 * @note - Impure — writes config to disk.
 */
export default function buildDetailCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "detail"],
    description: "Set or reset the default disclosure level",
    parameters: [
      {
        name: "level",
        description:
          "Disclosure level (pack-defined; e.g. summary, digest, detailed)",
        type: "string",
        positional: true,
      },
      {
        name: "reset",
        description: "Reset detail to default (per-surface defaults apply)",
        type: "boolean",
        default: false,
      },
      ...SCOPE_PARAMETERS,
    ],
    meta: {
      examples: ["pragma config detail digest", "pragma config detail --reset"],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const scope = resolveConfigScope(params);
      const reset = params.reset === true;
      const level = params.level as string | undefined;

      // Contradictory input: a level AND --reset. Reject rather than silently
      // letting one win.
      if (reset && level !== undefined) {
        throw PragmaError.invalidInput("detail", level, {
          recovery: {
            message: "Pass either a detail level or --reset, not both.",
          },
        });
      }

      if (reset) {
        const result = await runTask(setDetailTask(ctx.cwd, undefined, scope));
        const format = selectFormatter(ctx, detailFormatters.reset);
        return createOutputResult(
          { field: "detail", path: result.path },
          { plain: format },
        );
      }

      // No level at all → query. An explicit empty string is invalid input
      // and is rejected by validateDetail below.
      if (level === undefined) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, detailFormatters.query);
        return createOutputResult(config.detail, {
          plain: format,
        });
      }

      const validated = validateDetail(level);

      const result = await runTask(setDetailTask(ctx.cwd, validated, scope));
      const format = selectFormatter(ctx, detailFormatters.set);
      return createOutputResult(
        { field: "detail", value: validated, path: result.path },
        { plain: format },
      );
    },
  };
}
