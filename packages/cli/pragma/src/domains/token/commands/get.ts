import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { createGetFormatters } from "../formatters/index.js";
import { getToken } from "../operations/index.js";

export default function getCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["token", "get"],
    description: "Get detailed information for a design token",
    parameters: [
      {
        name: "name",
        description: "Token name (e.g., color.primary)",
        type: "string",
        positional: true,
        required: true,
      },
      {
        name: "detailed",
        description: "Include values per theme",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma token get color.primary",
        "pragma token get color.primary --detailed",
        "pragma token get color.primary --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const name = params.name as string;
      const detailed = (params.detailed as boolean) ?? false;
      const token = await getToken(ctx.store, name);
      const formatters = createGetFormatters({ detailed });

      return createOutputResult(token, {
        plain: selectFormatter(ctx, formatters),
      });
    },
  };
}
