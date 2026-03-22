/**
 * `pragma block lookup` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { lookupFormatters } from "../formatters/index.js";
import { resolveAspects } from "../helpers/index.js";
import { listBlocks, lookupBlock } from "../operations/index.js";
import type { AspectFlags } from "../types.js";

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["block", "lookup"],
    description: "Look up block details",
    parameters: [
      {
        name: "name",
        description: "Block name",
        type: "string",
        positional: true,
        required: true,
        complete: async (partial: string) => {
          const all = await listBlocks(ctx.store, ctx.config);
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
        "pragma block lookup Button",
        "pragma block lookup Button --detailed",
        "pragma block lookup Button --anatomy --modifiers",
        "pragma block lookup Button --detailed --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const name = params.name as string;
      if (!name) {
        throw PragmaError.invalidInput("name", "(empty)", {
          recovery: {
            message: "List available blocks.",
            cli: "pragma block list",
            mcp: { tool: "block_list" },
          },
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

      const block = await lookupBlock(ctx.store, name, ctx.config);

      return createOutputResult(
        { block, detailed: showDetailed, aspects },
        {
          plain: selectFormatter(ctx, lookupFormatters),
        },
      );
    },
  };
}
