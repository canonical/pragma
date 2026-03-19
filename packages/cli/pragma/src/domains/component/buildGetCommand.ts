/**
 * Build the `pragma component get` command definition.
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
  formatComponentGet,
  formatComponentGetDetailed,
  formatComponentGetJson,
  formatComponentGetLlm,
} from "./formatComponentGet.js";
import getComponent from "./getComponent.js";
import listComponents from "./listComponents.js";
import resolveAspects from "./resolveAspects.js";
import type { AspectFlags } from "./types.js";

export default function buildGetCommand(
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
          "Show full details including anatomy, modifiers, tokens, and implementations",
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
        name: "implementations",
        description: "Show implementation paths",
        type: "boolean",
        default: false,
      },
    ],
    parameterGroups: {
      "Aspect filters": ["anatomy", "modifiers", "tokens", "implementations"],
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
          recovery: "Run `pragma component list` to see available components.",
        });
      }

      const detailed = params.detailed === true;
      const aspectInput: Partial<AspectFlags> = {
        anatomy: params.anatomy === true,
        modifiers: params.modifiers === true,
        tokens: params.tokens === true,
        implementations: params.implementations === true,
      };

      const isAspectSelected =
        aspectInput.anatomy ||
        aspectInput.modifiers ||
        aspectInput.tokens ||
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
