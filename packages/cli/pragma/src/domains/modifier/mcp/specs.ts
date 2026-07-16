/**
 * MCP tool specs for the modifier domain — modifier_sample only.
 *
 * `modifier_list` and `modifier_lookup` are compiled from the bundled
 * `modifier` story pack; the sample tool stays spec'd by hand until the
 * generic pack sample verb lands. The adapter layer converts these into
 * registered MCP tools via `registerFromSpec()`.
 */

import { condense } from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { sampleFormatters as modifierSampleFmt } from "../formatters/index.js";
import { sampleModifiers } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "modifier_sample",
    description:
      "Return 1–5 randomly selected complete modifier family instances as " +
      "exemplars (different each call). Use when new to modifier data — " +
      "see actual shapes with value lists BEFORE writing queries. Example: " +
      'modifier_sample { count: "2" }.',
    params: {
      count: {
        type: "string",
        description: "Number of samples (1–5, default 2)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { count, condensed }) {
      const n = Number(count ?? 2);
      const result = await sampleModifiers(rt.store, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total modifier families.`,
        "Use modifier_lookup to inspect specific modifier families by name.",
        "Use modifier_list to see all available modifier families.",
      ];

      if (condensed) {
        return condense(modifierSampleFmt.llm({ ...result, nextSteps }));
      }

      return {
        data: {
          samples: result.samples,
          totalCount: result.totalCount,
          nextSteps,
        },
        meta: { count: result.samples.length },
      };
    },
  },
] as const;

export default specs;
