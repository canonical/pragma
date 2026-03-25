/**
 * Wires the `pragma token list` CLI command.
 *
 * Lists all design tokens with an optional `--category` filter.
 * Throws a structured recovery error when no tokens match.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { resolveTokenList } from "../orchestration/index.js";

export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["token", "list"],
    description: "List all design tokens",
    parameters: [
      {
        name: "category",
        description: "Filter by token type (e.g., Color, Dimension)",
        type: "string",
      },
    ],
    meta: {
      examples: [
        "pragma token list",
        "pragma token list --category color",
        "pragma token list --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const resolution = await resolveTokenList(ctx, {
        category: params.category as string | undefined,
      });

      return createOutputResult([...resolution.items], {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
