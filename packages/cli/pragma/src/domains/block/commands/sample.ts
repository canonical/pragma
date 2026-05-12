/**
 * Wires the `pragma block sample` CLI command.
 *
 * Returns 1–5 complete block instances as exemplars so agents
 * can learn the data shape before writing queries.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { BlockDetailed, SampleOutput } from "../../shared/types/index.js";
import { sampleFormatters } from "../formatters/index.js";
import { sampleBlocks } from "../operations/index.js";
import { buildBlockFilters } from "../orchestration/index.js";

const NEXT_STEPS = [
  "Use block_lookup to inspect specific blocks by name.",
  "Use block_list to see all available blocks with filtering.",
];

export default function sampleCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["block", "sample"],
    description:
      "Return randomly selected complete block instances as exemplars for shape discovery",
    parameters: [
      {
        name: "count",
        type: "string",
        description: "Number of samples to return (1–5, default 2)",
        required: false,
      },
    ],
    meta: {
      examples: ["pragma block sample", "pragma block sample --count 3"],
    },
    async execute(params) {
      const count = Number(params.count ?? 2);
      const filters = buildBlockFilters(ctx);
      const result = await sampleBlocks(ctx.store, filters, count);

      const output: SampleOutput<BlockDetailed> = {
        ...result,
        nextSteps: NEXT_STEPS,
      };

      return createOutputResult(output, {
        plain: selectFormatter(ctx, sampleFormatters),
      });
    },
  };
}
