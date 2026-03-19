/**
 * Component command definitions for `pragma component list` and `pragma component get`.
 *
 * Wires D3 shared operations to the CLI via CommandDefinition[].
 * Consumed by collectCommands() in runCli.ts.
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
  formatComponentGet,
  formatComponentGetDetailed,
  formatComponentGetJson,
  formatComponentGetLlm,
} from "./formatComponentGet.js";
import {
  formatComponentList,
  formatComponentListJson,
  formatComponentListLlm,
} from "./formatComponentList.js";
import { getComponent, listComponents } from "./operations.js";
import type { AspectFlags } from "./resolveAspects.js";
import resolveAspects from "./resolveAspects.js";

/**
 * Build component CommandDefinition[] bound to a live store and config.
 *
 * @note Impure — the returned commands close over the store and config.
 */
export default function buildComponentCommands(
  store: Store,
  config: FilterConfig,
): CommandDefinition[] {
  return [buildListCommand(store, config), buildGetCommand(store, config)];
}

// =============================================================================
// List command
// =============================================================================

function buildListCommand(
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

// =============================================================================
// Get command
// =============================================================================

function buildGetCommand(
  store: Store,
  config: FilterConfig,
): CommandDefinition {
  return {
    path: ["component", "get"],
    description: "Get component details",
    parameters: [
      {
        name: "name",
        description: "Component name",
        type: "string",
        positional: true,
        required: true,
        complete: async (partial: string) => {
          const all = await listComponents(store, config);
          return all
            .map((c) => c.name)
            .filter((n) => n.toLowerCase().startsWith(partial.toLowerCase()));
        },
      },
      {
        name: "detailed",
        description:
          "Show full details including anatomy, modifiers, tokens, and standards",
        type: "boolean",
        default: false,
      },
      {
        name: "anatomy",
        description: "Show anatomy tree",
        type: "boolean",
        default: false,
      },
      {
        name: "modifiers",
        description: "Show modifier values",
        type: "boolean",
        default: false,
      },
      {
        name: "tokens",
        description: "Show token references",
        type: "boolean",
        default: false,
      },
      {
        name: "standards",
        description: "Show applicable standards",
        type: "boolean",
        default: false,
      },
      {
        name: "implementations",
        description: "Show implementation paths",
        type: "boolean",
        default: false,
      },
    ],
    parameterGroups: {
      "Aspect filters": [
        "anatomy",
        "modifiers",
        "tokens",
        "standards",
        "implementations",
      ],
    },
    meta: {
      examples: [
        "pragma component get Button",
        "pragma component get Button --detailed",
        "pragma component get Button --anatomy --modifiers",
        "pragma component get Button --detailed --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
      ctx: CommandContext,
    ): Promise<CommandResult> => {
      const name = params.name as string;
      if (!name) {
        throw PragmaError.invalidInput("name", "(empty)", {
          recovery: "Run `pragma component list` to see available components",
        });
      }

      const detailed = params.detailed === true;
      const aspectInput: Partial<AspectFlags> = {
        anatomy: params.anatomy === true,
        modifiers: params.modifiers === true,
        tokens: params.tokens === true,
        standards: params.standards === true,
        implementations: params.implementations === true,
      };

      // If any aspect flag is set, treat as detailed
      const isAspectSelected =
        aspectInput.anatomy ||
        aspectInput.modifiers ||
        aspectInput.tokens ||
        aspectInput.standards ||
        aspectInput.implementations;
      const showDetailed = detailed || (isAspectSelected ?? false);
      const aspects = resolveAspects(aspectInput);

      const component = await getComponent(store, name, config);

      return createOutputResult(component, {
        plain: (data) => {
          if (ctx.globalFlags.format === "json") {
            return formatComponentGetJson(data, showDetailed, aspects);
          }
          if (ctx.globalFlags.llm) {
            return formatComponentGetLlm(data, showDetailed, aspects);
          }
          if (showDetailed) {
            return formatComponentGetDetailed(data, aspects);
          }
          return formatComponentGet(data);
        },
      });
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function describeFilters(filters: FilterConfig): Record<string, string> {
  const result: Record<string, string> = {};
  if (filters.tier) result.tier = filters.tier;
  result.channel = filters.channel;
  return result;
}
