import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { readConfig, writeConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { tierFormatters } from "../formatters/index.js";
import { validateTier } from "../operations/index.js";

/**
 * Build the `pragma config tier` command definition.
 *
 * Supports three modes: set a tier path (validated against the ontology),
 * reset to default, or query the current tier.
 *
 * @param ctx - Pragma context providing cwd, store, and formatter selection.
 * @returns The command definition for `pragma config tier`.
 * @note Impure
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
    ],
    meta: {
      examples: ["pragma config tier apps/lxd", "pragma config tier --reset"],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const reset = params.reset === true;
      const tierPath = params.path as string | undefined;

      if (reset) {
        writeConfig(ctx.cwd, { tier: undefined });
        const format = selectFormatter(ctx, tierFormatters.reset);
        return createOutputResult("Reset tier to default.", {
          plain: format,
        });
      }

      if (!tierPath) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, tierFormatters.query);
        return createOutputResult(config.tier, {
          plain: format,
        });
      }

      // Validate tier against ontology
      await validateTier(ctx.store, tierPath);

      writeConfig(ctx.cwd, { tier: tierPath });
      const format = selectFormatter(ctx, tierFormatters.set);
      return createOutputResult(
        { field: "tier", value: tierPath },
        { plain: format },
      );
    },
  };
}
