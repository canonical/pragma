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
import { specs as orientationSpecs } from "../../domains/llm/mcp/index.js";
import { specs as modifierSpecs } from "../../domains/modifier/mcp/index.js";
import { specs as ontologySpecs } from "../../domains/ontology/mcp/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { ToolSpec } from "../../domains/shared/ToolSpec.js";
import { specs as skillSpecs } from "../../domains/skill/mcp/index.js";
import { specs as standardSpecs } from "../../domains/standard/mcp/index.js";
import { specs as tierSpecs } from "../../domains/tier/mcp/index.js";
import { specs as tokenSpecs } from "../../domains/token/mcp/index.js";
import registerFromSpec from "./registerFromSpec.js";

const allSpecs: readonly ToolSpec[] = [
  ...blockSpecs,
  ...standardSpecs,
  ...modifierSpecs,
  ...tokenSpecs,
  ...tierSpecs,
  ...configSpecs,
  ...ontologySpecs,
  ...graphSpecs,
  ...skillSpecs,
  ...diagnosticSpecs,
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
}
