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
import { tierFormatters } from "../formatters/index.js";
import { validateTier } from "../operations/index.js";
import { setTierTask } from "../tasks/index.js";
import { resolveConfigScope, SCOPE_PARAMETERS } from "./configScope.js";

/**
 * Build the `pragma config tier` command definition.
 *
 * Supports three modes: set a tier path (validated against the ontology),
 * reset to default, or query the current tier.
 *
 * @param ctx - Pragma context providing cwd, store, and formatter selection.
 * @returns The command definition for `pragma config tier`.
 * @note - Impure — validates tier against the ke store and writes config to disk.
 */
export default function buildTierCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "tier"],
    description: "Set or reset the active tier",
    parameters: [
      {
        name: "path",
        description: "Tier path (e.g., global, apps, apps/lxd)",
        type: "string",
        positional: true,
      },
      {
        name: "reset",
        description: "Reset tier to default (all tiers visible)",
        type: "boolean",
        default: false,
      },
      ...SCOPE_PARAMETERS,
    ],
    meta: {
      examples: ["pragma config tier apps/lxd", "pragma config tier --reset"],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const scope = resolveConfigScope(params);
      const reset = params.reset === true;
      const tierPath = params.path as string | undefined;

      // Contradictory input: a tier path AND --reset. Reject rather than
      // silently letting one win.
      if (reset && tierPath !== undefined) {
        throw PragmaError.invalidInput("tier", tierPath, {
          recovery: {
            message: "Pass either a tier path or --reset, not both.",
          },
        });
      }

      if (reset) {
        const result = await runTask(setTierTask(ctx.cwd, undefined, scope));
        const format = selectFormatter(ctx, tierFormatters.reset);
        return createOutputResult(
          { field: "tier", path: result.path },
          { plain: format },
        );
      }

      // No path at all → query. An explicit empty string is invalid input and
      // is rejected by validateTier below.
      if (tierPath === undefined) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, tierFormatters.query);
        return createOutputResult(config.tier, {
          plain: format,
        });
      }

      // Validate tier against ontology
      await validateTier(ctx.store, tierPath);

      const result = await runTask(setTierTask(ctx.cwd, tierPath, scope));
      const format = selectFormatter(ctx, tierFormatters.set);
      return createOutputResult(
        { field: "tier", value: tierPath, path: result.path },
        { plain: format },
      );
    },
  };
}
