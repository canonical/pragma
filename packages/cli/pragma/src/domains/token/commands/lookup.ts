/**
 * Wires the `pragma token lookup <name>` CLI command.
 *
 * Retrieves detailed information for a single design token, including
 * per-theme values when `--detailed` is passed.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { createLookupFormatters } from "../formatters/index.js";
import { lookupToken } from "../operations/index.js";

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["token", "lookup"],
    description: "Look up detailed information for a design token",
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
        "pragma token lookup color.primary",
        "pragma token lookup color.primary --detailed",
        "pragma token lookup color.primary --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const name = params.name as string;
      const detailed = (params.detailed as boolean) ?? false;
      const token = await lookupToken(ctx.store, name);
      const formatters = createLookupFormatters({ detailed });

      return createOutputResult(token, {
        plain: selectFormatter(ctx, formatters),
      });
    },
  };
}
