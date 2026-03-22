import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { lookupFormatters } from "../formatters/index.js";
import { lookupModifier } from "../operations/index.js";

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["modifier", "lookup"],
    description: "Look up a modifier family and its values",
    parameters: [
      {
        name: "name",
        description: "Modifier family name (e.g., importance)",
        type: "string",
        positional: true,
        required: true,
      },
    ],
    meta: {
      examples: [
        "pragma modifier lookup importance",
        "pragma modifier lookup importance --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const name = params.name as string;
      const family = await lookupModifier(ctx.store, name);

      return createOutputResult(family, {
        plain: selectFormatter(ctx, lookupFormatters),
      });
    },
  };
}
