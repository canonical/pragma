/**
 * Wires the `pragma standard sample` CLI command.
 *
 * Returns 1–5 complete standard instances as exemplars so agents
 * can learn the data shape before writing queries.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type {
  SampleOutput,
  StandardDetailed,
} from "../../shared/types/index.js";
import { sampleFormatters } from "../formatters/index.js";
import { sampleStandards } from "../operations/index.js";

const NEXT_STEPS = [
  "Use standard_lookup to inspect specific standards by name.",
  "Use standard_list with --category to filter by category.",
  "Use standard_categories to see all available categories.",
];

export default function sampleCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["standard", "sample"],
    description:
      "Return randomly selected complete standard instances as exemplars for shape discovery",
    parameters: [
      {
        name: "count",
        type: "string",
        description: "Number of samples to return (1–5, default 2)",
        required: false,
      },
    ],
    meta: {
      examples: ["pragma standard sample", "pragma standard sample --count 3"],
    },
    async execute(params) {
      const count = Number(params.count ?? 2);
      const result = await sampleStandards(ctx.store, count);

      const output: SampleOutput<StandardDetailed> = {
        ...result,
        nextSteps: NEXT_STEPS,
      };

      return createOutputResult(output, {
        plain: selectFormatter(ctx, sampleFormatters),
      });
    },
  };
}
