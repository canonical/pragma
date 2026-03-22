/**
 * MCP skill tools — skill_list.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { listFormatters as skillListFmt } from "../../domains/skill/formatters/index.js";
import { listSkills } from "../../domains/skill/operations/index.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register skill_list tool.
 */
export function registerSkillTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "skill_list",
    {
      description: "List available agent skills from design system packages.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const { skills, sources } = await listSkills(rt.cwd);

      if (condensed) {
        const text = skillListFmt.llm({ skills, sources, detailed: false });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: { skills, sources }, meta: { count: skills.length } };
    }),
  );
}
