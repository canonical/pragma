/**
 * Wires the `pragma token sample` CLI command.
 *
 * Returns 1–5 complete token instances as exemplars so agents
 * can learn the data shape before writing queries.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { SampleOutput, TokenDetailed } from "../../shared/types/index.js";
import { sampleFormatters } from "../formatters/index.js";
import { sampleTokens } from "../operations/index.js";

const NEXT_STEPS = [
  "Use token_lookup to inspect specific tokens by name.",
  "Use token_list to see all available tokens with filtering.",
];

export default function sampleCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["token", "sample"],
    description:
      "Return randomly selected complete token instances as exemplars for shape discovery",
    parameters: [
      {
        name: "count",
        type: "string",
        description: "Number of samples to return (1–5, default 2)",
        required: false,
      },
    ],
    meta: {
      examples: ["pragma token sample", "pragma token sample --count 3"],
    },
    async execute(params) {
      const count = Number(params.count ?? 2);
      const result = await sampleTokens(ctx.store, count);

      const output: SampleOutput<TokenDetailed> = {
        ...result,
        nextSteps: NEXT_STEPS,
      };

      return createOutputResult(output, {
        plain: selectFormatter(ctx, sampleFormatters),
      });
    },
  };
}
