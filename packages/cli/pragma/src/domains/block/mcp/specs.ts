/**
 * MCP tool specs for the block domain — block_list, block_lookup,
 * block_sample.
 *
 * The list and lookup tools are compiled from the block read stories in
 * `../stories.ts`; only the sample tool is spec'd by hand. The adapter
 * layer converts these into registered MCP tools via `registerFromSpec()`.
 */

import {
  compileLookupTool,
  compileReadTool,
  condense,
} from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { sampleFormatters as blockSampleFmt } from "../formatters/index.js";
import { sampleBlocks } from "../operations/index.js";
import { buildBlockFilters } from "../orchestration/index.js";
import { blockListStory, blockLookupStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(blockListStory),
  compileLookupTool(blockLookupStory),
  {
    name: "block_sample",
    description:
      "Return 1–5 randomly selected complete block instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
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
      const filters = buildBlockFilters(rt);
      const result = await sampleBlocks(rt.store, filters, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total blocks.`,
        "Use block_lookup to inspect specific blocks by name.",
        "Use block_list to see all available blocks with filtering.",
      ];

      if (condensed) {
        return condense(blockSampleFmt.llm({ ...result, nextSteps }));
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
