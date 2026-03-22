/**
 * `pragma component get` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { getFormatters } from "../formatters/index.js";
import { resolveAspects } from "../helpers/index.js";
import { getComponent, listComponents } from "../operations/index.js";
import type { AspectFlags } from "../types.js";

export default function buildGetCommand(ctx: PragmaContext): CommandDefinition {
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
          const all = await listComponents(ctx.store, ctx.config);
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

      const component = await getComponent(ctx.store, name, ctx.config);

      return createOutputResult(
        { component, detailed: showDetailed, aspects },
        {
          plain: selectFormatter(ctx, getFormatters),
        },
      );
    },
  };
}
