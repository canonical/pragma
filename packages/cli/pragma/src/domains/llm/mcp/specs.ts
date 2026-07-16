/**
 * MCP tool specs for llm domain — capabilities, llm.
 */

import { VERSION } from "#constants";
import { buildFilterConfig } from "../../shared/filters/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { TOKEN_READ_SURFACE_ENABLED } from "../../token/featureFlag.js";
import {
  COMMAND_REFERENCE,
  DECISION_TREES,
  TOOL_CATALOG,
} from "../data/index.js";
import { collectContext } from "../operations/index.js";
import type { CapabilitiesData, LlmData } from "../types.js";

/** Build the static capabilities response. */
function buildCapabilitiesData(): CapabilitiesData {
  const counts = {
    total: TOOL_CATALOG.length,
    read: TOOL_CATALOG.filter((t) => t.category === "read").length,
    write: TOOL_CATALOG.filter((t) => t.category === "write").length,
    orientation: TOOL_CATALOG.filter((t) => t.category === "orientation")
      .length,
    diagnostic: TOOL_CATALOG.filter((t) => t.category === "diagnostic").length,
  };

  return {
    version: VERSION,
    conventions: {
      system:
        "Pragma is a CLI and MCP server for querying a design system knowledge graph — blocks, tokens, modifiers, standards, and ontologies.",
      model:
        "Data is scoped by tier (hierarchical, e.g. global > apps > apps/lxd) and channel (normal, experimental, prerelease). Set these via config_tier and config_channel.",
      querying:
        "All queries run against an RDF triple store. Prefixed IRIs (e.g. ds:global.component.button) identify entities. Use ontology_list to discover namespaces.",
    },
    discovery_sequence: [
      {
        stage: 1,
        tool: "capabilities",
        purpose: "Understand conventions, available tools, and how to navigate",
      },
      {
        stage: 2,
        tool: "*_sample",
        purpose: `Call block_sample, standard_sample,${TOKEN_READ_SURFACE_ENABLED ? " token_sample," : ""} or modifier_sample to see real data shapes before querying. Prevents guessing at property names.`,
      },
      {
        stage: 3,
        tool: "domain tools",
        purpose: `Query specific entities — block_list, standard_lookup, ${TOKEN_READ_SURFACE_ENABLED ? "token_list, " : ""}etc. Use the use_when hints above to pick the right tool.`,
      },
    ],
    tools: TOOL_CATALOG,
    counts,
    limits: {
      output_modes: ["text", "json", "llm"],
      condensed_available: true,
    },
  };
}

const specs: readonly ToolSpec[] = [
  {
    name: "capabilities",
    description:
      "Discover pragma conventions, available tools with behavioral hints, and discovery sequence. Call this first at session start.",
    readOnly: true,
    async execute() {
      return { data: buildCapabilitiesData() };
    },
  },
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

export { buildCapabilitiesData };
export default specs;
