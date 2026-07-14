/**
 * MCP tool specs for the standard domain — standard_list, standard_lookup,
 * standard_categories, standard_sample.
 *
 * The list and lookup tools are compiled from the standard read stories in
 * `../stories.ts`; categories and sample are spec'd by hand. The adapter
 * layer converts these into registered MCP tools via `registerFromSpec()`.
 */

import {
  compileLookupTool,
  compileReadTool,
  condense,
} from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  categoriesFormatters as standardCatFmt,
  sampleFormatters as standardSampleFmt,
} from "../formatters/index.js";
import { listCategories, sampleStandards } from "../operations/index.js";
import { standardListStory, standardLookupStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(standardListStory),
  compileLookupTool(standardLookupStory),
  {
    name: "standard_categories",
    description: "List all code standard categories.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const result = await listCategories(rt.store);

      if (condensed) {
        return condense(standardCatFmt.llm(result));
      }

      return { data: result, meta: { count: result.length } };
    },
  },
  {
    name: "standard_sample",
    description:
      "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
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
      const result = await sampleStandards(rt.store, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total standards.`,
        "Use standard_lookup to inspect specific standards by name.",
        "Use standard_list with category param to filter by category.",
      ];

      if (condensed) {
        return condense(standardSampleFmt.llm({ ...result, nextSteps }));
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
