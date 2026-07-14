/**
 * Wires the `pragma modifier sample` CLI command.
 *
 * Returns 1–5 complete modifier family instances as exemplars so agents
 * can learn the data shape before writing queries.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import parseSampleCount from "../../shared/parseSampleCount.js";
import type { ModifierFamily, SampleOutput } from "../../shared/types/index.js";
import { sampleFormatters } from "../formatters/index.js";
import { sampleModifiers } from "../operations/index.js";

const NEXT_STEPS = [
  "Use modifier_lookup to inspect specific modifier families by name.",
  "Use modifier_list to see all available modifier families.",
];

export default function sampleCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["modifier", "sample"],
    description:
      "Return randomly selected complete modifier family instances as exemplars for shape discovery",
    parameters: [
      {
        name: "count",
        type: "string",
        description: "Number of samples to return (1–5, default 2)",
        required: false,
      },
    ],
    meta: {
      examples: ["pragma modifier sample", "pragma modifier sample --count 3"],
    },
    async execute(params) {
      const count = parseSampleCount(params.count);
      const result = await sampleModifiers(ctx.store, count);

      const output: SampleOutput<ModifierFamily> = {
        ...result,
        nextSteps: NEXT_STEPS,
      };

      return createOutputResult(output, {
        plain: selectFormatter(ctx, sampleFormatters),
      });
    },
  };
}
