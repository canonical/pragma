/**
 * MCP tool specs for the modifier domain — modifier_list, modifier_lookup,
 * modifier_sample.
 *
 * The list and lookup tools are compiled from the modifier read stories in
 * `../stories.ts`; only the sample tool is spec'd by hand. The adapter
 * layer converts these into registered MCP tools via `registerFromSpec()`.
 */

import {
  compileLookupTool,
  compileReadTool,
  condense,
} from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { sampleFormatters as modifierSampleFmt } from "../formatters/index.js";
import { sampleModifiers } from "../operations/index.js";
import { modifierListStory, modifierLookupStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(modifierListStory),
  compileLookupTool(modifierLookupStory),
  {
    name: "modifier_sample",
    description:
      "Return 1–5 randomly selected complete modifier family instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
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
