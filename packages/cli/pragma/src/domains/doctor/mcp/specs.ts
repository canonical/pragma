/**
 * MCP tool specs for the doctor domain.
 *
 * The info tool has moved to its own domain: `info/mcp/specs.ts`.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import { doctorFormatters } from "../formatters/index.js";
import { runChecks } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "doctor",
    description:
      "Run health checks on the pragma environment. Validates config, store, completions, skills, and more.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const result = await runChecks({ cwd: rt.cwd });

      if (params.condensed) {
        const text = doctorFormatters.llm(result);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result };
    },
  },
];

export default specs;
