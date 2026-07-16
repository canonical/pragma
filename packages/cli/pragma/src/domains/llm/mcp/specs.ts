/**
 * MCP tool specs for llm domain — llm.
 *
 * (The `capabilities` tool moved to the capabilities domain as the
 * protocol-mirror aggregator.)
 */

import { buildFilterConfig } from "../../shared/filters/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { COMMAND_REFERENCE, DECISION_TREES } from "../data/index.js";
import { collectContext } from "../operations/index.js";
import type { LlmData } from "../types.js";

const specs: readonly ToolSpec[] = [
  {
    name: "llm",
    description:
      "Get live LLM orientation — context snapshot (tier, channel, entity counts), decision trees for common intents, and command reference with token costs. Call after capabilities when starting design system work.",
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
