import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { listTokens } from "../operations/index.js";

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
      const category = params.category as string | undefined;
      const tokens = await listTokens(ctx.store, { category });

      if (tokens.length === 0) {
        throw PragmaError.emptyResults("token", {
          filters: category ? { category } : undefined,
          recovery: category
            ? {
                message: "List all tokens without category filter.",
                cli: "pragma token list",
                mcp: { tool: "token_list" },
              }
            : {
                message:
                  "Ensure design system packages are installed: bun add -D @canonical/ds-global",
              },
        });
      }

      return createOutputResult(tokens, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
