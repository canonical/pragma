/**
 * MCP tool specs for the tier domain.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import { listFormatters as tierListFmt } from "../formatters/index.js";
import { listTiers } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "tier_list",
    description: "List all tiers in the design system ontology with hierarchy.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const result = await listTiers(rt.store);

      if (condensed) {
        const text = tierListFmt.llm(result);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result, meta: { count: result.length } };
    },
  },
];

export default specs;
