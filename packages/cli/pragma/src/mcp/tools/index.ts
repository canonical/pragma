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
  ...orientationSpecs,
  ...createSpecs,
];

/**
 * Register all MCP tools on the server.
 *
 * @param server - The MCP server to register tools on.
 * @param runtime - The pragma runtime providing store and config.
 */
export default function registerAllTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  for (const spec of allSpecs) {
    registerFromSpec(server, runtime, spec);
  }

  // Story packs project onto the same surface. Leaf read nouns reserve only
  // the (noun, verb) pairs they own, so a pack can add a verb no built-in
  // owns; operational nouns (config, graph, …) stay reserved wholesale.
  const reserved = deriveReservedVerbs(
    allSpecs.map((spec) => nounVerbFromToolName(spec.name)),
  );
  for (const spec of compilePackToolSpecs(runtime, reserved)) {
    registerFromSpec(server, runtime, spec);
  }
}
