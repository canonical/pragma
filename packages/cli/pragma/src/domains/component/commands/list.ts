/**
 * `pragma component list` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { FilterConfig } from "../../shared/types.js";
import { listFormatters } from "../formatters/index.js";
import { listComponents } from "../operations/index.js";

export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["component", "list"],
    description: "List components in the design system",
    parameters: [
      {
        name: "allTiers",
        description: "Show components from all tiers",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma component list",
        "pragma component list --all-tiers",
        "pragma component list --llm",
        "pragma component list --format json",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const allTiers = params.allTiers === true;
      const filters: FilterConfig = allTiers
        ? { tier: undefined, channel: ctx.config.channel }
        : ctx.config;

      const components = await listComponents(ctx.store, filters);

      if (components.length === 0) {
        throw PragmaError.emptyResults("component", {
          filters: describeFilters(filters),
          recovery: allTiers
            ? undefined
            : "Try `pragma component list --all-tiers` to widen the search",
        });
      }

      return createOutputResult(components, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}

function describeFilters(filters: FilterConfig): Record<string, string> {
  const result: Record<string, string> = {};
  if (filters.tier) result.tier = filters.tier;
  result.channel = filters.channel;
  return result;
}
