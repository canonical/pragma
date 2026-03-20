import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { getFormatters } from "../formatters/index.js";
import { getModifier } from "../operations/index.js";

export default function getCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["modifier", "get"],
    description: "Get a modifier family and its values",
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
        "pragma modifier get importance",
        "pragma modifier get importance --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const name = params.name as string;
      const family = await getModifier(ctx.store, name);

      return createOutputResult(family, {
        plain: selectFormatter(ctx, getFormatters),
      });
    },
  };
}
