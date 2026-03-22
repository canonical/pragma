/**
 * MCP tool specs for the skill domain.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import { listFormatters as skillListFmt } from "../formatters/index.js";
import { listSkills } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "skill_list",
    description: "List available agent skills from design system packages.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const { skills, sources } = await listSkills(rt.cwd);

      if (condensed) {
        const text = skillListFmt.llm({ skills, sources, detailed: false });
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: { skills, sources }, meta: { count: skills.length } };
    },
  },
];

export default specs;
