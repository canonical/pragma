/**
 * MCP orientation tools — capabilities, llm.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  COMMAND_REFERENCE,
  DECISION_TREES,
} from "../../domains/llm/data/index.js";
import { collectContext as collectLlmContext } from "../../domains/llm/operations/index.js";
import type { LlmData } from "../../domains/llm/types.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { wrapTool } from "../utils/index.js";
import { buildFilters } from "./helpers.js";

/** All registered tool names, categorized for the capabilities response. */
const toolNames = {
  read: [
    "component_list",
    "component_get",
    "standard_list",
    "standard_get",
    "standard_categories",
    "modifier_list",
    "modifier_get",
    "token_list",
    "token_get",
    "tier_list",
    "config_show",
    "ontology_list",
    "ontology_show",
    "graph_query",
    "graph_inspect",
    "skill_list",
  ],
  write: ["create_component", "create_package"],
  orientation: ["llm", "capabilities"],
  diagnostic: ["doctor", "info"],
};
const allToolNames = [
  ...toolNames.read,
  ...toolNames.write,
  ...toolNames.orientation,
  ...toolNames.diagnostic,
];

/**
 * Register capabilities and llm tools.
 */
export function registerOrientationTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "capabilities",
    {
      description:
        "List all available pragma MCP tools with counts by category. Call this first to discover what pragma can do. (~100 tokens)",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async () => {
      return {
        data: {
          tools: allToolNames,
          counts: {
            total: allToolNames.length,
            read: toolNames.read.length,
            write: toolNames.write.length,
            orientation: toolNames.orientation.length,
            diagnostic: toolNames.diagnostic.length,
          },
        },
      };
    }),
  );

  server.registerTool(
    "llm",
    {
      description:
        "Get LLM orientation for the pragma design system CLI. Returns context, decision trees for common intents, and command reference with token costs. Call this first when starting a design system task.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt) => {
      const filters = buildFilters(rt);
      const context = await collectLlmContext(rt.store, filters);
      const data: LlmData = {
        context,
        decisionTrees: DECISION_TREES,
        commandReference: COMMAND_REFERENCE,
      };
      return { data };
    }),
  );
}
