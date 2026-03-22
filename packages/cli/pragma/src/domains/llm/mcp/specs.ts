/**
 * MCP tool specs for llm domain — capabilities, llm.
 */

import { buildFilterConfig } from "../../shared/filters/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { COMMAND_REFERENCE, DECISION_TREES } from "../data/index.js";
import { collectContext } from "../operations/index.js";
import type { LlmData } from "../types.js";

/** All registered tool names, categorized for the capabilities response. */
const toolNames = {
  read: [
    "block_list",
    "block_lookup",
    "block_batch_lookup",
    "standard_list",
    "standard_lookup",
    "standard_batch_lookup",
    "standard_categories",
    "modifier_list",
    "modifier_lookup",
    "modifier_batch_lookup",
    "token_list",
    "token_lookup",
    "token_batch_lookup",
    "tier_list",
    "config_show",
    "ontology_list",
    "ontology_show",
    "graph_query",
    "graph_inspect",
    "skill_list",
  ],
  write: [
    "config_tier",
    "config_channel",
    "tokens_add_config",
    "create_component",
    "create_package",
  ],
  orientation: ["llm", "capabilities"],
  diagnostic: ["doctor", "info"],
};
const allToolNames = [
  ...toolNames.read,
  ...toolNames.write,
  ...toolNames.orientation,
  ...toolNames.diagnostic,
];

const specs: readonly ToolSpec[] = [
  {
    name: "capabilities",
    description:
      "List all available pragma MCP tools with counts by category. Call this first to discover what pragma can do. (~100 tokens)",
    readOnly: true,
    async execute() {
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
    },
  },
  {
    name: "llm",
    description:
      "Get LLM orientation for the pragma design system CLI. Returns context, decision trees for common intents, and command reference with token costs. Call this first when starting a design system task.",
    readOnly: true,
    async execute(rt) {
      const filters = buildFilterConfig(rt);
      const context = await collectContext(rt.store, filters);
      const data: LlmData = {
        context,
        decisionTrees: DECISION_TREES,
        commandReference: COMMAND_REFERENCE,
      };
      return { data };
    },
  },
];

export default specs;
