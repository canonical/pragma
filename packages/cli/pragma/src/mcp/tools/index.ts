/**
 * MCP tool registration orchestrator.
 *
 * Collects declarative ToolSpec arrays from each domain and registers
 * them on the MCP server via the registerFromSpec adapter.
 *
 * @module
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { specs as blockSpecs } from "../../domains/block/mcp/index.js";
import { specs as capabilitiesSpecs } from "../../domains/capabilities/mcp/index.js";
import { specs as configSpecs } from "../../domains/config/mcp/index.js";
import { specs as createSpecs } from "../../domains/create/mcp/index.js";
import { specs as diagnosticSpecs } from "../../domains/doctor/mcp/index.js";
import { specs as graphSpecs } from "../../domains/graph/mcp/index.js";
import { specs as infoSpecs } from "../../domains/info/mcp/index.js";
import { specs as orientationSpecs } from "../../domains/llm/mcp/index.js";
import { specs as modifierSpecs } from "../../domains/modifier/mcp/index.js";
import { specs as ontologySpecs } from "../../domains/ontology/mcp/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import {
  compilePackToolSpecs,
  deriveReservedVerbs,
  nounVerbFromToolName,
} from "../../domains/shared/stories/pack/index.js";
import type { ToolSpec } from "../../domains/shared/ToolSpec.js";
import { specs as skillSpecs } from "../../domains/skill/mcp/index.js";
import { specs as tokenSpecs } from "../../domains/token/mcp/index.js";
import registerFromSpec from "./registerFromSpec.js";

/**
 * The full built-in MCP tool surface, in registration order.
 *
 * Exported so tests can derive the reserved-verb map from the identical
 * array production consumes (see the cross-surface reservation invariant).
 */
export const allSpecs: readonly ToolSpec[] = [
  ...blockSpecs,
  ...modifierSpecs,
  ...tokenSpecs,
  ...configSpecs,
  ...ontologySpecs,
  ...graphSpecs,
  ...skillSpecs,
  ...diagnosticSpecs,
  ...infoSpecs,
  // The capabilities aggregator registers at the position its predecessor
  // (the llm domain's static capabilities tool) held, keeping the ordered
  // tool surface stable.
  ...capabilitiesSpecs,
  ...orientationSpecs,
  ...createSpecs,
];

/**
 * The full tool-spec production for a runtime: built-ins plus compiled
 * pack tools, in registration order.
 *
 * This is THE production — the server registers it, prompt-embed
 * validation runs against it, and the `capabilities` reference level
 * projects it. Never build a second one.
 *
 * Story packs project onto the same surface. Leaf read nouns reserve only
 * the (noun, verb) pairs they own, so a pack can add a verb no built-in
 * owns; operational nouns (config, graph, …) stay reserved wholesale.
 *
 * @param runtime - The pragma runtime providing store and config.
 * @returns All tool specs, in registration order.
 */
/**
 * Extra whole-noun reservations with no backing tool spec.
 *
 * The `prompt` noun is reserved even though no prompt_* tool exists: its
 * MCP projection IS prompts/list / prompts/get (D5), so a story pack must
 * not be able to claim prompt_list / prompt_lookup on this surface. The
 * cross-surface parity test folds these in when deriving the MCP map.
 */
export const MCP_EXTRA_RESERVED: readonly (readonly [string, undefined])[] = [
  ["prompt", undefined],
];

export function collectToolSpecs(runtime: PragmaRuntime): ToolSpec[] {
  const reserved = deriveReservedVerbs([
    ...allSpecs.map((spec) => nounVerbFromToolName(spec.name)),
    ...MCP_EXTRA_RESERVED,
  ]);
  return [...allSpecs, ...compilePackToolSpecs(runtime, reserved)];
}

/**
 * Register all MCP tools on the server.
 *
 * @param server - The MCP server to register tools on.
 * @param runtime - The pragma runtime providing store and config.
 * @returns The registered spec production, for reuse by the prompts
 *   surface (embed resolution) without a second build.
 */
export default function registerAllTools(
  server: McpServer,
  runtime: PragmaRuntime,
): ToolSpec[] {
  const specs = collectToolSpecs(runtime);
  for (const spec of specs) {
    registerFromSpec(server, runtime, spec);
  }
  return specs;
}
