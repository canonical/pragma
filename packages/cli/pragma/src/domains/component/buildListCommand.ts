/**
 * Build the `pragma component list` command definition.
 *
 * @note Impure — the returned command closes over the store and config.
 */

import {
  type CommandContext,
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import type { FilterConfig } from "../shared/types.js";
import {
  formatComponentList,
  formatComponentListJson,
  formatComponentListLlm,
} from "./formatComponentList.js";
import { listComponents } from "./operations.js";

export default function buildListCommand(
  store: Store,
  config: FilterConfig,
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
      ctx: CommandContext,
    ): Promise<CommandResult> => {
      const allTiers = params.allTiers === true;
      const filters: FilterConfig = allTiers
        ? { tier: undefined, channel: config.channel }
        : config;

      const components = await listComponents(store, filters);

      if (components.length === 0) {
        throw PragmaError.emptyResults("component", {
          filters: describeFilters(filters),
          recovery: allTiers
            ? undefined
            : "Try `pragma component list --all-tiers` to widen the search",
        });
      }

      return createOutputResult(components, {
        plain: (data) => {
          if (ctx.globalFlags.format === "json") {
            return formatComponentListJson(data);
          }
          if (ctx.globalFlags.llm) {
            return formatComponentListLlm(data);
          }
          return formatComponentList(data);
        },
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
